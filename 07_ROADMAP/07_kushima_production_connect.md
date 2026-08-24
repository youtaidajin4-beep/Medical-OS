# くしま内科 — 本番接続（推奨範囲1）

NestJS + Prisma + JWT を維持したまま、**内科用 Supabase Pro プロジェクト**と **Railway Hobby** を接続する手順。

## 確定事項

| 項目 | 値 |
|------|-----|
| Supabase プロジェクト | `medical-os-kushima`（ref: `fyzlcteanzwypisvztku`） |
| 用途 | 内科 AI / Medical OS 専用（Bright Dental には触れない） |
| テナントキー | `clinics.code = kushima_internal` |
| クリニック名 | `くしま内科` |
| 固定 clinic UUID | `00000000-0000-0000-0000-000000000001` |
| 認証 | アプリ JWT（Supabase Auth / RLS は今回やらない） |
| 隔離 | `clinic_id` をアプリ層で強制 |

## 今回やること / やらないこと

**やる**
- 既存 Railway サービス（`medical-os-api`）の Hobby 再デプロイ
- `DATABASE_URL` → 上記内科 Supabase
- `clinic.code` マイグレーション + seed でくしま内科テナント確定
- 環境変数・Volume・health 確認

**やらない**
- Supabase Auth / RLS への移行
- テーブル全面再設計
- Bright Dental プロジェクトへの接続・変更
- Railway / Supabase の新規プロジェクト乱立（既存を使う）

---

## Step A: Supabase（確認のみ）

1. Org（Pro）内で **`medical-os-kushima`** を開く
2. Database → Connection string（URI / pooler）を確認
3. Railway の `DATABASE_URL` が **このプロジェクト**を指していること

誤接続防止: Bright Dental や別の dental プロジェクトの URL を入れない。

---

## Step B: Railway Hobby（既存サービスを再利用）

ダッシュボードで既存サービスを使う（新規複製しない）。

1. Workspace → `medical-os` → サービス `medical-os-api`
2. Hobby プランが有効なことを確認
3. **Volume** が `/data` にマウントされていること（`STORAGE_PATH=/data/audio`）
4. Variables を確認（`apps/backend/.env.production.example` 参照）:

| 変数 | 必須値 |
|------|--------|
| `DATABASE_URL` | 内科 Supabase の接続文字列 |
| `JWT_SECRET` | 本番専用（32文字以上） |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://medical-os-ruddy.vercel.app` |
| `SINGLE_CLINIC_MODE` | `false` |
| `OPENAI_*` | 本番キー + モデル設定 |
| `STORAGE_PROVIDER` | `local` |
| `STORAGE_PATH` | `/data/audio` |

5. **Redeploy**（GitHub `main` 最新）
6. 任意: サービス表示名を `kushima-internal-api` に変更可（URL はそのままで可）

確認:

```bash
curl https://medical-os-api-production.up.railway.app/api/v1/health/ai
```

期待: `apiKeyConfigured: true` / `ffmpegAvailable: true`

`prisma migrate deploy` はコンテナ起動時に走り、`clinics.code` が追加される。

---

## Step C: くしま内科テナント seed（必要時）

既存データを消さず、名前と `code` を整える:

```bash
cd apps/backend
DATABASE_URL="postgresql://..." SEED_PASSWORD="(既存と揃える or 更新方針に従う)" pnpm db:seed
```

結果:
- `code=kushima_internal` / `name=くしま内科`
- ログイン: `doctor@demo.clinic`

パスワードだけ更新する場合は `pnpm set-password`。

---

## Step D: Vercel（確認）

- `NEXT_PUBLIC_API_URL=https://medical-os-api-production.up.railway.app`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_SINGLE_CLINIC_MODE=false`

フロントに `service_role` / DB パスワードを置かない。

---

## 将来（今回の範囲外）

- Supabase Auth + RLS
- `profiles` / `clinic_memberships` 再設計
- 他医院テナント追加（`clinics` 行を増やし `clinic_id` で隔離）

---

## 関連

- [06_deploy_guide.md](./06_deploy_guide.md)
- [05_pilot_runbook.md](./05_pilot_runbook.md)
- `apps/backend/.env.production.example`
