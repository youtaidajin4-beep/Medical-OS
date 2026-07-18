import { PrismaService } from '../../database/prisma.service';

export type AiExecutionLogInput = {
  consultationId: string;
  step: string;
  provider: string;
  status: 'started' | 'completed' | 'failed';
  promptVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  errorMessage?: string;
};

export async function logAiExecution(prisma: PrismaService, input: AiExecutionLogInput) {
  await prisma.aIExecution.create({
    data: {
      consultationId: input.consultationId,
      step: input.step,
      provider: input.provider,
      status: input.status,
      promptVersion: input.promptVersion,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      durationMs: input.durationMs,
      errorMessage: input.errorMessage,
    },
  });
}
