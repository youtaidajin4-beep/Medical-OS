import { truncateForLlm, LLM_TRANSCRIPT_MAX_CHARS } from '../src/providers/ai/llm-text.util';
import {
  isPipelineStale,
  pipelineStepToUiIndex,
  PIPELINE_ABSOLUTE_MAX_MS,
  PIPELINE_STALE_NO_PROGRESS_MS,
} from '../src/modules/ai/pipeline-progress';
import { localizeOpenAiError } from '../src/providers/ai/openai-retry.util';

describe('truncateForLlm', () => {
  it('keeps short text unchanged', () => {
    expect(truncateForLlm('短い')).toBe('短い');
  });

  it('truncates long text with head and tail', () => {
    const text = 'あ'.repeat(LLM_TRANSCRIPT_MAX_CHARS + 5000);
    const out = truncateForLlm(text);
    expect(out.length).toBeLessThanOrEqual(LLM_TRANSCRIPT_MAX_CHARS);
    expect(out).toContain('…(中略)…');
    expect(out.startsWith('あ')).toBe(true);
    expect(out.endsWith('あ')).toBe(true);
  });
});

describe('pipeline progress', () => {
  it('maps steps to UI indices', () => {
    expect(pipelineStepToUiIndex('assemble_started')).toBe(0);
    expect(pipelineStepToUiIndex('stt_started')).toBe(1);
    expect(pipelineStepToUiIndex('extract_complete')).toBe(2);
    expect(pipelineStepToUiIndex('soap_started')).toBe(3);
    expect(pipelineStepToUiIndex('soap_progress')).toBe(3);
    expect(pipelineStepToUiIndex('soap_complete')).toBe(4);
    expect(pipelineStepToUiIndex('note_progress')).toBe(4);
    expect(pipelineStepToUiIndex('note_complete')).toBe(4);
  });

  it('detects absolute and no-progress stale', () => {
    const now = Date.now();
    expect(
      isPipelineStale({
        nowMs: now,
        pipelineStartedAt: new Date(now - PIPELINE_ABSOLUTE_MAX_MS - 1000),
        pipelineUpdatedAt: new Date(now - 1000),
      }),
    ).toBe(true);
    expect(
      isPipelineStale({
        nowMs: now,
        pipelineStartedAt: new Date(now - 60_000),
        pipelineUpdatedAt: new Date(now - PIPELINE_STALE_NO_PROGRESS_MS - 1000),
      }),
    ).toBe(true);
    expect(
      isPipelineStale({
        nowMs: now,
        pipelineStartedAt: new Date(now - 60_000),
        pipelineUpdatedAt: new Date(now - 60_000),
      }),
    ).toBe(false);
  });

  it('uses a 40-minute absolute ceiling for long visits', () => {
    expect(PIPELINE_ABSOLUTE_MAX_MS).toBe(40 * 60 * 1000);
    const now = Date.now();
    expect(
      isPipelineStale({
        nowMs: now,
        pipelineStartedAt: new Date(now - 30 * 60 * 1000),
        pipelineUpdatedAt: new Date(now - 60_000),
      }),
    ).toBe(false);
  });
});

describe('localizeOpenAiError timeout', () => {
  it('localizes timeout messages', () => {
    expect(localizeOpenAiError('OpenAI LLM timed out')).toContain('タイムアウト');
    expect(localizeOpenAiError('OpenAI STT timed out')).toContain('もう一度処理');
  });
});
