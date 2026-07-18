# 1医院パイロット デプロイ手順

くしま内科向けクラウド公開（Vercel + Railway + Supabase）

## アーキテクチャ

```
ブラウザ → Vercel (Next.js) → Railway (NestJS) → Supabase (PostgreSQL)
                                              → OpenAI API
```

## 前提

- GitHub: https://github.com/youtaidajin4-beep/Medical-OS
- OpenAI API キー（課金済み）
- アカウント: Supabase / Railway / Vercel

---

## Step 1: Supabase（DB）

1. https://supabase.com でプロジェクト作成（Region: Tokyo 推奨）
2. **Settings → Database → Connection string → URI** をコピー
3. `[YOUR-PASSWORD]` を実際のパスワードに置換
4. 末尾に `?schema=public` がなければ追加

例:
```
postgresql://postgres.xxxx:password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?schema=public
```

---

## Step 2: Railway（API）

1. https://railway.app → New Project → Deploy from GitHub → `Medical-OS`
2. 環境変数を設定:

| 変数 | 値 |
|------|-----|
| `DATABASE_URL` | Supabase の接続文字列 |
| `JWT_SECRET` | 32文字以上のランダム文字列 |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Step 3 の Vercel URL（後で更新可） |
| `STT_PROVIDER` | `openai` |
| `LLM_PROVIDER` | `openai` |
| `OPENAI_API_KEY` | 本番用キー |
| `OPENAI_WHISPER_MODEL` | `whisper-1` |
| `OPENAI_LLM_MODEL` | `gpt-4o-mini` |
| `STORAGE_PROVIDER` | `local` |

3. デプロイ完了後、公開 URL をメモ（例: `https://medical-os-production.up.railway.app`）
4. 確認:
   ```bash
   curl https://YOUR-RAILWAY-URL/api/v1/health/ai
   ```

`prisma migrate deploy` は Dockerfile 起動時に自動実行されます。

### 初回 seed（先生アカウント）

ローカルから本番 DB に seed:

```bash
cd apps/backend
DATABASE_URL="postgresql://..." pnpm db:seed
```

ログイン: `doctor@demo.clinic` / `password123`（本番前にパスワード変更推奨）

---

## Step 3: Vercel（フロント）

1. https://vercel.com → Add New Project → Import `Medical-OS`
2. **Root Directory**: `apps/frontend`
3. 環境変数:

| 変数 | 値 |
|------|-----|
| `NEXT_PUBLIC_API_URL` | Railway の API URL |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

4. Deploy

---

## Step 4: CORS 最終調整

Railway の `FRONTEND_URL` を Vercel の本番 URL に更新 → 再デプロイ

---

## Step 5: 動作確認

1. Vercel URL を開く → 緑バナー「実AI接続中」
2. ログイン
3. 匿名症例で録音 → SOAP → 全書類生成

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `apiKeyConfigured: false` | Railway の `OPENAI_API_KEY` を確認 |
| CORS エラー | `FRONTEND_URL` が Vercel URL と一致しているか |
| DB 接続失敗 | Supabase の `DATABASE_URL` と SSL 設定 |
| 録音後 STT 失敗 | Railway ログで ffmpeg / OpenAI エラーを確認 |

---

## セキュリティ

- `.env` は Git にコミットしない
- 本番 `JWT_SECRET` はローカルと別にする
- OpenAI キーは Railway のみに設定（Vercel には載せない）
