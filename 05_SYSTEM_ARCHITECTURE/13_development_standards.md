# System Architecture
# 13 — Development Standards

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`12_logging_and_observability.md`](./12_logging_and_observability.md)

関連: [`03_backend_architecture.md`](./03_backend_architecture.md) · [`02_frontend_architecture.md`](./02_frontend_architecture.md) · [`../06_CURSOR_RULES/README.md`](../06_CURSOR_RULES/README.md) · [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

> **Cursor / AI エージェント**: [`06_CURSOR_RULES/01_global_rules.md`](../06_CURSOR_RULES/01_global_rules.md) が Cursor 向け最優先。本書はコード品質の詳細標準。[`06_CURSOR_RULES/README.md`](../06_CURSOR_RULES/README.md) は索引・MVP スコープ要約。**両方に従う。**

---

# Purpose

This document defines the **development standards** for Medical OS.

The objective is to ensure that every engineer and every AI coding assistant writes code with the **same philosophy**.

| Principle | Meaning |
|-----------|---------|
| Consistency | More important than personal preference |
| Readability | More valuable than clever code |

---

# Development Philosophy

Medical OS is **medical software**.

Medical software should be:

Predictable · Readable · Maintainable · Testable · Safe

Every line of code should make **future maintenance easier**.

---

# General Principles

Write code for **humans first**.

Computers are easy to satisfy. Future developers are not.

Every implementation should prioritize:

```
Readability → Correctness → Performance → Optimization
```

---

# SOLID Principles

Medical OS follows **SOLID**:

Single Responsibility · Open / Closed · Liskov Substitution · Interface Segregation · Dependency Inversion

**Every class should have one responsibility.**

---

# Clean Architecture

Dependencies always point **inward**:

```
UI → Application → Domain → Infrastructure
```

**Never reverse this dependency.**

詳細: [`01_architecture.md`](./01_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md)

---

# File Size

| Guideline | Lines |
|-----------|-------|
| **Recommended Maximum** | 300 |
| **Ideal** | 150–250 |

Large files should be **split**.

---

# Function Size

| Guideline | Lines |
|-----------|-------|
| **Recommended Maximum** | 50 |
| **Ideal** | 20–30 |

Every function should perform **one task**.

---

# Naming Rules

| Kind | Convention |
|------|------------|
| Variables | camelCase |
| Functions | camelCase |
| Classes | PascalCase |
| Interfaces | PascalCase |
| Enums | PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Folders | kebab-case |
| Files | kebab-case |

---

# Component Naming

| Good | Bad |
|------|-----|
| `patient-card.tsx` | `component.tsx` |
| `recording-panel.tsx` | `new.tsx` |
| `soap-editor.tsx` | `test.tsx` |

Every filename should describe its **responsibility**.

---

# Service Naming

AuthService · PatientService · ConsultationService · SOAPService · ClinicalNoteService · RecordingService · HistoryService · AuditService

**One service · One responsibility.**

詳細: [`03_backend_architecture.md`](./03_backend_architecture.md)

---

# Interface Naming

| Good | Bad |
|------|-----|
| `SpeechProvider` | `ISpeech` |
| `LLMProvider` | `IProvider` |
| `StorageProvider` | — |

**Do not prefix interfaces with `I`.**

---

# Folder Structure

```
src/
  modules/
  shared/
  common/
  config/
  database/
  providers/
  types/
  utils/
```

Each module should be **self-contained**.

---

# Dependency Rules

## Allowed

```
Controller → Service → Repository → Database
```

## Forbidden

| Pattern | Reason |
|---------|--------|
| Controller → Database | Bypasses business logic |
| Frontend → Database | Security · architecture violation |
| AI → Frontend | Wrong layer coupling |
| Business Logic → UI | Domain must not depend on UI |

---

# Comments

Only explain **Why**.

Never explain **What**.

```typescript
// Bad
// Increment i
i++

// Good
// Retry because medical records must never be lost
```

---

# Error Handling

**Never ignore errors.**

Never use `catch {}`.

Always: **Log** · **Recover** · **Return meaningful errors**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md) · [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Null Handling

Prefer: Optional Chaining · Nullish Coalescing · Explicit Validation

**Never assume values exist.**

---

# TypeScript Rules

| Rule | Detail |
|------|--------|
| Strict Mode | **Enabled** |
| Avoid | `any` |
| Prefer | `unknown` · Generics · Explicit Types |

**Type Safety is mandatory.**

---

# Async Rules

Always use `async` / `await`.

Avoid nested Promises.

**Handle every rejection.**

---

# API Rules

Controllers should:

Validate · Authenticate · Authorize · Call Services · Return Response

**Nothing else.**

詳細: [`06_backend_api_architecture.md`](./06_backend_api_architecture.md)

---

# Database Rules

- **Repositories** only communicate with Prisma
- **No SQL** inside Services
- **No business logic** inside Repositories

詳細: [`05_database_architecture.md`](./05_database_architecture.md)

---

# Logging Rules

Every important action logs:

Consultation ID · User ID · Request ID · Execution Time · Status

詳細: [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Testing Rules

| Target | Test Type |
|--------|-----------|
| Every Service | Unit Test |
| Every API | Integration Test |
| Every AI Pipeline | Validation Test |

**No production code without tests.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`../06_CURSOR_RULES/09_testing_rules.md`](../06_CURSOR_RULES/09_testing_rules.md)

---

# Git Rules

詳細: [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md) — **v1.0**

## Branch Naming

`feature/` · `bugfix/` · `hotfix/` · `release/`

## Commit Format

`feat:` · `fix:` · `refactor:` · `docs:` · `test:` · `chore:`

**Example**: `feat: implement SOAP generation pipeline`

---

# Code Review Checklist

詳細: [`../06_CURSOR_RULES/12_code_review_rules.md`](../06_CURSOR_RULES/12_code_review_rules.md) — **v1.0**

Readable · Typed · Tested · Logged · Secure · Modular · Reusable · No duplication · **Medical-safe**

---

# AI Coding Rules

When AI generates code, it must:

- Follow existing architecture
- Reuse existing services
- Avoid duplication
- Preserve type safety
- Add tests when appropriate
- **Never bypass validation**
- **Never hardcode secrets**
- **Never skip error handling**

詳細: [`../06_CURSOR_RULES/01_global_rules.md`](../06_CURSOR_RULES/01_global_rules.md) · [`../06_CURSOR_RULES/02_code_generation_rules.md`](../06_CURSOR_RULES/02_code_generation_rules.md) · [`../06_CURSOR_RULES/03_architecture_rules.md`](../06_CURSOR_RULES/03_architecture_rules.md) · [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) · [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) · [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) · [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md) · [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) · [`../06_CURSOR_RULES/09_testing_rules.md`](../06_CURSOR_RULES/09_testing_rules.md) · [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md) · [`../06_CURSOR_RULES/11_documentation_rules.md`](../06_CURSOR_RULES/11_documentation_rules.md) · [`../06_CURSOR_RULES/12_code_review_rules.md`](../06_CURSOR_RULES/12_code_review_rules.md) · [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) · [`../06_CURSOR_RULES/14_performance_rules.md`](../06_CURSOR_RULES/14_performance_rules.md) · [`../06_CURSOR_RULES/15_deployment_rules.md`](../06_CURSOR_RULES/15_deployment_rules.md) · [`../06_CURSOR_RULES/16_final_checklist.md`](../06_CURSOR_RULES/16_final_checklist.md) · [`../06_CURSOR_RULES/README.md`](../06_CURSOR_RULES/README.md)

---

# Refactoring Rules

Refactor only when:

Readability improves · Maintainability improves · Complexity decreases · **Behavior remains identical**

**Never refactor during bug fixes without necessity.**

---

# Documentation Rules

詳細: [`../06_CURSOR_RULES/11_documentation_rules.md`](../06_CURSOR_RULES/11_documentation_rules.md) — **v1.0**

Every public function should explain:

Purpose · Parameters · Returns · Side Effects

Complex business rules require **documentation**.

---

# Medical Rules

Medical logic should **never exist inside UI components**.

Medical logic belongs only in the **Domain Layer**.

This prevents **inconsistent behavior**.

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# Future Rules

Architecture Decisions (ADR) · Feature Flags · Migration Guides · Deprecation Policy · Performance Budgets

**These will be introduced after Version 1.0.**

---

# Core Principle

Medical OS is built for **decades**, not for demos.

Every line of code should make the next engineer say:

> **"I immediately understand why this was written."**

That is the definition of **high-quality software**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Cursor Rules — Global Rules | [`../06_CURSOR_RULES/01_global_rules.md`](../06_CURSOR_RULES/01_global_rules.md) |
| Cursor Rules — Code Generation | [`../06_CURSOR_RULES/02_code_generation_rules.md`](../06_CURSOR_RULES/02_code_generation_rules.md) |
| Cursor Rules — Architecture | [`../06_CURSOR_RULES/03_architecture_rules.md`](../06_CURSOR_RULES/03_architecture_rules.md) |
| Cursor Rules — AI Development | [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) |
| Cursor Rules — Frontend | [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) |
| Cursor Rules — Backend | [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) |
| Cursor Rules — Database | [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md) |
| Cursor Rules — AI Prompt | [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) |
| Cursor Rules — Testing | [`../06_CURSOR_RULES/09_testing_rules.md`](../06_CURSOR_RULES/09_testing_rules.md) |
| Cursor Rules — Git Workflow | [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md) |
| Cursor Rules — Documentation | [`../06_CURSOR_RULES/11_documentation_rules.md`](../06_CURSOR_RULES/11_documentation_rules.md) |
| Cursor Rules — Code Review | [`../06_CURSOR_RULES/12_code_review_rules.md`](../06_CURSOR_RULES/12_code_review_rules.md) |
| Cursor Rules — Security | [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) |
| Cursor Rules — Performance | [`../06_CURSOR_RULES/14_performance_rules.md`](../06_CURSOR_RULES/14_performance_rules.md) |
| Cursor Rules — Deployment | [`../06_CURSOR_RULES/15_deployment_rules.md`](../06_CURSOR_RULES/15_deployment_rules.md) |
| Cursor Rules — Final Checklist | [`../06_CURSOR_RULES/16_final_checklist.md`](../06_CURSOR_RULES/16_final_checklist.md) |
| Cursor Rules 索引 | [`../06_CURSOR_RULES/README.md`](../06_CURSOR_RULES/README.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| Logging And Observability | [`12_logging_and_observability.md`](./12_logging_and_observability.md) |
| MVP Test Plan | [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) |
| 次章 | [`14_project_directory_structure.md`](./14_project_directory_structure.md) |
