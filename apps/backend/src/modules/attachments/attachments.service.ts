import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { STORAGE_PROVIDER, StorageProvider } from '../../providers/storage/storage.provider';

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async list(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    return this.prisma.consultationAttachment.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        ocrText: true,
        documentKind: true,
        createdAt: true,
      },
    });
  }

  async upload(
    consultationId: string,
    physicianId: string,
    file: { originalname: string; mimetype: string; buffer: Buffer },
    documentKind = 'other',
  ) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    if (!file?.buffer?.length) {
      throw new BadRequestException('画像ファイルが必要です');
    }

    const key = `attachments/${consultationId}/${randomUUID()}-${file.originalname}`;
    await this.storage.put(key, file.buffer);

    const ocrText = await this.runOcr(file.buffer, file.mimetype);

    return this.prisma.consultationAttachment.create({
      data: {
        consultationId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey: key,
        ocrText,
        documentKind,
      },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        ocrText: true,
        documentKind: true,
        createdAt: true,
      },
    });
  }

  async timeline(consultationId: string, physicianId: string) {
    await this.consultationAccess.assertPhysicianOwns(consultationId, physicianId);
    const consultation = await this.prisma.consultation.findUniqueOrThrow({
      where: { id: consultationId },
      include: {
        patient: true,
        anonymousCase: true,
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        generatedDocuments: { orderBy: { updatedAt: 'desc' }, take: 10 },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    const related = await this.prisma.consultation.findMany({
      where: {
        physicianId,
        OR: [
          consultation.patientId ? { patientId: consultation.patientId } : undefined,
          consultation.anonymousCaseId
            ? { anonymousCaseId: consultation.anonymousCaseId }
            : undefined,
        ].filter(Boolean) as Array<{ patientId?: string; anonymousCaseId?: string }>,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        soapDocuments: { orderBy: { version: 'desc' }, take: 1 },
        generatedDocuments: { orderBy: { updatedAt: 'desc' }, take: 3 },
        attachments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });

    return {
      current: {
        id: consultation.id,
        label: consultation.patient?.name ?? consultation.anonymousCase?.displayName,
        soap: consultation.soapDocuments[0] ?? null,
        documents: consultation.generatedDocuments,
        attachments: consultation.attachments,
      },
      history: related.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        status: c.status,
        assessment: c.soapDocuments[0]?.assessment ?? null,
        documentCount: c.generatedDocuments.length,
        attachmentCount: c.attachments.length,
      })),
    };
  }

  private async runOcr(buffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    const provider = this.config.get<string>('LLM_PROVIDER', 'mock');
    if (provider !== 'openai' || !apiKey) {
      return '（OCRモック）紙資料を読み取りました。内容を確認し、必要なら SOAP / 紹介状に反映してください。';
    }

    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.get('OPENAI_CORRECTION_MODEL', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content:
              'あなたは医療書類のOCRアシスタントです。画像から読み取れる日本語テキストを抽出してください。診断の断定はしないでください。読めない部分は「要確認」としてください。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'この医療書類・紙資料の内容をテキスト化してください。' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`OCR failed: ${err.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() || '（読み取り結果なし）';
  }
}
