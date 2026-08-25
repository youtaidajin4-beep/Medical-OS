export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof Error &&
        error.message.includes('retryable') &&
        attempt < maxAttempts - 1;
      if (!retryable) throw error;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: string }).name) : '';
  return name === 'AbortError' || name === 'TimeoutError';
}

/** ユーザー向けに統一した日本語メッセージへ変換する。自動mock切替はしない。 */
export function localizeOpenAiError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    message.includes('タイムアウト')
  ) {
    return '処理がタイムアウトしました。もう一度処理するか、録り直してください。録音が長い場合は数分かかることがあります。';
  }
  if (
    message.includes('長すぎ') ||
    lower.includes('25mb') ||
    lower.includes('file too large') ||
    message.includes('WHISPER_MAX')
  ) {
    return '録音が長すぎます。分割するか短く録り直してください。';
  }
  if (message.includes('401') || lower.includes('invalid_api_key') || message.includes('APIキー')) {
    return 'OpenAI APIキーが無効です。OPENAI_API_KEY を確認してください。紙カルテで継続してください。';
  }
  if (message.includes('429') || lower.includes('rate_limit') || message.includes('レート制限')) {
    return '混み合っています。しばらく待ってから再試行してください。';
  }
  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    lower.includes('server_error')
  ) {
    return '混み合っています。再試行してください。改善しない場合は紙カルテで継続してください。';
  }
  if (message.includes('too short') || message.includes('音声データ') || message.includes('短すぎ')) {
    return '録音データが短すぎます。マイク入力を確認して再度録音してください。';
  }
  if (message.includes('ffmpeg') || message.includes('音声の結合')) {
    return '音声の結合に失敗しました。サーバーに ffmpeg が必要です。紙カルテで継続してください。';
  }
  if (message.includes('OpenAI') || lower.includes('openai')) {
    return 'AI処理に失敗しました。再試行してください。改善しない場合は紙カルテで継続してください。';
  }
  return message;
}
