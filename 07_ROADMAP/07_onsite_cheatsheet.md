# くしま内科 現地チートシート（1枚）

試験運用当日用。主環境はクラウド。不通時のみ Mac バックアップ。

---

## 先生向け最短フロー

1. CLINICS 全画面 + Medical OS **`/home`** を右下（約420×800）
2. ログイン（弱いデモパスワード禁止）
3. 同意チェック → 録音（**目安10分未満**）→ 停止
4. SOAP 確認 → 必要ならチャット（音声/テキスト）で意図追記
5. 「書類を全部作る」またはチャットで個別生成 → コピー/印刷
6. **`/demo` は使わない**

---

## 失敗したら（この順）

1. **もう一度処理する**（保存音声があれば再実行）
2. だめ → **録り直す**
3. それでもだめ → **紙カルテ**（自動 mock SOAP は使わない）
4. 「混み合っています」→ 少し待って再試行

チャットで書類が出ないとき: 返信に失敗理由が出る。もう一度指示するか「書類を全部作る」。

---

## 録音の目安

| 時間 | 表示 |
|------|------|
| 〜8分 | 通常 |
| 8分〜 | 注意（長め） |
| 12分〜 | 強い警告（停止は強制しないが、試験運用では区切る） |

長すぎると Whisper 上限で明示失敗します。

---

## クラウド不通時（Mac バックアップ）

開発用 Mac でリポジトリを開き:

```bash
# 1) ローカル DB
cd apps/backend && pnpm db:local

# 別ターミナル 2) API
cd apps/backend && pnpm start:dev
# または monorepo ルートから pnpm --filter @medical-os/backend start:dev

# 別ターミナル 3) フロント
cd apps/frontend && pnpm dev
```

- ブラウザ: `http://localhost:3000/home`
- 事前に `.env` に `OPENAI_API_KEY`、ffmpeg（`brew install ffmpeg`）があること
- ローカルは単一医院モード可。本番クラウドはログイン必須

---

## ヘルスチェック（担当者）

```bash
curl https://YOUR-RAILWAY-URL/api/v1/health/ai
```

確認: `apiKeyConfigured: true` / `ffmpegAvailable: true`

---

## 連絡

開発担当へ: 時刻・画面メッセージ・診療ID（分かれば）を伝える。
