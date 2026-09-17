import { GeneratedDocumentType } from '@prisma/client';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { PrismaService } from '../src/database/prisma.service';
import { ConsultationAccessService } from '../src/common/services/consultation-access.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';
import { LlmProvider } from '../src/providers/ai/llm.provider';

/**
 * 書類の一括生成は「全か無か」にしない。
 *
 * 以前は Promise.all で6種類を回していたため、OpenAI が1本だけ 429 を返したり
 * JSON を崩したりすると、**出来ていた5枚も一緒に捨てられていた**。
 * 診療の合間に押すボタンなので、ここで全部失うのが実運用で一番痛い。
 */
describe('書類の一括生成：1枚こけても残りは残る', () => {
  const 作られた書類: Array<{ type: GeneratedDocumentType }> = [];

  function makePrisma() {
    作られた書類.length = 0;
    return {
      aIExecution: { create: jest.fn() },
      clinicalEntity: { findMany: jest.fn().mockResolvedValue([]) },
      transcriptCorrection: { findMany: jest.fn().mockResolvedValue([]) },
      revisionHistory: { findMany: jest.fn().mockResolvedValue([]) },
      consultationChatMessage: { findMany: jest.fn().mockResolvedValue([]) },
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: { data: { type: GeneratedDocumentType } }) => {
          作られた書類.push({ type: data.type });
          return Promise.resolve({
            id: `doc-${data.type}`,
            type: data.type,
            content: {},
            version: 1,
            isAiGenerated: true,
            approved: false,
            updatedAt: new Date(),
          });
        }),
      },
      consultation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          physicianId: 'dr1',
          patient: { patientCode: 'P-001', name: '患者', dateOfBirth: null },
          anonymousCase: null,
          structuredData: { data: {} },
          soapDocuments: [
            { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' },
          ],
          transcriptSegments: [],
          attachments: [],
        }),
      },
    } as unknown as PrismaService;
  }

  const access = {
    assertPhysicianOwns: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConsultationAccessService;

  const settings = {
    getPhysicianRules: jest.fn().mockResolvedValue(DEFAULT_PHYSICIAN_RULES),
  } as unknown as SettingsService;

  /** 診療情報提供書のときだけ失敗する LLM */
  function makeLlm(壊す: GeneratedDocumentType | null): LlmProvider {
    return {
      name: 'mock',
      generateDocument: jest
        .fn()
        .mockImplementation((type: GeneratedDocumentType) => {
          if (type === 壊す) {
            return Promise.reject(new Error('OpenAI LLM failed (429): rate limited'));
          }
          return Promise.resolve({ ok: true });
        }),
    } as unknown as LlmProvider;
  }

  it('1種類が429で落ちても、残り5種類は作られて返る', async () => {
    const prisma = makePrisma();
    const service = new DocumentsService(
      prisma,
      access,
      settings,
      makeLlm(GeneratedDocumentType.REFERRAL),
    );

    const { documents, failed } = await service.generateAll('c1', 'dr1');

    expect(documents).toHaveLength(5);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.type).toBe('referral');
    // 医師の画面には書類名で出す（チャットの返信はフロントの対応表を通らない）
    expect(failed[0]!.label).toBe('診療情報提供書');
    expect(failed[0]!.reason).toContain('429');
    // 落ちた1種類は保存されていない
    expect(作られた書類.map((d) => d.type)).not.toContain(
      GeneratedDocumentType.REFERRAL,
    );
  });

  it('失敗したことは実行ログに残る（あとで「なぜ出なかったか」を辿れる）', async () => {
    const prisma = makePrisma();
    const service = new DocumentsService(
      prisma,
      access,
      settings,
      makeLlm(GeneratedDocumentType.REFERRAL),
    );

    await service.generateAll('c1', 'dr1');

    const create = (prisma as unknown as {
      aIExecution: { create: jest.Mock };
    }).aIExecution.create;
    expect(create).toHaveBeenCalled();
    const 記録 = create.mock.calls[0][0].data;
    expect(記録.status).toBe('failed');
    expect(記録.errorMessage).toContain('診療情報提供書');
  });

  it('全部そろえば、従来どおり6種類ぶん返って成功として記録される', async () => {
    const prisma = makePrisma();
    const service = new DocumentsService(prisma, access, settings, makeLlm(null));

    const { documents, failed } = await service.generateAll('c1', 'dr1');

    expect(documents).toHaveLength(6);
    expect(failed).toHaveLength(0);
    const create = (prisma as unknown as {
      aIExecution: { create: jest.Mock };
    }).aIExecution.create;
    expect(create.mock.calls[0][0].data.status).toBe('completed');
  });

  it('1枚も出なかったときだけ、例外にして画面へ赤く出す', async () => {
    const prisma = makePrisma();
    const 全部壊れる = {
      name: 'mock',
      generateDocument: jest
        .fn()
        .mockRejectedValue(new Error('OpenAI LLM timed out')),
    } as unknown as LlmProvider;
    const service = new DocumentsService(prisma, access, settings, 全部壊れる);

    await expect(service.generateAll('c1', 'dr1')).rejects.toThrow(
      /書類を作成できませんでした/,
    );
  });
});
