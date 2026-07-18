# System Architecture
# 03 — Backend Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`02_frontend_architecture.md`](./02_frontend_architecture.md)

技術スタック: [`15_technology_stack.md`](./15_technology_stack.md)

Cursor バックエンドルール: [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md)

---

# Purpose

This document defines the **backend architecture** of Medical OS Version 0.1.

The backend is responsible for orchestrating all **business logic**.

It acts as the single source of truth between:

```
Frontend → AI Pipeline → Database → Storage
```

**No business logic should exist outside the backend.**

---

# Technology Stack

| Category | Technology |
|----------|------------|
| Framework | NestJS |
| Language | TypeScript |
| Runtime | Node.js 22+ |
| API | REST |
| Authentication | JWT |
| Validation | Zod |
| ORM | Prisma |
| Database | PostgreSQL |
| Object Storage | AWS S3 or Cloudflare R2 |
| Logging | Pino |
| Testing | Jest |
| Deployment | Docker |

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

> **要確認**: デプロイ先・ORM・ログ基盤の最終選定は関係者確認後。

---

# Backend Responsibilities

The backend is responsible for:

Authentication · Authorization · Business Logic · AI Orchestration · Database Operations · Audit Logging · Security · Validation · Error Handling · API Responses

**The backend never renders UI.**

---

# Layer Architecture

```
Presentation Layer
    ↓
Controller Layer
    ↓
Application Layer
    ↓
Domain Layer
    ↓
Infrastructure Layer
    ↓
Database
```

---

# Controller Layer

**Responsibilities**

Receive HTTP Requests · Validate Input · Authenticate User · Call Services · Return Responses

**Controllers must never contain business logic.**

詳細: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Service Layer

Business logic belongs here.

**Core Services**

AuthService · PatientService · ConsultationService · RecordingService · TranscriptService · SOAPService · ClinicalNoteService · HistoryService · AuditService · SettingsService

**Future**

ReferralService · CertificateService · TimelineService · KnowledgeService

**Each service should have only one responsibility.**

---

# Repository Layer

Repositories communicate with Prisma.

**Responsibilities**

Read Data · Write Data · Update Data · Delete Data

**Repositories never contain business logic.**

詳細: [`05_database_architecture.md`](./05_database_architecture.md) · [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

---

# Domain Layer

Contains business rules.

**Examples**

Consultation lifecycle · SOAP validation · Clinical note approval · Recording status · Permission checks

**Future**

Medical knowledge rules · Document generation rules

---

# Infrastructure Layer

Handles external systems.

**Examples**

OpenAI · Claude · Whisper · Storage · Email · Logging · Monitoring

**Infrastructure providers must be replaceable.**

詳細: [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Dependency Flow

```
Controller → Service → Repository → Database
```

**Never**: `Controller → Database`

Direct access is **prohibited**.

---

# Module Structure

```
src/
  modules/
    auth/
    patients/
    consultations/
    recording/
    transcript/
    soap/
    clinical-note/
    history/
    audit/
    settings/
  common/
  config/
  database/
  ai/
  shared/
```

Each module owns:

Controller · Service · Repository · DTO · Entity · Types · Tests

---

# AI Integration

Backend communicates with AI providers.

```
Transcript → AI Service → Structured Medical Data → SOAP → Clinical Note
```

**Frontend never communicates with AI directly.**

---

# Validation

Every request must be validated.

**Validation Layers**

Request Validation · Business Validation · Database Validation · Medical Validation

**No invalid data should reach the database.**

---

# Authentication Flow

```
Login → JWT → Protected Route → Role Check → Business Logic → Response
```

詳細: [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Authorization

| Role | Version 0.1 |
|------|-------------|
| Admin | ✓ |
| Physician | ✓ |
| Assistant | ✓ |
| ReadOnly | ✓ |

**Every endpoint must define allowed roles.**

---

# Logging

Every request logs:

Request ID · User · Endpoint · Execution Time · Status · Error · Consultation ID

Logs must support **future observability**.

詳細: [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Exception Handling

**Global Exception Filter**

Validation Errors · Authentication Errors · Business Errors · Database Errors · AI Errors · Unexpected Errors

**All errors return standardized responses.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Transaction Management

Database transactions are required for:

Consultation Creation · SOAP Save · Clinical Note Save · Revision Save · Audit Log Save

**Data consistency is mandatory.**

---

# Background Jobs

**Version 0.1**: Simple asynchronous processing

**Future**: Queue System — BullMQ · Redis · RabbitMQ

Heavy AI tasks should eventually move to **background workers**.

---

# Configuration

**Environment Variables**

Database URL · JWT Secret · OpenAI API Key · Claude API Key · Storage Credentials · Logging Level · Feature Flags

**Secrets must never be hardcoded.**

---

# Security

HTTPS Only · JWT Authentication · Role Validation · Rate Limiting · Input Sanitization · Output Validation · Audit Logging · Secure Headers

詳細: [`19_security.md`](./19_security.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Performance Goals

| Operation | Target |
|-----------|--------|
| Authentication | < 200ms |
| Database Query | < 100ms |
| SOAP Generation Request | < 10 sec |
| Clinical Note Request | < 10 sec |
| History Search | < 500ms |

---

# Future Architecture

**Microservices are NOT required.**

Version 0.1 remains **Modular Monolith**.

**Future** (if needed): Auth Service · AI Service · Notification Service · Analytics Service

---

# Core Principle

The backend exists to **protect business rules**.

AI providers may change. Databases may change. Frontend may change.

**Business rules must remain stable.**

Medical OS should always be driven by **domain logic**—not by frameworks or AI vendors.

---

# 関連

| 内容 | ファイル |
|------|----------|
| System Architecture | [`01_architecture.md`](./01_architecture.md) |
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| API Specification | [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) |
| Database Architecture | [`05_database_architecture.md`](./05_database_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| Cursor Backend Rules | [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) |
| 次章 | [`04_ai_architecture.md`](./04_ai_architecture.md) |
