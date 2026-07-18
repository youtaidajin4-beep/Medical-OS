# Cursor Rules
# 16 — Final Checklist

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`15_deployment_rules.md`](./15_deployment_rules.md)

関連: [`12_code_review_rules.md`](./12_code_review_rules.md) · [`01_global_rules.md`](./01_global_rules.md) · [`02_code_generation_rules.md`](./02_code_generation_rules.md) · [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md)

> **優先順位**: 実装完了判断の**最終ゲート**。本書の全 Step を満たすまで完了とみなさない。詳細チェック → 各章（01–15）+ [`12_code_review_rules.md`](./12_code_review_rules.md)

---

# Purpose

This document defines the **final checklist** Cursor must complete before considering any implementation finished.

Generating code is **not** the goal.

Delivering **reliable, maintainable, medically safe software** is the goal.

**Every implementation must satisfy this checklist.**

If any item fails, **the implementation is incomplete.**

---

# Philosophy

Medical OS is **production software**.

Not demo software. Not prototype software.

**Every completed task should be deployable.**

---

# Step 1 — Understand the Requirement

Cursor must verify:

Purpose understood · Business problem understood · Medical workflow understood · Existing architecture reviewed · Related documentation reviewed

**Never begin implementation with incomplete understanding.**

詳細: [`01_global_rules.md`](./01_global_rules.md) · [`../04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/) · [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# Step 2 — Architecture Review

Verify:

Correct Layer · Correct Module · Dependency Direction · Provider Independence · Single Responsibility · No Circular Dependency · No Duplicate Logic

**Architecture always comes first.**

詳細: [`03_architecture_rules.md`](./03_architecture_rules.md)

---

# Step 3 — Type Safety

Verify:

Strict TypeScript · No `any` · No ignored compiler errors · Typed DTOs · Typed API Responses · Typed AI Responses

**Type safety is mandatory.**

詳細: [`02_code_generation_rules.md`](./02_code_generation_rules.md) · [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

---

# Step 4 — Validation

Verify:

Request Validation · Response Validation · Business Validation · Medical Validation · AI Output Validation · Configuration Validation

**Every external input is validated.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) · [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Step 5 — Medical Safety

Verify:

No fabricated medical facts · No skipped physician review · No automatic approval · No hidden assumptions · No unsafe defaults

**Medical safety overrides convenience.**

詳細: [`01_global_rules.md`](./01_global_rules.md) · [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Step 6 — Security

Verify:

Authentication · Authorization · RBAC · Environment Variables · No hardcoded secrets · Input Sanitization · Safe Error Messages · Sensitive Data Protection

詳細: [`13_security_rules.md`](./13_security_rules.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

> **要確認**: Medical Assistant / Read Only の MVP 0.1 RBAC 実装 — [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Step 7 — AI Rules

Verify:

Provider Abstraction · Prompt Versioning · Structured Output · Schema Validation · Retry Logic · Confidence Handling · Warning Generation · No direct provider dependency

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Step 8 — Database

Verify:

Relationships · Indexes · Constraints · Transactions · Versioning · Audit Support · No duplicated data

**Medical records remain consistent.**

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# Step 9 — Logging

Verify:

Request ID · Consultation ID · User ID · Execution Time · Errors · Business Events · Audit Trail

**Nothing important happens silently.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) · [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Step 10 — Error Handling

Verify:

Meaningful Errors · Recovery Strategy · Retry Logic · No swallowed exceptions · Graceful degradation

**Failures must remain understandable.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) · [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Step 11 — Frontend

Verify:

Loading State · Error State · Empty State · Accessibility · Reusable Components · No Business Logic · Typed Props · Responsive Layout

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# Step 12 — Backend

Verify:

Thin Controllers · Clean Services · Repositories Only Access Database · Configuration Centralized · Health Checks · No architectural violations

詳細: [`06_backend_rules.md`](./06_backend_rules.md)

---

# Step 13 — Testing

Verify:

Unit Tests · Integration Tests · Critical Workflow Tests · Regression Tests · Validation Tests

**Tests must pass before completion.**

詳細: [`09_testing_rules.md`](./09_testing_rules.md) · [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

---

# Step 14 — Documentation

Verify:

Architecture Updated · Workflow Updated · Prompt Documentation Updated · Public APIs Documented · Examples Added

**Documentation is part of the implementation.**

詳細: [`11_documentation_rules.md`](./11_documentation_rules.md)

---

# Step 15 — Performance

Verify:

No unnecessary rendering · Efficient queries · Minimal payloads · No duplicate AI calls · No obvious bottlenecks

**Correctness remains the priority.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md) · [`../04_MVP_SPECIFICATION/04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md)

---

# Step 16 — Git Readiness

Verify:

Single Responsibility · Clean Commit · Meaningful Commit Message · No Secrets · Documentation Included · Ready for Pull Request

詳細: [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

> **要確認**: Git リポジトリ未初期化 — 初回 PR 前に [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) で確認

---

# Step 17 — Deployment Readiness

Verify:

Build Passes · Lint Passes · Type Check Passes · Environment Variables Verified · Migration Safe · Rollback Available · Health Checks Ready

詳細: [`15_deployment_rules.md`](./15_deployment_rules.md) · [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)

---

# Step 18 — Future Compatibility

Verify:

Replaceable AI Provider · Extensible Database · Modular Architecture · Future Features Supported · No unnecessary coupling

**Today's implementation should not block tomorrow's product.**

詳細: [`03_architecture_rules.md`](./03_architecture_rules.md) · [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Final Approval Matrix

| Category | Status |
|----------|--------|
| Requirement | ✅ |
| Architecture | ✅ |
| Medical Safety | ✅ |
| Security | ✅ |
| Validation | ✅ |
| AI | ✅ |
| Database | ✅ |
| Logging | ✅ |
| Testing | ✅ |
| Documentation | ✅ |
| Performance | ✅ |
| Deployment | ✅ |

**All items must pass before implementation is considered complete.**

詳細レビュー: [`12_code_review_rules.md`](./12_code_review_rules.md)

---

# Definition of Done

A task is complete only when:

- The feature works.
- The architecture remains clean.
- Medical safety is preserved.
- Tests pass.
- Documentation is updated.
- Logs are sufficient.
- Security is verified.
- Future developers can understand the implementation.

**Working code alone is not "Done."**

---

# Core Principle

Medical OS is intended to become **long-term infrastructure for healthcare**.

Every implementation should leave the project **safer, clearer, more maintainable, and easier to extend** than it was before.

**That is the standard of completion.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Code Review Rules | [`12_code_review_rules.md`](./12_code_review_rules.md) |
| Global Rules | [`01_global_rules.md`](./01_global_rules.md) |
| Code Generation Rules | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
| Frontend Rules | [`05_frontend_rules.md`](./05_frontend_rules.md) |
| Backend Rules | [`06_backend_rules.md`](./06_backend_rules.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| AI Prompt Rules | [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Git Workflow Rules | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
| Documentation Rules | [`11_documentation_rules.md`](./11_documentation_rules.md) |
| Security Rules | [`13_security_rules.md`](./13_security_rules.md) |
| Performance Rules | [`14_performance_rules.md`](./14_performance_rules.md) |
| Deployment Rules | [`15_deployment_rules.md`](./15_deployment_rules.md) |
| MVP Goal | [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Cursor Rules 索引 | [`README.md`](./README.md) |
