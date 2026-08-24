# 8/1 パイロット運用手順

くしま内科クリニック向け Medical OS 試験運用（2026年8月1日〜）

---

## 7/28 現地設定チェックリスト（30分）

### 事前準備（開発側）

- [ ] Vercel（フロント）・Railway（API）・Supabase（DB）が稼働
- [ ] 環境変数: `STT_PROVIDER=openai`, `LLM_PROVIDER=openai`, `OPENAI_API_KEY` 設定済み
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] 谷口先生アカウント作成・**固有パスワード設定済み**（`password123` 禁止）
- [ ] 初回パスワード変更済み、または `mustChangePassword` フロー確認済み
- [ ] HTTPS でアクセス可能

### 当日（クリニック）

1. **ブラウザ配置**（5分）
   - Chrome 推奨
   - CLINICS を全画面で開く
   - Medical OS を別ウィンドウで開き、幅約 **420×高さ約800** にして右下に配置（ブックマーク推奨）
   - ログイン後は **診療ホーム**（`/home`）のみを使う（**`/demo` は禁止**）

2. **ログイン確認**（2分）
   - アカウントでログイン（クラウドは JWT 必須。`SINGLE_CLINIC_MODE=false`）
   - 「診療を開始」が表示されること

3. **マイク・録音テスト**（10分）
   - 表示名は任意（空欄可）で「診療を開始」
   - 患者同意チェック → 録音開始（目安 **10分未満**。8分で注意、12分で強い警告）
   - 実音声 → 文字起こし → SOAP 生成まで確認

4. **コピー連携**（5分）
   - SOAP 確認 → 確認済み → コピー
   - CLINICS に貼り付け

5. **書類生成**（5分）
   - 「書類を全部作る」またはチャットで「紹介状を作って」
   - 印刷プレビューで1枚収まるか確認

6. **障害時**
   - エラー画面で **「もう一度処理する」** → だめなら **「録り直す」**
   - それでもだめなら **紙カルテ**へ切替（自動 mock SOAP は使わない）
   - 開発担当へ連絡。必要なら Mac ローカルバックアップ起動（`07_onsite_cheatsheet.md`）

> **補足**: 患者マスタは CLINICS 側です。履歴・語彙設定はパネル右上の拡大からフル画面で開きます。

---

## Phase 1 通し検証チェックリスト（合格条件）

開発側・先生側で **2回連続成功** したら Phase 2 完了扱い。

| # | 項目 | 結果 |
|---|------|------|
| 1 | CLINICS 全画面 + Medical OS 右下（約420×800）で `/home` 表示 | |
| 2 | 表示名任意で診療開始 → 同意 → 録音30秒以上（10分未満推奨）→ 停止 | |
| 3 | SOAP 生成 → 確認済み → コピー → CLINICS 貼付が **3分以内** | |
| 4 | Case 1 誤認識4語（聴診では / 気管支炎 / ムコダイン / 再診）合格 | |
| 5 | パイプライン失敗時に **再試行 / 録り直し** で復帰（症例選択へ飛ばない） | |
| 6 | 本番: 固有パスワード・実OpenAI・`/health/ai` で ffmpegAvailable・`SINGLE_CLINIC_MODE=false` | |

### Compact 主アクション（迷わない導線）

1. 未確認: 下部 sticky **「確認済みにする」** のみ
2. 確認後: **「SOAP をコピー → CLINICS」** + **「書類を全部作る」**
3. パネル内タブ: **SOAP / 書類 / 紙資料**（画面遷移なし）＋下部 **サブカルテ** 常設
4. 書類は SOAP＋サブカルテで生成。修正もサブカルテ指示で即反映

### 谷口優先 Phase 対応状況（実装）

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | 音声→SOAP→コピー | 検証チェックリストで確認 |
| 2 | 書類ワンボタン・健診結果表・意見書セット印刷 | 実装済み |
| 3 | 簡単/複雑紹介・SOAP文体学習 | 実装済み |
| 4 | サブカルテチャット（書類入力＋即時修正） | 実装済み |
| 5 | 紙撮影OCR・関連診療タイムライン | 実装済み（下書き） |

---

## Case 1（気管支炎）音声認識 再検証チェックリスト

Patient P-001 または同等の咳・息苦しさケースで、録音後に以下を確認する。

| 項目 | 修正前（不合格） | 修正後（合格） |
|------|------------------|----------------|
| 聴診 | 調子んでは | 聴診では |
| 診断 | 期間支援 | 気管支炎 |
| 薬剤 | 無効団員 | ムコダイン |
| 再診 | 最新 | 再診 |

### 手順

1. 症例 P-001 を選択し、Case 1 台本どおりに会話して録音（30秒以上）
2. 処理完了後、レビュー画面の「文字起こし（最終版）」を確認
3. 上表4項目が合格なら OK。不合格語があれば設定画面の「誤認識→正しい表記」に追加
4. `AIExecution` の `dict_correction_complete` ログで自動置換履歴を確認（開発担当）

### 環境変数（話者分離 STT）

- `OPENAI_WHISPER_MODEL=gpt-4o-transcribe-diarize`（医師/患者の自動話者分け）
- `OPENAI_STT_FALLBACK_MODEL=whisper-1`（diarize 障害時）
- `OPENAI_CORRECTION_MODEL=gpt-4o`（校正のみ。抽出・SOAP は mini のまま）
- Railway で ffmpeg 有効（`/api/v1/health/ai` の `ffmpegAvailable: true`）

#### Railway 更新手順（話者分け有効化）

1. Railway → API サービス → Variables
2. `OPENAI_WHISPER_MODEL` を `gpt-4o-transcribe-diarize` に設定
3. `OPENAI_STT_FALLBACK_MODEL=whisper-1` を追加（任意だが推奨）
4. 再デプロイ後、くしま内科で1本通し: レビュー画面で医師/患者が分かれて表示されること
5. 崩れる場合は Variables で `OPENAI_WHISPER_MODEL=whisper-1` に戻して再デプロイ

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

くしま本番は **`medical-os-kushima`（`fyzlcteanzwypisvztku`）** を使う。歯科プロジェクトは使わない。
詳細: [07_kushima_production_connect.md](./07_kushima_production_connect.md)

```bash
# DATABASE_URL を medical-os-kushima から取得
# 例: postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
```

### 2. Railway（バックエンド）

1. 既存サービス `medical-os-api` を Hobby で再デプロイ（新規複製しない）
2. `railway.toml` を参照してビルド
3. 環境変数を設定:
   - `DATABASE_URL`
   - `JWT_SECRET`（本番用ランダム文字列）
   - `FRONTEND_URL`（Vercel URL）
   - `SINGLE_CLINIC_MODE=false`
   - `STT_PROVIDER=openai`
   - `LLM_PROVIDER=openai`
   - `OPENAI_API_KEY`
   - `OPENAI_WHISPER_MODEL=gpt-4o-transcribe-diarize`
   - `OPENAI_STT_FALLBACK_MODEL=whisper-1`
   - `OPENAI_DOCUMENT_MODEL=gpt-4o`
   - `STORAGE_PROVIDER=local`
   - `STORAGE_PATH=/data/audio`（Railway Volume 必須）
   - `NODE_ENV=production`

### 3. Vercel（フロントエンド）

1. `apps/frontend` をルートに設定（または monorepo 設定）
2. 環境変数:
   - `NEXT_PUBLIC_API_URL`（Railway API URL）
   - `NEXT_PUBLIC_DEMO_MODE=false`
   - `NEXT_PUBLIC_SINGLE_CLINIC_MODE=false`

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
5. パネルで診療開始 → 30秒以上録音 → 処理完了 → SOAP を確認
6. 確認済み → 書類が必要なら開く → 紹介状の文脈を確認
7. 編集 → 再生成時に修正が反映されること（few-shot）

---

## 関連

- [Decision Log](./02_decision_log.md)
- [Deployment Architecture](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)
- [Physician Copilot Rules](../06_CURSOR_RULES/17_physician_copilot_rules.md)
