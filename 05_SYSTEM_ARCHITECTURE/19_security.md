# Security — 索引

Version 0.1 のセキュリティアーキテクチャは **MVP Security v1.0** に集約している。

→ [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

**Cursor セキュリティルール**: [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) — **v1.0**

最上位: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
ドメイン: [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md)  
アーキテクチャ: [`01_architecture.md`](./01_architecture.md) · [`16_development_roadmap.md`](./16_development_roadmap.md) · [`15_technology_stack.md`](./15_technology_stack.md) · [`14_project_directory_structure.md`](./14_project_directory_structure.md) · [`13_development_standards.md`](./13_development_standards.md) · [`12_logging_and_observability.md`](./12_logging_and_observability.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md) · [`10_storage_architecture.md`](./10_storage_architecture.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) · [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) · [`05_database_architecture.md`](./05_database_architecture.md) · [`04_ai_architecture.md`](./04_ai_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md)

## 実装チェックリスト（横断）

| 項目 | 状態 |
|------|------|
| 法務/セキュリティ監修 | **要確認** — 未確保 |
| STT/LLM/Cloud 選定 | **要確認** — [`15_technology_stack.md`](./15_technology_stack.md) · Decision Log |
| オブジェクトストレージ選定 | **要確認** — R2 vs S3 |
| バックエンドホスティング選定 | **要確認** — Railway / Render / Cloud Run 等 |
| ログ保持期間 | **要確認** — 法令・契約との整合 |
| モノレポ初期化 | **要確認** — Phase 0 |
| 匿名化・模擬データ検証 | Constitution 準拠 |
| EHR 連携 | コピーのみ |

## 主要リスク

未確認下書きの転記 · STT/LLM 誤り · 幻覚 · 外部送信 · 別患者混在 · 公開 URL 露出 · シークレット漏洩 · 監査ログ改ざん

**法的判断を確定しない。**

前章: [`18_prompt_library.md`](./18_prompt_library.md)
