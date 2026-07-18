# API Design — 索引

Version 0.1 の API 設計:

- **Backend API Architecture v1.0**: [`06_backend_api_architecture.md`](./06_backend_api_architecture.md)
- **Development Roadmap v1.0**: [`16_development_roadmap.md`](./16_development_roadmap.md)
- **Technology Stack v1.0**: [`15_technology_stack.md`](./15_technology_stack.md)
- **MVP エンドポイント一覧**: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

前章: [`16_development_roadmap.md`](./16_development_roadmap.md)  
アーキテクチャ: [`03_backend_architecture.md`](./03_backend_architecture.md) · [`01_architecture.md`](./01_architecture.md)

## 実装方針（横断）

- クライアント → 外部 AI 直送禁止
- PII をエラーメッセージ・ログに含めない
- OpenAPI 定義は MVP 仕様確定後に作成 — **要確認**

関連: [`19_security.md`](./19_security.md) · [`16_development_roadmap.md`](./16_development_roadmap.md) · [`15_technology_stack.md`](./15_technology_stack.md) · [`14_project_directory_structure.md`](./14_project_directory_structure.md) · [`13_development_standards.md`](./13_development_standards.md) · [`12_logging_and_observability.md`](./12_logging_and_observability.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md) · [`10_storage_architecture.md`](./10_storage_architecture.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) · [`04_ai_architecture.md`](./04_ai_architecture.md) · [`05_database_architecture.md`](./05_database_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)
