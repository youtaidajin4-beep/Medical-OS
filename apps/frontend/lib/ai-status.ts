export type AiHealthStatus = {
  status: string;
  sttProvider: string;
  llmProvider: string;
  apiKeyConfigured: boolean;
  ffmpegAvailable: boolean;
  whisperModel?: string;
  llmModel?: string;
  warning?: string;
};

export function formatPipelineError(message: string): string {
  if (message.includes('APIキー') || message.includes('OPENAI_API_KEY') || message.includes('401')) {
    return 'OpenAI APIキーが無効です。設定画面またはサーバー環境変数を確認してください。';
  }
  if (message.includes('429') || message.includes('レート制限')) {
    return 'OpenAI APIの利用制限に達しました。しばらく待ってから再試行してください。';
  }
  if (message.includes('ffmpeg') || message.includes('音声の結合')) {
    return '音声の結合に失敗しました。サーバーに ffmpeg が必要です（brew install ffmpeg）。';
  }
  if (message.includes('録音データ') || message.includes('短すぎ') || message.includes('マイク')) {
    return '録音データが不足しています。マイクの権限を確認し、30秒以上話してから診療を終了してください。';
  }
  if (message.includes('文字起こし結果が空')) {
    return '文字起こしできませんでした。マイク入力または録音環境を確認してください。';
  }
  return message;
}

export function isOpenAiMode(health: AiHealthStatus | null): boolean {
  if (!health?.apiKeyConfigured) return false;
  return health.sttProvider === 'openai' || health.llmProvider === 'openai';
}
