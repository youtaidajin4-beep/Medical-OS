# Cursor Rules
# 02 — Code Generation Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`01_global_rules.md`](./01_global_rules.md)

関連: [`01_global_rules.md`](./01_global_rules.md) · [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

> **優先順位**: [`01_global_rules.md`](./01_global_rules.md) が Cursor 向け最優先。本書は **コード生成の具体手順・パターン**。矛盾時 → Global Rules が優先。

---

# Purpose

This document defines **how Cursor should generate code** for Medical OS.

The objective is **consistency**.

Every generated file should look as if it were written by the **same senior software engineer**.

Cursor should prioritize **long-term maintainability** over short-term convenience.

---

# General Rules

Whenever generating code, Cursor should:

- Follow existing architecture
- Reuse existing modules
- Respect folder structure
- Preserve naming conventions
- Generate **production-quality** code

**Do not generate prototype code unless explicitly requested.**

詳細: [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

---

# Before Writing Code

Always determine: **What layer am I implementing?**

Presentation · Application · Domain · Infrastructure · Database

**Do not mix responsibilities.**

---

# File Creation Rules

- Create the **minimum number of files** necessary
- **Never duplicate** existing functionality
- If an existing service can be extended safely → **extend it**
- **Do not create unnecessary abstractions**

---

# React Component Rules

Components should:

- Have one responsibility
- Receive typed props
- Avoid internal business logic
- Be reusable
- Be testable
- Keep rendering logic simple

| Guideline | Lines |
|-----------|-------|
| Recommended | 150–250 |
| Maximum | 300 |

詳細: [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)

---

# Next.js Rules

**Prefer Server Components.**

Use **Client Components** only when required:

Forms · Recording · Clipboard · State Management · Animations

**Never use Client Components unnecessarily.**

---

# NestJS Rules

Controllers **only**:

Receive Request · Validate · Authenticate · Call Service · Return Response

**No business logic.**

詳細: [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# Service Rules

Services contain:

Business Logic · Medical Rules · Workflow · Validation · Orchestration

**Services should never know about UI.**

---

# Repository Rules

Repositories **only**: Read · Write · Update · Delete database records.

Repositories must **never**:

Generate SOAP · Call AI · Validate business rules

詳細: [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md)

---

# Prisma Rules

Always use **Prisma**.

Never write raw SQL unless performance requires it.

Prefer: `findUnique()` · `findFirst()` · `create()` · `update()` · `delete()` · `transaction()`

---

# TypeScript Rules

Always: **Strict Types**

Never: `any`

Prefer: `unknown` · Discriminated Unions · Enums · Interfaces · Generics

**Infer types whenever possible.**

---

# Error Handling

Every async function must use:

```
try → catch → log → return typed error
```

**Never ignore Promise rejections.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Logging Rules

Always log: Start · Finish · Duration · Failure · Consultation ID · User ID · Request ID

**Business events should always be observable.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# API Rules

Every endpoint requires:

DTO · Validation · Authentication · Authorization · Typed Response · Standard Error Format

**Never return raw database entities.**

---

# DTO Rules

Separate: **Request DTO** · **Response DTO** · **Database Entity**

**Never expose internal database fields.**

---

# Zod Rules

All external input **must be validated**:

Request · AI Output · Configuration · Environment Variables

**Future**: FHIR · HL7

**Everything external is untrusted.**

---

# AI Integration Rules

**Never** call GPT directly inside Controllers.

Always:

```
Controller → Service → AI Provider → Result
```

**AI Providers remain replaceable.**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md`](../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md)

---

# Prompt Rules

Prompt text **never belongs inside services**.

Always load prompts from **PromptManager**.

Every prompt requires: Version · Schema · Description

詳細: [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Structured Output Rules

Whenever possible, LLMs should produce **Structured JSON** validated by **Zod**.

If parsing fails:

```
Retry → Fallback → Manual Review
```

---

# Security Rules

**Never**: Hardcode secrets · Expose stack traces · Expose database errors · Trust client input

**Always sanitize external data.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`13_security_rules.md`](./13_security_rules.md)

---

# State Rules

| Layer | State |
|-------|-------|
| Frontend State | UI only |
| Backend State | Business only |
| Database | Persistence only |

**Never confuse these responsibilities.**

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md) · [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)

---

# Testing Rules

| Generated | Also Generate |
|-----------|-----------------|
| Service | Unit Test |
| Controller | Integration Test |
| Utility | Unit Test |

**Critical workflows require test coverage.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Documentation Rules

Every exported function should include: Purpose · Parameters · Returns · Side Effects

Complex workflows require diagrams or comments.

詳細: [`11_documentation_rules.md`](./11_documentation_rules.md)

---

# Refactoring Rules

Before refactoring, verify:

Behavior preserved · Architecture improved · Complexity reduced · Readability increased

**Never refactor merely for stylistic reasons.**

---

# Performance Rules

**Optimize only after correctness.**

Avoid premature optimization.

```
Measure first → Optimize second
```

**Medical correctness is more important than speed.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md)

---

# AI Coding Checklist

Before completing any implementation, Cursor should verify:

Architecture respected · No duplicated logic · Strong typing · Validation exists · Error handling exists · Logging exists · Tests generated · Documentation added · Security preserved

詳細: [`12_code_review_rules.md`](./12_code_review_rules.md)

---

# Forbidden Code

**Never generate:**

Huge Components · God Services · Raw SQL · Business Logic in Controllers · Business Logic in React · Hardcoded Prompts · Hardcoded Secrets · Unvalidated Input · Hidden Side Effects

詳細: [`07_database_rules.md`](./07_database_rules.md) · [`06_backend_rules.md`](./06_backend_rules.md) · [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# Core Principle

Cursor should generate code that another **senior engineer would immediately approve**.

Every generated file should be:

**Predictable · Readable · Safe · Consistent**

**Medical-grade quality is the default—not the exception.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Global Rules | [`01_global_rules.md`](./01_global_rules.md) |
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| Frontend Rules | [`05_frontend_rules.md`](./05_frontend_rules.md) |
| Backend Rules | [`06_backend_rules.md`](./06_backend_rules.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| AI Prompt Rules | [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Git Workflow Rules | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
| Documentation Rules | [`11_documentation_rules.md`](./11_documentation_rules.md) |
| Code Review Rules | [`12_code_review_rules.md`](./12_code_review_rules.md) |
| Security Rules | [`13_security_rules.md`](./13_security_rules.md) |
| Performance Rules | [`14_performance_rules.md`](./14_performance_rules.md) |
| Deployment Rules | [`15_deployment_rules.md`](./15_deployment_rules.md) |
| Final Checklist | [`16_final_checklist.md`](./16_final_checklist.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Directory Structure | [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) |
| Technology Stack | [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) |
| 次章 | [`03_architecture_rules.md`](./03_architecture_rules.md) |
