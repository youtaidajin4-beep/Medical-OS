# Cursor Rules
# 12 — Code Review Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`11_documentation_rules.md`](./11_documentation_rules.md)

関連: [`01_global_rules.md`](./01_global_rules.md) · [`02_code_generation_rules.md`](./02_code_generation_rules.md) · [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

> **優先順位**: 実装完了判断時は本書 + [`16_final_checklist.md`](./16_final_checklist.md) + 該当ドメインルール（Frontend / Backend / Database / AI 等）。生成手順 → [`02_code_generation_rules.md`](./02_code_generation_rules.md)

---

# Purpose

This document defines **how Cursor should review code** before considering any implementation complete.

Writing code is only half of software engineering.

The other half is verifying that the code is:

**Correct · Safe · Maintainable · Consistent · Medical-grade**

**Every implementation should pass these review rules before completion.**

---

# Review Philosophy

**Never ask:** "Does this code work?"

**Instead ask:** "Can physicians safely rely on this code five years from now?"

**Medical software requires long-term thinking.**

---

# Review Order

```
Architecture → Medical Safety → Business Logic → Security → Correctness → Performance → Readability → Style
```

**Always review from the highest-risk area first.**

---

# Architecture Review

Verify:

Correct Layer · Correct Module · Dependency Direction · No Circular Dependencies · Provider Independence · Single Responsibility · No duplicated business logic

**Architecture violations block approval.**

詳細: [`03_architecture_rules.md`](./03_architecture_rules.md)

---

# Medical Safety Review

Verify:

No hallucinated medical data · No skipped validation · No unsafe defaults · No missing review steps · No hidden automatic approvals · No medical logic inside UI

**Medical safety has highest priority.**

詳細: [`01_global_rules.md`](./01_global_rules.md) · [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Business Logic Review

Verify:

Workflow correctness · State transitions · Validation rules · Approval rules · Error recovery · Version history

**Business rules must match the Product Bible.**

詳細: [`../02_PRODUCT_BIBLE/`](../02_PRODUCT_BIBLE/) · [`../04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/)

---

# Security Review

Verify:

Authentication · Authorization · RBAC · Input validation · Output validation · Secret management · Rate limiting · No sensitive logging

**Security regressions block release.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`13_security_rules.md`](./13_security_rules.md)

---

# AI Review

Verify:

Provider abstraction · Prompt versioning · Structured output · Schema validation · Retry logic · Confidence handling · Warning generation · No direct provider dependency

**AI should remain replaceable.**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Database Review

Verify:

Normalization · Relationships · Indexes · Transactions · Versioning · Constraints · Foreign keys · No duplicated data

**Medical integrity is mandatory.**

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# API Review

Verify:

DTO usage · Validation · Authentication · Authorization · Typed responses · Error consistency · Logging · REST consistency

**Endpoints should represent workflows.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Frontend Review

Verify:

No business logic · Reusable components · Accessibility · Loading states · Error states · Typed props · Responsive layout

**Medical UI should remain simple.**

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# Code Quality Review

Verify:

Readable names · Small functions · Small components · No dead code · No duplication · Clear abstractions · Minimal complexity

**Prefer clarity over cleverness.**

詳細: [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

---

# TypeScript Review

Verify:

Strict types · No `any` · No ignored errors · Proper generics · Type inference · Null safety

**Type safety is required.**

---

# Error Handling Review

Verify:

Errors logged · Meaningful messages · Recovery possible · Retry where appropriate · No swallowed exceptions

**Every failure should be observable.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Logging Review

Verify:

Request ID · Consultation ID · User ID · Execution time · Errors · Business events · No sensitive data

**Logs support debugging and audits.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Performance Review

Verify:

No unnecessary rendering · Efficient database queries · Minimal API calls · Reasonable AI requests · No premature optimization

**Correctness before speed.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md)

---

# Documentation Review

Verify:

Purpose documented · Public APIs documented · Architecture updated · Prompt documentation updated · Examples included

**Documentation should evolve with code.**

詳細: [`11_documentation_rules.md`](./11_documentation_rules.md)

---

# Testing Review

Verify:

Unit tests · Integration tests · Critical workflow tests · Regression tests · Validation tests

**No important feature without tests.**

詳細: [`09_testing_rules.md`](./09_testing_rules.md)

---

# Git Review

Verify:

Small commits · Meaningful commit message · No unrelated changes · Documentation updated · No secrets committed

**History remains understandable.**

詳細: [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

---

# AI Coding Review

When Cursor generates code, verify:

Architecture respected · No duplication · Validation exists · Logging exists · Tests exist · Medical safety preserved · Prompt versioning preserved · Provider independence maintained

詳細: [`02_code_generation_rules.md`](./02_code_generation_rules.md)

---

# Common Review Questions

Before approving code, ask:

Can another engineer understand this immediately? · Can another AI continue development safely? · Will this still make sense one year from now? · Could this accidentally harm patient workflow?

**If uncertain, revise the implementation.**

---

# Review Checklist

| Area | Status |
|------|--------|
| Architecture | ✅ |
| Medical Safety | ✅ |
| Business Logic | ✅ |
| Security | ✅ |
| Database | ✅ |
| API | ✅ |
| Frontend | ✅ |
| Testing | ✅ |
| Logging | ✅ |
| Documentation | ✅ |
| Performance | ✅ |
| Readability | ✅ |

---

# Approval Criteria

Code is considered **complete** only when:

Architecture is preserved · Medical safety is maintained · Business rules are correct · Tests pass · Documentation is updated · Review checklist is fully satisfied

**Working code alone is not enough.**

---

# Core Principle

**Medical software deserves rigorous review.**

Every code review protects **Patients · Physicians · Future developers · Future AI assistants**

The highest-quality code is not code that merely works.

**It is code that remains trustworthy for years.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Global Rules | [`01_global_rules.md`](./01_global_rules.md) |
| Code Generation Rules | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| MVP Test Plan | [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) |
| Final Checklist | [`16_final_checklist.md`](./16_final_checklist.md) |
| Product Bible | [`../02_PRODUCT_BIBLE/`](../02_PRODUCT_BIBLE/) |
| 次章 | [`13_security_rules.md`](./13_security_rules.md) |
