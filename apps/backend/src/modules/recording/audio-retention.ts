/**
 * 音声をいつまで置いておくか。
 *
 * 方針そのものは `01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md` の
 * 「音声：処理 → 自動削除（設定可能）」。消すことは決まっているが、期間は設定できる前提。
 *
 * これまではパイプラインが成功した直後に消していた。そのため
 * 「処理は通ったが中身が使えない」ときに作り直す手段が無かった。
 * 2026-09-05、谷口先生の桑原さん・立川さんがまさにその状態で、
 * 「もう一度処理する」を押しても『再処理できる録音がありません』で弾かれた。
 *
 * 気づくのは診察の直後か、その日の終わりに見直したとき。そこで作り直せるよう、
 * 既定は24時間だけ残す。期間は AUDIO_RETENTION_MINUTES で変えられる。
 * 0 を指定すると従来どおり即時削除に戻る。
 */

/** 既定の保持時間（分）。当日中に気づいて作り直せる幅 */
export const DEFAULT_AUDIO_RETENTION_MINUTES = 24 * 60;

export function resolveRetentionMinutes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.AUDIO_RETENTION_MINUTES;
  if (raw === undefined || raw === '') return DEFAULT_AUDIO_RETENTION_MINUTES;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_AUDIO_RETENTION_MINUTES;
  return Math.floor(value);
}

/** 保持期間を過ぎた音声とみなす基準時刻。これより古いものは消す */
export function retentionCutoff(now: Date, retentionMinutes: number): Date {
  return new Date(now.getTime() - retentionMinutes * 60 * 1000);
}

/** 期間が0なら、これまでどおりパイプラインの直後に消す */
export function deletesImmediately(retentionMinutes: number): boolean {
  return retentionMinutes <= 0;
}
