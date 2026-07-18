# Prompt Library — 索引

Version 0.1 のプロンプト管理:

- **AI Service Architecture — Prompt Manager**: [`07_ai_service_architecture.md`](./07_ai_service_architecture.md)
- **AI Architecture — Module 10**: [`04_ai_architecture.md`](./04_ai_architecture.md)
- **永続化**: [`05_database_architecture.md`](./05_database_architecture.md) — PromptVersions テーブル

## 配置予定

[`14_project_directory_structure.md`](./14_project_directory_structure.md) に準拠:

`apps/backend/src/providers/ai/prompts/`

**要確認**: `packages/` への切り出しは v0.1 以降

## 遵守ルール

- 下書きのみ、幻覚禁止、不明明示、断定回避
- 診断・処方・検査決定しない
- ハードコード禁止 — 中央管理・バージョン管理

**Cursor プロンプトルール**: [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) — **v1.0**

## 計画プロンプト（v1.0 名称）

| ID | 用途 | 状態 |
|----|------|------|
| `clinical_extraction_v1` | 臨床事実抽出 | 未作成 |
| `clinical_validation_v1` | 検証 | 未作成 |
| `soap_generation_v1` | SOAP下書き | 未作成 |
| `clinical_note_generation_v1` | 診療録 | 未作成 |

**要確認**: CLINICS 貼り付け形式、医師文体

関連: [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`14_project_directory_structure.md`](./14_project_directory_structure.md) · [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) · [`../01_MEDICAL_DOMAIN_BIBLE/05_SOAP.md`](../01_MEDICAL_DOMAIN_BIBLE/05_SOAP.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

前章: [`17_api_design.md`](./17_api_design.md)
