# 1医院パイロット デプロイ手順

くしま内科向けクラウド公開（Vercel + Railway + Supabase）

## アーキテクチャ

```
ブラウザ → Vercel (Next.js) → Railway (NestJS) → Supabase (PostgreSQL)
                                              → OpenAI API
                                              → Railway Volume (音声)
```

先生が使う URL は本番 **`/home` のみ**（`/demo` 禁止）。

## 前提

- GitHub: https://github.com/youtaidajin4-beep/Medical-OS
- OpenAI API キー（課金済み）
- アカウント: Supabase / Railway / Vercel

課金（パイロット開始時）:
- OpenAI: **必須（従量）**
- Railway: **必須（少額〜）** + **Volume 必須**
- Vercel: Hobby 無料可
- Supabase: **無料のまま開始可**

---

## Step 1: Supabase（DB）

1. https://supabase.com でプロジェクト作成（Region: Tokyo 推奨）
2. **Settings → Database → Connection string → URI** をコピー
3. `[YOUR-PASSWORD]` を実際のパスワードに置換
4. 末尾に `?schema=public` がなければ追加（必要なら `sslmode=require`）

例:
```
postgresql://postgres.xxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?schema=public
```

---

## Step 2: Railway（API）

1. https://railway.app → New Project → Deploy from GitHub → `Medical-OS`
2. **Volume を追加**（必須）:
   - Mount path: `/data`
   - サービス環境変数: `STORAGE_PATH=/data/audio`
3. 環境変数を設定:

| 変数 | 値 |
|------|-----|
| `DATABASE_URL` | Supabase の接続文字列 |
| `JWT_SECRET` | 32文字以上のランダム文字列 |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Step 3 の Vercel URL（後で更新可） |
| `SINGLE_CLINIC_MODE` | `false` |
| `STT_PROVIDER` | `openai` |
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | 本番用キー |
| `OPENAI_WHISPER_MODEL` | `whisper-1` |
| `OPENAI_LLM_MODEL` | `gpt-4o-mini` |
| `OPENAI_CORRECTION_MODEL` | `gpt-4o` |
| `OPENAI_DOCUMENT_MODEL` | `gpt-4o` |
| `STORAGE_PROVIDER` | `local` |
| `STORAGE_PATH` | `/data/audio` |

4. Dockerfile ルートはリポジトリ直下（ffmpeg 同梱済み）
5. デプロイ完了後、公開 URL をメモ（例: `https://medical-os-production.up.railway.app`）
6. 確認:
   ```bash
   curl https://YOUR-RAILWAY-URL/api/v1/health/ai
   ```
   `apiKeyConfigured: true` / `ffmpegAvailable: true` であること。

`prisma migrate deploy` は Dockerfile 起動時に自動実行されます。

### 初回 seed（先生アカウント）

ローカルから本番 DB に seed（**固有の SEED_PASSWORD を必ず設定**）:

```bash
cd apps/backend
DATABASE_URL="postgresql://..." SEED_PASSWORD="your-unique-secure-password" pnpm db:seed
```

- ログイン: `doctor@demo.clinic` / 上記 `SEED_PASSWORD`
- 初回ログイン時は **パスワード変更画面** に誘導されます
- 本番で既存ユーザーのパスワードだけ更新する場合:

```bash
DATABASE_URL="postgresql://..." NEW_PASSWORD="your-unique-secure-password" pnpm set-password
```

**禁止**: `password123` 等の既知弱パスワード（API が拒否します）

---

## Step 3: Vercel（フロント）

1. https://vercel.com → Add New Project → Import `Medical-OS`
2. **Root Directory**: `apps/frontend`
3. 環境変数:

| 変数 | 値 |
|------|-----|
| `NEXT_PUBLIC_API_URL` | Railway の API URL |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |
| `NEXT_PUBLIC_SINGLE_CLINIC_MODE` | `false` |

4. Deploy

---

## Step 4: CORS 最終調整

Railway の `FRONTEND_URL` を Vercel の本番 URL に更新 → 再デプロイ

---

## Step 5: 通し確認（本番 URL）

1. Vercel URL → ログイン → **`/home`**（`/demo` は開かない）
2. 同意 → 録音30秒以上 → SOAP
3. チャット「紹介状を作って」→ 書類表示・印刷
4. 意図的に失敗させたあと **再試行** で復帰できること
5. `/api/v1/health/ai` で `apiKeyConfigured` / `ffmpegAvailable` 確認

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| Chrome「パスワードを変更してください」 | 漏洩DBに載っている弱いパスワード。`pnpm set-password` で固有パスワードに変更 |
| `apiKeyConfigured: false` | Railway の `OPENAI_API_KEY` を確認 |
| CORS エラー | `FRONTEND_URL` が Vercel URL と一致しているか |
| DB 接続失敗 | Supabase の `DATABASE_URL` と SSL 設定 |
| 録音後 STT 失敗 | Railway ログで ffmpeg / OpenAI / サイズ超過を確認 |
| デプロイ後に録音消失 | Volume 未設定。`STORAGE_PATH=/data/audio` と Volume マウントを確認 |
| 長録音で失敗 | 10分未満推奨。mp3圧縮でも Whisper 24MB 超は明示失敗 |
| AI 混雑 | 「もう一度処理する」。改善しなければ紙カルテ |

---

## セキュリティ

- `.env` は Git にコミットしない
- 本番 `JWT_SECRET` はローカルと別にする
- OpenAI キーは Railway のみに設定（Vercel には載せない）
- 本番は `SINGLE_CLINIC_MODE=false`（ログイン必須）
