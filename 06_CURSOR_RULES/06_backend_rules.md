# Cursor Rules
# 06 — Backend Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`05_frontend_rules.md`](./05_frontend_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

> **優先順位**: バックエンド実装時は本書 + [`01_global_rules.md`](./01_global_rules.md) + [`03_architecture_rules.md`](./03_architecture_rules.md)。System Design 詳細 → [`03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md)

---

# Purpose

This document defines **how Cursor should implement the backend** of Medical OS.

**The backend is the heart of the application.**

Every business rule, medical workflow, AI orchestration, and persistence operation belongs here.

The backend must remain **stable** even if Frontend, AI Providers, Database, or Infrastructure change.

---

# Backend Philosophy

## The backend owns

Business Logic · Medical Workflow · Security · Validation · Persistence · AI Orchestration

## The backend never owns

Presentation · Rendering · Animations · User Interface

---

# Technology

| Category | Technology |
|----------|------------|
| Framework | **NestJS** |
| Language | **TypeScript** |
| ORM | **Prisma** |
| Validation | **Zod** |
| Authentication | **JWT** |
| Logging | **Pino** |
| Testing | **Jest** |

詳細: [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md)

---

# Backend Layers

```
Controller → Application Service → Domain Service → Repository → Database
```

**Never bypass layers.**

詳細: [`03_architecture_rules.md`](./03_architecture_rules.md) · [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md)

---

# Controller Rules

## Controllers should only

Receive requests · Validate DTOs · Authenticate · Authorize · Call Services · Return Responses

## Controllers must never

Call Prisma · Generate SOAP · Generate Clinical Notes · Call AI Providers · Implement Business Logic

---

# Service Rules

Services contain:

Business Logic · Medical Rules · Workflow · Validation · AI Orchestration

**Services should remain independent from HTTP.**

---

# Repository Rules

## Repositories perform

Create · Read · Update · Delete

## Repositories never

Call AI · Validate Medical Logic · Generate Documents

**Repositories only communicate with Prisma.**

詳細: [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md)

---

# Dependency Flow

## Allowed

```
Controller → Service → Repository → Database
```

## Forbidden

```
Controller → Database
Controller → Prisma
Repository → AI
Frontend → Repository
```

---

# DTO Rules

Separate: **Request DTO · Response DTO · Database Entity**

**Never expose database models directly.**

Every endpoint has: Input DTO · Output DTO · Validation Schema

詳細: [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# Validation

Every external request must pass:

```
Authentication → Authorization → Request Validation → Business Validation → Medical Validation → Persistence
```

**Validation is mandatory.**

---

# Authentication

```
JWT → Role Validation → Permission Validation → Business Logic
```

**Unauthorized requests stop immediately.**

詳細: [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md)

---

# Authorization

Roles: **Administrator · Physician · Medical Assistant · Read Only**

**Every endpoint explicitly declares permitted roles.**

**要確認**: Medical Assistant / Read Only を MVP 0.1 で実装するか — [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Error Handling

Every service should:

Throw typed exceptions · Log failures · Return meaningful errors

**Never expose internal implementation.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Exception Handling

Use **Global Exception Filter**.

Supported Errors: Validation · Authentication · Authorization · Business · Database · AI · Unexpected

**Every error returns a standard response.**

---

# Logging

Every request logs:

Request ID · User ID · Consultation ID · Execution Time · Result · Errors · Business Events

**Important medical workflows must always be traceable.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Transactions

Use **Prisma Transactions** for:

Consultation Creation · SOAP Save · Clinical Note Save · Revision Save · Approval · Audit Log

**Medical consistency is more important than performance.**

---

# AI Orchestration

Services call **AIService** → AIService calls **LLMProvider**

**Never**: Service → OpenAI SDK directly.

**Provider independence is mandatory.**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md)

---

# Configuration

**Never hardcode**: API Keys · URLs · Timeouts · Model Names · Secrets

Everything belongs in **config/** or **Environment Variables**.

---

# Async Processing

Long-running AI tasks should:

```
Execute asynchronously → Return progress → Store intermediate state → Support retry
```

**Future**: Queue · BullMQ · Redis

---

# Health Checks

Backend exposes:

- `/api/v1/health`
- `/api/v1/health/database`
- `/api/v1/health/storage`
- `/api/v1/health/ai`

**Used by monitoring systems.**

---

# Security

Every endpoint uses:

HTTPS · JWT · RBAC · Input Validation · Output Validation · Audit Logging

**Sensitive data must never be logged.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`13_security_rules.md`](./13_security_rules.md) · [`../05_SYSTEM_ARCHITECTURE/19_security.md`](../05_SYSTEM_ARCHITECTURE/19_security.md)

---

# Database Access

Use **Prisma only**.

Avoid **Raw SQL** unless performance requires it.

Always use: Transactions · Indexes · Relations · Typed Queries

---

# Testing

| Layer | Test |
|-------|------|
| Every Service | Unit Test |
| Every Controller | Integration Test |
| Critical Workflow | End-to-End Test |

**Medical workflows require automated tests.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Performance

| Target | Goal |
|--------|------|
| Authentication | **< 200ms** |
| Database Query | **< 100ms** |
| History Search | **< 500ms** |
| SOAP Generation | **< 10 sec** |
| Clinical Note | **< 10 sec** |

**Optimize only after correctness.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md)

---

# Refactoring

Refactor when:

Complexity decreases · Readability improves · Duplication decreases · **Behavior remains identical**

**Never refactor medical behavior unintentionally.**

---

# Forbidden

**Never:**

Put business logic in controllers · Call AI directly from controllers · Access database from controllers · Expose stack traces · Expose Prisma errors · Use `any` · Skip validation · Skip authentication · Skip logging

---

# Backend Checklist

Before completing implementation, Cursor should verify:

Architecture respected · Correct layer used · Validation exists · Authentication exists · Logging exists · Transactions where required · Tests generated · Strong typing · Medical safety preserved

---

# Core Principle

**The backend is the guardian of Medical OS.**

Every request, every consultation, every AI result, and every medical document must pass through the backend's rules.

The backend protects **physician workflow**, **patient safety**, and **long-term maintainability**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Backend Architecture | [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) |
| Backend API Architecture | [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md) |
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| Cursor Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| API Specification | [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) |
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Logging & Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| 次章 | [`07_database_rules.md`](./07_database_rules.md) |
