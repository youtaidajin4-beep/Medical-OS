# クラウド本番デプロイ実行チェックリスト

実装・ドキュメント準備は完了。以下はアカウント操作で本番を通す手順。

## 前提（コード側済み）

- [x] mp3 圧縮・25MB ガード・録音時間 UI 警告
- [x] `POST /consultations/:id/reprocess` / `recording/reset` + ErrorPhase
- [x] OpenAI 429/5xx 最大3回リトライ + 日本語エラー
- [x] チャット書類失敗を reply / UI に明示
- [x] debug ingest 削除
- [x] `STORAGE_PATH` + Dockerfile Volume 前提
- [x] ランブック `/home`、現地チートシート、デプロイガイド更新

## 実行（要アカウント）

1. [ ] 変更をコミットして GitHub `main` へ push
2. [ ] Supabase 無料プロジェクト作成 → `DATABASE_URL`
3. [ ] Railway: GitHub 接続 → Dockerfile デプロイ → **Volume `/data`** → env（`.env.production.example` 参照）
4. [ ] seed: `SEED_PASSWORD` 固有値で `pnpm db:seed`
5. [ ] Vercel: Root `apps/frontend` → env（`NEXT_PUBLIC_*`）
6. [ ] Railway `FRONTEND_URL` = Vercel URL
7. [ ] `curl .../api/v1/health/ai` → `apiKeyConfigured` / `ffmpegAvailable`
8. [ ] 通し: ログイン → `/home` → 録音30秒 → SOAP → チャット書類 → 再試行
9. [ ] Railway: `OPENAI_WHISPER_MODEL=gpt-4o-transcribe-diarize` / `OPENAI_STT_FALLBACK_MODEL=whisper-1` → レビューで医師/患者が分かれること

詳細は [`06_deploy_guide.md`](./06_deploy_guide.md) / [`07_onsite_cheatsheet.md`](./07_onsite_cheatsheet.md)。

## この環境で未実行の理由

CLI（`gh` / `railway` / `vercel`）とクラウド認証情報がこの作業環境に無いため、実際のプロジェクト作成・デプロイ・通し検証はローカルからは完了できない。上記チェックを Day 2 で手作業実行する。
