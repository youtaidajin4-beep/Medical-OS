# Cursor Rules
# 01 — Global Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md)

関連: [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

> **優先順位**: Cursor がコードを生成・変更・リファクタリングする際、本書は **Cursor 向け指示の最優先**。Product Constitution はプロダクト判断の最上位。矛盾時 → 本書（実装安全）＋ Constitution（患者安全）を両方満たすようユーザーに確認。

---

# Purpose

This document defines the **global development rules** that Cursor AI must **always follow** when generating, modifying, or refactoring code for Medical OS.

These rules have the **highest priority** among Cursor-specific instructions.

If another instruction conflicts with this document, **this document wins** — except where [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) requires escalation to the user.

---

# Core Mission

Medical OS is **medical software**.

Every implementation must prioritize:

```
Patient Safety
    ↓
Physician Workflow
    ↓
Maintainability
    ↓
Performance
    ↓
Developer Convenience
```

**Never sacrifice safety for speed.**

---

# Development Philosophy

Cursor is **not writing code**.

Cursor is helping build a **long-term medical platform**.

Every implementation should be:

Simple · Readable · Modular · Predictable · Well Tested · Replaceable

---

# Architecture Rules

Always follow the architecture:

```
Frontend → Backend API → Business Logic → Database
```

**Never skip layers.**

## Forbidden

| Pattern | Reason |
|---------|--------|
| Frontend → Database | Security · architecture |
| Frontend → AI Provider | No direct AI from client |
| Controller → Repository | Bypasses business logic |
| UI → Business Logic | Wrong dependency direction |

詳細: [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

---

# Business Logic

Business rules belong **only** in the Domain / Service Layer.

**Never place medical logic inside:**

React Components · Controllers · Repositories · Database

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# TypeScript Rules

Always use **Strict TypeScript**.

**Never use** `any`.

**Prefer**: `unknown` · Generics · Explicit Types

**Type safety is mandatory.**

---

# Component Rules

Components must:

- Be reusable
- Be small
- Have one responsibility
- Accept typed props
- Avoid duplicate logic

**Maximum recommended size: 300 lines**

詳細: [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)

---

# Service Rules

**One service · One responsibility.**

Example: AuthService · PatientService · ConsultationService · SOAPService · ClinicalNoteService

**Never combine unrelated business logic.**

詳細: [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md)

---

# API Rules

- **Never** call AI directly from the frontend
- **Never** access the database directly from the frontend
- **Always** communicate through Backend APIs

詳細: [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# AI Rules

**Never** generate medical information from raw transcripts alone.

Always follow:

```
Transcript → Extraction → Validation → Structured Medical Data → SOAP → Clinical Note
```

- **Never skip extraction**
- **Never skip validation**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Medical Safety Rules

The AI must **never** invent:

Diagnoses · Medications · Allergies · Laboratory Values · Dates · Procedures

**If uncertain → Return uncertainty. Never fabricate.**

---

# Error Handling

Every async operation must:

Handle errors · Log errors · Return meaningful responses · Support retry where appropriate

**Never swallow exceptions.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Logging

Log every important workflow:

Recording · Transcript · SOAP · Clinical Note · Approval · History · Errors · Audit

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Security

**Never hardcode:**

Passwords · Secrets · API Keys · JWT Secrets · Database URLs

**Always use environment variables.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`13_security_rules.md`](./13_security_rules.md) · [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md)

---

# Database Rules

Repositories are the **only layer** that communicates with Prisma.

- **Never** write SQL in Services
- **Never** put business logic inside Repositories

詳細: [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md)

---

# Prompt Rules

- **Never** hardcode prompts across multiple files
- **Always** retrieve prompts through **PromptManager**
- **Every prompt must be versioned**

詳細: [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) · [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md)

---

# Code Quality

Always prefer:

```
Readable code → Simple code → Optimized code
```

**Avoid clever implementations.**

Future maintainability is more important.

---

# Testing

Whenever implementing new business logic, also generate:

Unit Tests · Integration Tests (when applicable)

**No critical feature should exist without tests.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Documentation

Public classes · Public methods · Complex algorithms — **must be documented**.

Explain **Why**, not **What**.

---

# Refactoring

Before refactoring:

- Preserve behavior
- Improve readability
- Reduce duplication

**Never change medical behavior unintentionally.**

---

# Forbidden Behaviors

**Never:**

Duplicate business logic · Skip validation · Bypass authentication · Expose internal errors · Hardcode secrets · Ignore TypeScript errors · Disable lint rules unnecessarily · Use `any` to silence errors

---

# Physician Copilot Criteria (2026/7/17)

新機能の設計・実装時は、[`17_physician_copilot_rules.md`](./17_physician_copilot_rules.md) の **2観点** を必ず検証する。

1. **谷口先生の確認時間を減らせるか**
2. **先生独自の診療ルールを学習・反映できるか**

---

# Preferred Mindset

When implementing any feature, ask:

| Question | Required |
|----------|----------|
| Is this safe? | Yes |
| Is this maintainable? | Yes |
| Is this testable? | Yes |
| Is this understandable six months from now? | Yes |
| Does it reduce physician review time? | Yes (see 17_physician_copilot_rules) |
| Can physician-specific rules be learned? | Yes (see 17_physician_copilot_rules) |

**If not, rewrite it.**

---

# Final Principle

Cursor is **not** optimizing for writing code faster.

Cursor is optimizing for building software that **physicians can trust for years**.

When in doubt, choose the **safer**, **simpler**, **more maintainable** implementation.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Cursor Rules 索引 | [`README.md`](./README.md) |
| Code Generation Rules | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
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
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Product Constitution | [`../00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) |
| MVP Project Overview | [`../04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| 次章 | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
