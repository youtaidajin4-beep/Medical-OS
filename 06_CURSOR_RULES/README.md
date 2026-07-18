# Cursor Rules

Cursor / AI エージェント向け開発ルール。

| ファイル | 内容 |
|----------|------|
| [01_global_rules.md](./01_global_rules.md) | **v1.0** — Global Rules（Cursor 向け最優先） |
| [02_code_generation_rules.md](./02_code_generation_rules.md) | **v1.0** — Code Generation Rules（生成手順・パターン） |
| [03_architecture_rules.md](./03_architecture_rules.md) | **v1.0** — Architecture Rules（レイヤー・依存・架構整合） |
| [04_ai_development_rules.md](./04_ai_development_rules.md) | **v1.0** — AI Development Rules（AI 実装専用） |
| [05_frontend_rules.md](./05_frontend_rules.md) | **v1.0** — Frontend Rules（フロント実装専用） |
| [06_backend_rules.md](./06_backend_rules.md) | **v1.0** — Backend Rules（バックエンド実装専用） |
| [07_database_rules.md](./07_database_rules.md) | **v1.0** — Database Rules（DB / Prisma 実装専用） |
| [08_ai_prompt_rules.md](./08_ai_prompt_rules.md) | **v1.0** — AI Prompt Rules（プロンプト設計・管理専用） |
| [09_testing_rules.md](./09_testing_rules.md) | **v1.0** — Testing Rules（テスト作成・検証専用） |
| [10_git_workflow_rules.md](./10_git_workflow_rules.md) | **v1.0** — Git Workflow Rules（Git / PR / リリース専用） |
| [11_documentation_rules.md](./11_documentation_rules.md) | **v1.0** — Documentation Rules（ドキュメント作成・維持専用） |
| [12_code_review_rules.md](./12_code_review_rules.md) | **v1.0** — Code Review Rules（実装完了前レビュー専用） |
| [13_security_rules.md](./13_security_rules.md) | **v1.0** — Security Rules（セキュリティ実装専用） |
| [14_performance_rules.md](./14_performance_rules.md) | **v1.0** — Performance Rules（パフォーマンス最適化専用） |
| [15_deployment_rules.md](./15_deployment_rules.md) | **v1.0** — Deployment Rules（デプロイ・リリース専用） |
| [16_final_checklist.md](./16_final_checklist.md) | **v1.0** — Final Checklist（実装完了最終ゲート） |
| [17_physician_copilot_rules.md](./17_physician_copilot_rules.md) | **v1.0** — Physician Copilot Rules（先生専用AI・確認時間削減） |

**コード品質・命名等の詳細標準**: [`05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

> **18章構成（完結）**: Global → … → Final Checklist → **Physician Copilot Rules** → Development Standards（+ System Architecture 参照）

---

## ドキュメント優先順位

### プロダクト判断

1. [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)
2. [`04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md)
3. [`01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)
4. [`07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

### Cursor コード生成

1. **[`01_global_rules.md`](./01_global_rules.md)** — 最優先
2. **[`02_code_generation_rules.md`](./02_code_generation_rules.md)** — 生成手順・チェックリスト
3. **[`03_architecture_rules.md`](./03_architecture_rules.md)** — レイヤー・依存方向
4. **[`04_ai_development_rules.md`](./04_ai_development_rules.md)** — AI 機能実装時は必須
5. **[`05_frontend_rules.md`](./05_frontend_rules.md)** — フロント実装時は必須
6. **[`06_backend_rules.md`](./06_backend_rules.md)** — バックエンド実装時は必須
7. **[`07_database_rules.md`](./07_database_rules.md)** — DB / Prisma / マイグレーション実装時は必須
8. **[`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)** — プロンプト作成・編集時は必須
9. **[`09_testing_rules.md`](./09_testing_rules.md)** — テスト作成・検証時は必須
10. **[`10_git_workflow_rules.md`](./10_git_workflow_rules.md)** — Git / PR / リリース操作時は必須
11. **[`11_documentation_rules.md`](./11_documentation_rules.md)** — ドキュメント作成・更新時は必須
12. **[`12_code_review_rules.md`](./12_code_review_rules.md)** — 実装完了判断時は必須
13. **[`13_security_rules.md`](./13_security_rules.md)** — セキュリティ関連実装時は必須
14. **[`14_performance_rules.md`](./14_performance_rules.md)** — **パフォーマンス最適化時は必須**
15. **[`15_deployment_rules.md`](./15_deployment_rules.md)** — **デプロイ・リリース準備時は必須**
16. **[`16_final_checklist.md`](./16_final_checklist.md)** — **実装完了判断の最終ゲート（必須）**
17. [`05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)
18. 該当する System Architecture / MVP 仕様

矛盾時は**推測で確定せず**ユーザーに確認。

---

## 必須ルール（15項目 — クイック参照）

[`01_global_rules.md`](./01_global_rules.md) の要約。詳細は Global Rules を参照。

1. 勝手に機能を追加しない
2. MVP範囲を守る
3. 医療判断を自動化しない
4. AI生成物は下書き
5. 医師確認フローを省略しない
6. 重要変更を履歴に残す
7. 個人情報をログに出さない
8. 音声・カルテを外部へ不用意に送らない
9. 匿名化データで開発
10. セキュリティを後回しにしない
11. API未確認のEHRへ自動書き込みしない
12. 実装前に不明点を明示
13. 医療用語・業務フローを推測だけで確定しない
14. 画面操作負担を最小化
15. シンプルさを優先

---

## Constitution 追加原則

- Patient safety > convenience
- AI never invents facts
- Build for physicians, not engineers

---

## コード着手前

1. [`01_global_rules.md`](./01_global_rules.md) を確認
2. [`02_code_generation_rules.md`](./02_code_generation_rules.md) で生成パターンを確認
3. [`03_architecture_rules.md`](./03_architecture_rules.md) でレイヤー・依存方向を確認
4. AI 機能の場合 [`04_ai_development_rules.md`](./04_ai_development_rules.md) を確認
5. フロントの場合 [`05_frontend_rules.md`](./05_frontend_rules.md) を確認
6. バックエンドの場合 [`06_backend_rules.md`](./06_backend_rules.md) を確認
7. DB / Prisma の場合 [`07_database_rules.md`](./07_database_rules.md) を確認
8. プロンプト作成・編集の場合 [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) を確認
9. テスト作成・検証の場合 [`09_testing_rules.md`](./09_testing_rules.md) を確認
10. Git / PR / リリースの場合 [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) を確認
11. ドキュメント作成・更新の場合 [`11_documentation_rules.md`](./11_documentation_rules.md) を確認
12. セキュリティ関連の場合 [`13_security_rules.md`](./13_security_rules.md) を確認
13. [`07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) で未決定を確認
14. Version 0.1 スコープが**ユーザー確認済み**か確認
15. 法務・セキュリティ監修が必要なら範囲を限定

## 実装完了前

1. **[`16_final_checklist.md`](./16_final_checklist.md)** — **全 18 Step + Final Approval Matrix を確認（最優先）**
2. **[`12_code_review_rules.md`](./12_code_review_rules.md)** — レビューチェックリストを全項目確認
3. **[`13_security_rules.md`](./13_security_rules.md)** — セキュリティチェックリスト
4. **[`14_performance_rules.md`](./14_performance_rules.md)** — パフォーマンスチェックリスト（該当時）
5. **[`15_deployment_rules.md`](./15_deployment_rules.md)** — デプロイ・リリースチェックリスト（該当時）
6. 該当ドメインルール（Frontend / Backend / Database / AI 等）のチェックリストも確認
7. [`09_testing_rules.md`](./09_testing_rules.md) — テスト充足
8. [`11_documentation_rules.md`](./11_documentation_rules.md) — ドキュメント更新

---

## 参照

| 領域 | パス |
|------|------|
| **Global Rules** | `06_CURSOR_RULES/01_global_rules.md` |
| **Code Generation Rules** | `06_CURSOR_RULES/02_code_generation_rules.md` |
| **Architecture Rules** | `06_CURSOR_RULES/03_architecture_rules.md` |
| **AI Development Rules** | `06_CURSOR_RULES/04_ai_development_rules.md` |
| **Frontend Rules** | `06_CURSOR_RULES/05_frontend_rules.md` |
| **Backend Rules** | `06_CURSOR_RULES/06_backend_rules.md` |
| **Database Rules** | `06_CURSOR_RULES/07_database_rules.md` |
| **AI Prompt Rules** | `06_CURSOR_RULES/08_ai_prompt_rules.md` |
| **Testing Rules** | `06_CURSOR_RULES/09_testing_rules.md` |
| **Git Workflow Rules** | `06_CURSOR_RULES/10_git_workflow_rules.md` |
| **Documentation Rules** | `06_CURSOR_RULES/11_documentation_rules.md` |
| **Code Review Rules** | `06_CURSOR_RULES/12_code_review_rules.md` |
| **Security Rules** | `06_CURSOR_RULES/13_security_rules.md` |
| **Performance Rules** | `06_CURSOR_RULES/14_performance_rules.md` |
| **Deployment Rules** | `06_CURSOR_RULES/15_deployment_rules.md` |
| **Final Checklist** | `06_CURSOR_RULES/16_final_checklist.md` |
| MVP Non-Functional Requirements | `04_MVP_SPECIFICATION/04_non_functional_requirements.md` |
| Frontend Architecture | `05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md` |
| Backend Architecture | `05_SYSTEM_ARCHITECTURE/03_backend_architecture.md` |
| Database Architecture | `05_SYSTEM_ARCHITECTURE/05_database_architecture.md` |
| MVP Database Design | `04_MVP_SPECIFICATION/07_database_design.md` |
| Screen Specification | `04_MVP_SPECIFICATION/05_screen_specification.md` |
| Component Specification | `04_MVP_SPECIFICATION/06_component_specification.md` |
| UI Guideline | `04_MVP_SPECIFICATION/14_ui_guideline.md` |
| System Architecture | `05_SYSTEM_ARCHITECTURE/01_architecture.md` |
| AI Architecture | `05_SYSTEM_ARCHITECTURE/04_ai_architecture.md` |
| AI Service | `05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md` |
| AI Workflow | `05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md` |
| MVP AI Pipeline | `04_MVP_SPECIFICATION/09_ai_pipeline.md` |
| Prompt Library | `05_SYSTEM_ARCHITECTURE/18_prompt_library.md` |
| MVP | `04_MVP_SPECIFICATION/` |
| ドメイン | `01_MEDICAL_DOMAIN_BIBLE/` |
| Authentication | `05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md` |
| Storage | `05_SYSTEM_ARCHITECTURE/10_storage_architecture.md` |
| Deployment | `05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md` |
| Logging & Observability | `05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md` |
| Development Standards | `05_SYSTEM_ARCHITECTURE/13_development_standards.md` |
| Directory Structure | `05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md` |
| Technology Stack | `05_SYSTEM_ARCHITECTURE/15_technology_stack.md` |
| Development Roadmap | `05_SYSTEM_ARCHITECTURE/16_development_roadmap.md` |
| Backend API | `05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md` |
| MVP Goal | `04_MVP_SPECIFICATION/13_mvp_goal.md` |
| API | `04_MVP_SPECIFICATION/08_api_specification.md` |
| MVP Security | `04_MVP_SPECIFICATION/10_security.md` |
| Security 索引 | `05_SYSTEM_ARCHITECTURE/19_security.md` |
| Error Handling | `04_MVP_SPECIFICATION/11_error_handling.md` |
| Test Plan | `04_MVP_SPECIFICATION/12_test_plan.md` |
| Version Roadmap | `07_ROADMAP/01_version_roadmap.md` |
| Decision Log | `07_ROADMAP/02_decision_log.md` |
