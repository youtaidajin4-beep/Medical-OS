import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConsultationAccessService } from '../../common/services/consultation-access.service';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { LlmProvider } from '../../providers/ai/llm.provider';

const CONSULT_SYSTEM = `あなたは日本の内科クリニック向けの診療相談アシスタントです。
医師の思考を補助しますが、診断・処方・検査の最終決定はしません。
鑑別の候補や見逃し疾患のチェックリストは「可能性の列挙」として提示し、断定しないでください。
回答は簡潔に、臨床で使える日本語で書いてください。
不明な点は「要確認」と明記してください。`;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consultationAccess: ConsultationAccessService,
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
    if (!trimmed) throw new BadRequestException('質問を入力してください');

    await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'user', content: trimmed },
    });

    const history = await this.prisma.consultationChatMessage.findMany({
      where: { consultationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const messages = history.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));

    let reply: string;
    if (this.llmProvider.consultChat) {
      reply = await this.llmProvider.consultChat(CONSULT_SYSTEM, messages);
    } else {
      reply =
        '（モック）診断は確定しません。鑑別候補として症状に関連する疾患を臨床的に確認してください。必要なら紹介状の依頼事項に「精査希望」と記載してください。';
    }

    const assistant = await this.prisma.consultationChatMessage.create({
      data: { consultationId, role: 'assistant', content: reply },
    });

    return assistant;
  }
}
