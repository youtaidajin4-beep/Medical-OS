# 8/1 パイロット運用手順

くしま内科クリニック向け Medical OS 試験運用（2026年8月1日〜）

---

## 7/28 現地設定チェックリスト（30分）

### 事前準備（開発側）

- [ ] Vercel（フロント）・Railway（API）・Supabase（DB）が稼働
- [ ] 環境変数: `STT_PROVIDER=openai`, `LLM_PROVIDER=openai`, `OPENAI_API_KEY` 設定済み
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] 谷口先生アカウント作成・パスワード共有
- [ ] HTTPS でアクセス可能

### 当日（クリニック）

1. **ブラウザ設定**（5分）
   - Chrome 推奨
   - Medical OS をブックマーク
   - CLINICS と並べてウィンドウ分割（右下または横）

2. **ログイン確認**（2分）
   - アカウントでログイン
   - ダッシュボード表示確認

3. **マイク・録音テスト**（10分）
   - 匿名症例で1件通し
   - 患者同意チェック → 録音開始
   - 実音声 → 文字起こし → SOAP 生成まで確認

4. **コピー連携**（5分）
   - SOAP 確認 → 確認済み → コピー
   - CLINICS に貼り付け

5. **書類生成**（5分）
   - 「全書類を生成」→ 紹介状・処方等を確認
   - 印刷プレビューで1枚収まるか確認

6. **障害時**
   - 開発担当へ連絡
   - 前バージョンへロールバック手順を共有

---

## 8/1〜8/7 毎日の運用ループ

```
診療 → 確認・修正 → コピー → 書類生成 → フィードバック
         ↓
    翌日プロンプト/ルール改善
```

### 毎日の記録（KPI）

| 日付 | 利用診療数 | 平均修正フィールド数 | SOAP確認〜コピー時間(分) | 書類生成した診療数 | パイプライン失敗 | メモ |
|------|-----------|---------------------|-------------------------|-------------------|-----------------|------|
| 8/1  |           |                     |                         |                   |                 |      |
| 8/2  |           |                     |                         |                   |                 |      |
| 8/3  |           |                     |                         |                   |                 |      |
| 8/4  |           |                     |                         |                   |                 |      |
| 8/5  |           |                     |                         |                   |                 |      |
| 8/6  |           |                     |                         |                   |                 |      |
| 8/7  |           |                     |                         |                   |                 |      |

### KPIの意味

| KPI | 目標 |
|-----|------|
| 修正フィールド数 | 初日多め → 週末に減少 |
| SOAP確認〜コピー時間 | 短いほど良い（目標: 3分以内） |
| 書類生成利用率 | SOAPだけで終わらない（目標: 50%以上） |
| パイプライン失敗 | 0件に近づける |

### 毎日の改善作業（開発側）

1. 前日の `RevisionHistory`（編集履歴）を確認
2. プロンプト or 先生ルールを1点修正
3. Staging で確認 → Production デプロイ
4. フィードバックを `07_ROADMAP/02_decision_log.md` に記録

---

## クラウドデプロイ手順

### 1. Supabase（PostgreSQL）

```bash
# DATABASE_URL を Supabase から取得
# 例: postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
```

### 2. Railway（バックエンド）

1. GitHub リポジトリを接続
2. `railway.toml` を参照してビルド
3. 環境変数を設定:
   - `DATABASE_URL`
   - `JWT_SECRET`（本番用ランダム文字列）
   - `FRONTEND_URL`（Vercel URL）
   - `STT_PROVIDER=openai`
   - `LLM_PROVIDER=openai`
   - `OPENAI_API_KEY`
   - `NODE_ENV=production`

### 3. Vercel（フロントエンド）

1. `apps/frontend` をルートに設定（または monorepo 設定）
2. 環境変数:
   - `NEXT_PUBLIC_API_URL`（Railway API URL）
   - `NEXT_PUBLIC_DEMO_MODE=false`

### 4. 初回マイグレーション

Railway デプロイ時、Dockerfile の `prisma migrate deploy` が自動実行されます。
初回は `prisma migrate dev` で migration ファイルを作成してからデプロイしてください。

---

## セキュリティ注意

- 患者情報は OpenAI API に送信されます（8/1パイロットは先生の明示同意前提）
- 音声は SOAP 生成後に削除されます
- API キーは Git にコミットしない

---

## OpenAI 実録音 E2E チェックリスト

1. 環境変数を設定:
   - `STT_PROVIDER=openai`
   - `LLM_PROVIDER=openai`
   - `OPENAI_API_KEY=sk-...`
   - `NEXT_PUBLIC_DEMO_MODE=false`
2. `ffmpeg` をインストール: `brew install ffmpeg`
3. `pnpm db:push && pnpm db:seed && pnpm dev` で起動
4. `/api/v1/health/ai` が `status: ok` と `apiKeyConfigured: true` を返すこと
5. 匿名症例で30秒以上録音 → 処理完了 → SOAP を確認
6. 確認済み → 全書類生成 → 紹介状の文脈を確認
7. 編集 → 再生成時に修正が反映されること（few-shot）

---

## 関連

- [Decision Log](./02_decision_log.md)
- [Deployment Architecture](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)
- [Physician Copilot Rules](../06_CURSOR_RULES/17_physician_copilot_rules.md)
