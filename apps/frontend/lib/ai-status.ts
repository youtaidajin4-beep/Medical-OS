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
  if (message.includes('長すぎ') || message.includes('25MB') || message.includes('24MB')) {
    return '録音が長すぎます。分割するか短く録り直してください。';
  }
  if (message.includes('APIキー') || message.includes('OPENAI_API_KEY') || message.includes('401')) {
    return 'OpenAI APIキーが無効です。設定画面またはサーバー環境変数を確認してください。紙カルテで継続してください。';
  }
  if (
    message.includes('429') ||
    message.includes('レート制限') ||
    message.includes('混み合っています')
  ) {
    return '混み合っています。しばらく待ってから再試行してください。';
  }
  if (message.includes('ffmpeg') || message.includes('音声の結合')) {
    return '音声の結合に失敗しました。サーバーに ffmpeg が必要です。紙カルテで継続してください。';
  }
  if (message.includes('録音データ') || message.includes('短すぎ') || message.includes('マイク')) {
    return '録音データが不足しています。マイクの権限を確認し、30秒以上話してから診療を終了してください。';
  }
  if (message.includes('文字起こし結果が空')) {
    return '文字起こしできませんでした。マイク入力または録音環境を確認してください。';
  }
  if (message.includes('OpenAI') || message.includes('AI処理')) {
    return 'AI処理に失敗しました。再試行してください。改善しない場合は紙カルテで継続してください。';
  }
  return message;
}

export function isOpenAiMode(health: AiHealthStatus | null): boolean {
  if (!health?.apiKeyConfigured) return false;
  return health.sttProvider === 'openai' || health.llmProvider === 'openai';
}
