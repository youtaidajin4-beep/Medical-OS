/** Soft cap for LLM transcript inputs (completion priority over full fidelity). */
export const LLM_TRANSCRIPT_MAX_CHARS = 32_000;

/**
 * Keep head + tail when text exceeds maxChars so long visits still finish.
 */
export function truncateForLlm(text: string, maxChars = LLM_TRANSCRIPT_MAX_CHARS): string {
  if (text.length <= maxChars) return text;
  const marker = '\n\n…(中略)…\n\n';
  const budget = maxChars - marker.length;
  const head = Math.floor(budget * 0.65);
  const tail = budget - head;
  return `${text.slice(0, head)}${marker}${text.slice(-tail)}`;
}
