/** Maps AIExecution.step → processing UI index (0..3). */
export function pipelineStepToUiIndex(step: string | null | undefined): number {
  if (!step) return 0;
  switch (step) {
    case 'pipeline_start':
    case 'assemble_started':
      return 0;
    case 'stt_started':
    case 'stt_complete':
      return 1;
    case 'dict_correction_complete':
    case 'medical_knowledge_complete':
    case 'llm_correction_started':
    case 'llm_correction_complete':
    case 'extract_started':
    case 'extract_complete':
      return 2;
    case 'soap_started':
    case 'soap_complete':
    case 'note_complete':
    case 'pipeline_complete':
      return 3;
    default:
      return 0;
  }
}

export const PIPELINE_STALE_NO_PROGRESS_MS = 15 * 60 * 1000;
export const PIPELINE_ABSOLUTE_MAX_MS = 25 * 60 * 1000;

export const PIPELINE_STALE_MESSAGE =
  '処理がタイムアウトしました。もう一度処理するか、録り直してください。録音が長い場合は数分かかることがあります。';

export function isPipelineStale(input: {
  nowMs: number;
  pipelineStartedAt: Date | null;
  pipelineUpdatedAt: Date | null;
}): boolean {
  const { nowMs, pipelineStartedAt, pipelineUpdatedAt } = input;
  if (pipelineStartedAt && nowMs - pipelineStartedAt.getTime() > PIPELINE_ABSOLUTE_MAX_MS) {
    return true;
  }
  if (pipelineUpdatedAt && nowMs - pipelineUpdatedAt.getTime() > PIPELINE_STALE_NO_PROGRESS_MS) {
    return true;
  }
  return false;
}
