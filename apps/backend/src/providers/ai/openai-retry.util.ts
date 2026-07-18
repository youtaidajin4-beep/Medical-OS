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
  const maxAttempts = options?.maxAttempts ?? 2;
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

export function localizeOpenAiError(message: string): string {
  if (message.includes('401') || message.includes('invalid_api_key')) {
    return 'OpenAI APIキーが無効です。OPENAI_API_KEY を確認してください。';
  }
  if (message.includes('429')) {
    return 'OpenAI APIのレート制限に達しました。しばらく待ってから再試行してください。';
  }
  if (message.includes('too short') || message.includes('音声データ')) {
    return '録音データが短すぎます。マイク入力を確認して再度録音してください。';
  }
  if (message.includes('ffmpeg')) {
    return '音声の結合に失敗しました。ffmpeg をインストールしてください（brew install ffmpeg）。';
  }
  return message;
}
