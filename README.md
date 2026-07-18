# AI Medical Scribe OS

**Medical OS Bible** — 医療AI文書作成補助レイヤー。

既存EHR（第一検証: **MEDLEY CLINICS**）の横で動き、医師の文書作成負担を減らす。EHRの置き換えではない。

**ステータス**: Version 0.1 実装中（2026年7月）  
**実装基準**: [`07_ROADMAP/04_implementation_kickoff.md`](./07_ROADMAP/04_implementation_kickoff.md)

---

## ミッション

医療者が、書類や画面ではなく、患者と向き合える時間を増やす。

---

## 開発環境（Monorepo）

```bash
pnpm install
docker compose up -d    # PostgreSQL + MinIO
pnpm dev                # Frontend + Backend
```

詳細: ルート `package.json` · [`05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](./05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

---

## Kickoff → ドキュメント パスマッピング

| Kickoff 表記 | 実パス |
|--------------|--------|
| `docs/00_PRODUCT_CONSTITUTION` | [`00_PRODUCT_CONSTITUTION.md`](./00_PRODUCT_CONSTITUTION.md) |
| `docs/01_MEDICAL_DOMAIN_BIBLE` | [`01_MEDICAL_DOMAIN_BIBLE/`](./01_MEDICAL_DOMAIN_BIBLE/) |
| `docs/02_PRODUCT_BIBLE` | [`02_PRODUCT_BIBLE/`](./02_PRODUCT_BIBLE/) |
| `docs/03_MVP_SPECIFICATION` | [`04_MVP_SPECIFICATION/`](./04_MVP_SPECIFICATION/) |
| `docs/04_SYSTEM_DESIGN` | [`05_SYSTEM_ARCHITECTURE/`](./05_SYSTEM_ARCHITECTURE/) |
| `docs/05_CURSOR_RULES` | [`06_CURSOR_RULES/`](./06_CURSOR_RULES/) |

---

## リポジトリ構成

```
Medical-OS/
├── apps/frontend/          ← Next.js
├── apps/backend/           ← NestJS
├── packages/               ← shared config, types
├── 00_PRODUCT_CONSTITUTION.md
├── 01_MEDICAL_DOMAIN_BIBLE/
├── 02_PRODUCT_BIBLE/
├── 03_USER_RESEARCH/
├── 04_MVP_SPECIFICATION/
├── 05_SYSTEM_ARCHITECTURE/
├── 06_CURSOR_RULES/
└── 07_ROADMAP/
```

---

## Version 0.1 スコープ（Kickoff 確定）

**仮説**: 診療音声 → SOAP + 通常診療記録下書きで、記録時間 **5分 → 2分以内**

**必須**: リアルタイム録音 · 2-pass STT · 話者分類 · 構造化抽出 · SOAP · 診療録 · 要確認 · 医師承認 · コピー · 履歴

**除外**: EHR直接書き込み · 診断支援 · FHIR · 歯科/薬局/看護

詳細: [`04_MVP_SPECIFICATION/01_project_overview.md`](./04_MVP_SPECIFICATION/01_project_overview.md)

---

## 開発原則

- AI生成物はすべて**下書き**（確認済み前はコピー不可）
- 診断・処方・検査決定は**実装対象外**
- EHR連携は**コピーのみ**
- 推測で要件を確定しない — [`07_ROADMAP/02_decision_log.md`](./07_ROADMAP/02_decision_log.md)

---

## ドキュメント索引

| パス | 内容 |
|------|------|
| [`04_MVP_SPECIFICATION/`](./04_MVP_SPECIFICATION/) | MVP仕様 v1.0 |
| [`05_SYSTEM_ARCHITECTURE/`](./05_SYSTEM_ARCHITECTURE/) | System Design v1.0 |
| [`06_CURSOR_RULES/`](./06_CURSOR_RULES/) | Cursor Rules 16章 |
| [`07_ROADMAP/`](./07_ROADMAP/) | ロードマップ · Decision Log · **Kickoff** |
