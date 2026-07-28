import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DocumentType, ConsultationStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider } from '../../providers/ai/llm.provider';
import { DocumentsService } from '../documents/documents.service';
import { FRONTEND_DOC_TYPE_MAP, BACKEND_DOC_TYPE_MAP } from '../documents/document-types';

const SUBKARTE_SYSTEM = `あなたは日本の内科クリニック向け「サブカルテ」アシスタントです。
医師の自由記述（疑い・方針・処方意図）を記録し、指示があれば SOAP や書類をその場で修正します。

ルール:
- 医師の記載を最優先する（SOAP よりサブカルテの意図を尊重）
- 診断の創作はしない。医師が書いた疑い・処方意図はそのまま扱う
- 単なるメモ記録のときは soapPatch / notePatch / documentPatches を付けない
- 修正指示（追記・変更・宛先変更・処方追加など）のときだけパッチを返す
- soapPatch の各フィールドは「置換後の全文」（追記なら既存文＋追記）
- documentPatches の content は当該書類の完全な JSON（部分ではなく全体）
- 書類 type は: referral | prescription | certificate | care-opinion-1 | care-opinion-2 | info-combined
- 必ず有効な JSON のみを返す（説明文禁止）

出力スキーマ:
{
  "reply": "医師への短い返答",
  "soapPatch": { "subjective"?, "objective"?, "assessment"?, "plan"? },
  "notePatch": "通常診療記録の全文（任意）",
  "documentPatches": [{ "type": "referral", "content": { ... } }]
}`;

const SubkarteLlmSchema = z.object({
  reply: z.string(),
  soapPatch: z
    .object({
      subjective: z.string().optional(),
      objective: z.string().optional(),
      assessment: z.string().optional(),
      plan: z.string().optional(),
    })
    .optional(),
  notePatch: z.string().optional(),
  documentPatches: z
    .array(
      z.object({
        type: z.string(),
        content: z.record(z.unknown()),
      }),
    )
    .optional(),
});

export type SubkarteLlmResult = z.infer<typeof SubkarteLlmSchema>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly documentsService: DocumentsService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
  ) {}

  async list(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    return this.prisma.consultationChatMessage.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async ask(consultationId: string, physicianId: string, content: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const trimmed = content.trim();
    if (!trimmed) throw new BadRequestException('内容を入力してください');

    await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'user', content: trimmed },
    });

    const history = await this.prisma.consultationChatMessage.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
      take: 40,
    });

    const context = await this.buildEditContext(consultationId);
    const messages = history.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    let parsed: SubkarteLlmResult;
    if (this.llmProvider.subkarteChat) {
      parsed = await this.llmProvider.subkarteChat(SUBKARTE_SYSTEM, messages, context);
    } else if (this.llmProvider.consultChat) {
      const reply = await this.llmProvider.consultChat(SUBKARTE_SYSTEM, messages);
      parsed = { reply };
    } else {
      parsed = this.mockSubkarte(trimmed, context);
    }

    const validated = SubkarteLlmSchema.safeParse(parsed);
    const result = validated.success ? validated.data : { reply: parsed.reply || '記録しました。' };

    const applied = await this.applyPatches(consultationId, physicianId, result, context);

    const assistant = await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'assistant', content: result.reply },
    });

    return {
      message: assistant,
      soap: applied.soap,
      note: applied.note,
      documents: applied.documents,
    };
  }

  private async buildEditContext(consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        clinicalNotes: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    const soap = consultation?.soapDocuments[0]
      ? {
          subjective: consultation.soapDocuments[0].subjective,
          objective: consultation.soapDocuments[0].objective,
          assessment: consultation.soapDocuments[0].assessment,
          plan: consultation.soapDocuments[0].plan,
        }
      : { subjective: '', objective: '', assessment: '', plan: '' };

    const note = consultation?.clinicalNotes[0]?.content ?? '';

    const docs = await this.prisma.generatedDocument.findMany({
      where: { consultationId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
    const latestByType = new Map<string, Record<string, unknown>>();
    for (const doc of docs) {
      const front = FRONTEND_DOC_TYPE_MAP[doc.type];
      if (front && !latestByType.has(front)) {
        latestByType.set(front, doc.content as Record<string, unknown>);
      }
    }

    return {
      soap,
      note,
      documents: Object.fromEntries(latestByType),
    };
  }

  private mockSubkarte(
    content: string,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
      documents: Record<string, Record<string, unknown>>;
    },
  ): SubkarteLlmResult {
    const editLike = /修正|変更|追記|直して|にして|Assessment|assessment|Plan|plan|紹介状|宛先|処方/.test(
      content,
    );
    if (!editLike) {
      return {
        reply: 'サブカルテに記録しました。書類を作るときに SOAP と合わせて反映します。',
      };
    }

    if (/Assessment|assessment|評価/.test(content)) {
      const addition = content.replace(/^.*?[：:]\s*/, '').trim() || content;
      return {
        reply: 'Assessment を更新しました。',
        soapPatch: {
          assessment: `${context.soap.assessment}\n${addition}`.trim(),
        },
      };
    }

    if (/Plan|plan|計画|方針/.test(content)) {
      return {
        reply: 'Plan を更新しました。',
        soapPatch: {
          plan: `${context.soap.plan}\n${content}`.trim(),
        },
      };
    }

    if (/紹介状|宛先/.test(content)) {
      const matches = [...content.matchAll(/([^\s「」をにへ]+(?:病院|クリニック|医院))/g)];
      const recipientHospital = matches.at(-1)?.[1] ?? '要確認（紹介先）';
      const existing = (context.documents.referral ?? {}) as Record<string, unknown>;
      return {
        reply: `紹介状の宛先を「${recipientHospital}」に更新しました。`,
        documentPatches: [
          {
            type: 'referral',
            content: { ...existing, recipientHospital },
          },
        ],
      };
    }

    if (/処方/.test(content)) {
      const existing = (context.documents.prescription ?? { items: [] }) as {
        items?: Array<Record<string, unknown>>;
      };
      const items = [...(existing.items ?? [])];
      items.push({
        index: items.length + 1,
        name: content.slice(0, 40),
        dosePerTake: '',
        dailyDose: '',
        days: '',
        frequency: '',
        note: 'サブカルテより',
        prescribedDate: '',
      });
      return {
        reply: '処方一覧に追記しました。',
        documentPatches: [{ type: 'prescription', content: { items } }],
        soapPatch: {
          plan: `${context.soap.plan}\n${content}`.trim(),
        },
      };
    }

    return {
      reply: 'サブカルテに記録し、Plan に反映しました。',
      soapPatch: {
        plan: `${context.soap.plan}\n${content}`.trim(),
      },
    };
  }

  private async applyPatches(
    consultationId: string,
    physicianId: string,
    result: SubkarteLlmResult,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
    },
  ) {
    let soap = context.soap;
    let note: string | undefined;
    const documents: Array<{
      id: string;
      type: string;
      content: unknown;
      version: number;
      isAiGenerated: boolean;
      approved: boolean;
      updatedAt: Date;
    }> = [];

    if (result.soapPatch) {
      const next = {
        subjective: result.soapPatch.subjective ?? context.soap.subjective,
        objective: result.soapPatch.objective ?? context.soap.objective,
        assessment: result.soapPatch.assessment ?? context.soap.assessment,
        plan: result.soapPatch.plan ?? context.soap.plan,
      };
      const latest = await this.prisma.soapDocument.findFirst({
        where: { consultationId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      const created = await this.prisma.soapDocument.create({
        data: {
          consultationId,
          ...next,
          version,
          isAiGenerated: false,
          approved: latest?.approved ?? false,
        },
      });
      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.REVIEW },
      });
      if (latest) {
        for (const field of ['subjective', 'objective', 'assessment', 'plan'] as const) {
          if (latest[field] !== next[field]) {
            await this.prisma.revisionHistory.create({
              data: {
                consultationId,
                documentType: DocumentType.SOAP,
                fieldName: field,
                beforeValue: latest[field],
                afterValue: next[field],
                changedById: physicianId,
              },
            });
          }
        }
      }
      soap = {
        subjective: created.subjective,
        objective: created.objective,
        assessment: created.assessment,
        plan: created.plan,
      };
    }

    if (result.notePatch != null) {
      const latest = await this.prisma.clinicalNote.findFirst({
        where: { consultationId },
        orderBy: { version: 'desc' },
      });
      const version = (latest?.version ?? 0) + 1;
      await this.prisma.clinicalNote.create({
        data: {
          consultationId,
          content: result.notePatch,
          version,
          isAiGenerated: false,
          approved: latest?.approved ?? false,
        },
      });
      note = result.notePatch;
    }

    if (result.documentPatches?.length) {
      for (const patch of result.documentPatches) {
        if (!BACKEND_DOC_TYPE_MAP[patch.type]) continue;
        try {
          const updated = await this.documentsService.updateDocument(
            consultationId,
            physicianId,
            patch.type,
            patch.content as Record<string, unknown>,
          );
          documents.push(updated);
        } catch {
          // 書類未生成時はスキップ（メモのみ有効）
          const type = BACKEND_DOC_TYPE_MAP[patch.type];
          if (!type) continue;
          const doc = await this.prisma.generatedDocument.create({
            data: {
              consultationId,
              type,
              content: patch.content as Prisma.InputJsonValue,
              version: 1,
              isAiGenerated: false,
            },
          });
          documents.push({
            id: doc.id,
            type: FRONTEND_DOC_TYPE_MAP[doc.type],
            content: doc.content,
            version: doc.version,
            isAiGenerated: doc.isAiGenerated,
            approved: doc.approved,
            updatedAt: doc.updatedAt,
          });
        }
      }
    }

    return {
      soap: result.soapPatch ? soap : undefined,
      note,
      documents: documents.length ? documents : undefined,
    };
  }
}
