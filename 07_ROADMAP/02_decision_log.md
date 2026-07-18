# Decision Log

最終更新: 2026年7月

---

## ドキュメント階層（2026-07 Medical OS Bible）

| 優先 | パス |
|------|------|
| 1 | `00_PRODUCT_CONSTITUTION.md` |
| 2 | [`04_implementation_kickoff.md`](./04_implementation_kickoff.md) — **実装基準** |
| 3 | `04_MVP_SPECIFICATION/` |
| 4 | `01_MEDICAL_DOMAIN_BIBLE/` 他 |

---

## 決定済み

| 日付 | 決定 |
|------|------|
| 2026-07 | プロダクト名: AI Medical Scribe OS |
| 2026-07 | EHR置き換えではない / 拡張レイヤー |
| 2026-07 | 診断・処方・検査決定はAIにさせない |
| 2026-07 | EHR自動書き込み禁止 / コピーのみ |
| 2026-07 | レセコン・予約・会計は対象外 |
| 2026-07 | 音声: 処理後削除、編集差分保存 |
| 2026-07 | 0.1: 匿名化・模擬データ |
| 2026-07 | Medical OS Bible 構成に再編 |
| 2026-07 | **Implementation Kickoff v1.0 採用** — 実装基準 |
| 2026-07 | ドキュメントは**リポジトリルート維持**（`docs/` 移行しない） |
| 2026-07 | EHR 第一検証: **MEDLEY CLINICS**（Constitution 追随更新） |
| 2026-07 | v0.1: 話者分離必須 · 2-pass STT · pause/resume 必須 · 確認前コピー禁止 |
| 2026-07 | 実装開始: Monorepo PR1–7 ロードマップ |
| 2026-07-17 | **谷口先生ヒアリング**: SOAPではなく全書類一括生成がコア価値 |
| 2026-07-17 | 先生専用AI: 初期60-70%精度、修正差分で学習 |
| 2026-07-17 | 8/1パイロット: クラウド（Vercel+Railway）+ 実OpenAI |
| 2026-07-18 | PostgreSQL 本番DB、GeneratedDocument 永続化、先生ルール設定 |

---

## Version 0.1 スコープ（Kickoff 確定）

| 項目 | 内容 |
|------|------|
| 録音 | Real-time · pause/resume · chunk upload |
| STT | RT preview + **final full-audio re-processing** |
| 話者 | 医師/患者/その他/不明（推測禁止） |
| 診療録 | Clinical Note — Included |
| コピー | **確認済み後のみ** |
| 検証 | 匿名化 · 模擬データ |

→ [`04_implementation_kickoff.md`](./04_implementation_kickoff.md) · [`../04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md)

---

## 未決定

STT/LLM プロバイダ確定、ホスティング、RBAC 詳細（Medical Assistant / Read Only の v0.1 実装範囲）、法務監修、録音同意 UX

**公式スタック提案**: [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md)

**実装ロードマップ**: [`../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md`](../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-07 | Medical OS Bible 最終構成へ再編 |
| 2026-07 | Implementation Kickoff v1.0 採用 · 矛盾追随更新 |
