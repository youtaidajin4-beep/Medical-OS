# System Architecture
# 01 — System Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md)  
MVP 仕様: [`../04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/)

Cursor 架構ルール: [`../06_CURSOR_RULES/03_architecture_rules.md`](../06_CURSOR_RULES/03_architecture_rules.md)

> **要確認**: デプロイ先・AI プロバイダの最終選定は関係者確認後。本書は v1.0 設計方針として記載。

---

# Purpose

This document defines the **overall architecture** of Medical OS Version 0.1.

It describes how every system component interacts.

This is the **highest-level technical design document**.

Every implementation should follow this architecture.

---

# Design Philosophy

Medical OS should be:

- Simple
- Modular
- Scalable
- Replaceable
- Observable
- Secure

**Every layer should have one responsibility.**

---

# High-Level Architecture

```
                    Physician
                        │
                        ▼
               React Frontend (Next.js)
                        │
             HTTPS / REST API / JWT
                        │
                        ▼
             Backend API (NestJS)
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
 Authentication   AI Pipeline      Database Layer
                        │
         Whisper / GPT / Claude
                        │
                        ▼
                 PostgreSQL
                        │
                        ▼
                  Object Storage
                (Recorded Audio)
```

---

# Layer Structure

```
Presentation Layer
    ↓
Application Layer
    ↓
Business Logic Layer
    ↓
AI Layer
    ↓
Persistence Layer
    ↓
Infrastructure Layer
```

---

# Presentation Layer

| Item | Value |
|------|-------|
| Technology | Next.js · React · TypeScript · Tailwind CSS · shadcn/ui |

**Responsibilities**

User Interface · Routing · State Management · Clipboard · Authentication · API Communication

**Never contains business logic.**

詳細: [`../04_MVP_SPECIFICATION/05_screen_specification.md`](../04_MVP_SPECIFICATION/05_screen_specification.md) · [`../04_MVP_SPECIFICATION/06_component_specification.md`](../04_MVP_SPECIFICATION/06_component_specification.md)

---

# Backend Layer

| Item | Value |
|------|-------|
| Technology | NestJS · TypeScript |

**Responsibilities**

REST API · Authentication · Authorization · Validation · AI Orchestration · Database Access · Logging · Audit · Business Rules

詳細: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# AI Layer

**Responsibilities**

```
Speech Recognition → Medical Extraction → Validation
    → Structured Medical Data → SOAP → Clinical Note
```

**AI Layer never communicates directly with the frontend.**

Everything passes through Backend APIs.

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`18_prompt_library.md`](./18_prompt_library.md)

---

# Database Layer

| Item | Value |
|------|-------|
| Technology | PostgreSQL |

**Stores**

Users · Patients · Consultations · SOAP · Clinical Notes · Transcript · Medical Data · Audit Logs · Settings

詳細: [`05_database_architecture.md`](./05_database_architecture.md) · [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

---

# Storage Layer

**Purpose**: Store uploaded audio.

| Item | Value |
|------|-------|
| Technology | AWS S3 or Cloudflare R2 |

**Future**: Encrypted object storage · Temporary storage · Automatic deletion

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Authentication Layer

- JWT
- Refresh Token
- Role-Based Access Control

**Future**: OAuth · Passkey · SSO

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# AI Providers

**Version 0.1**

| Function | Provider |
|----------|----------|
| Speech Recognition | Whisper |
| LLM | OpenAI GPT · Claude · Gemini |

**The provider should be replaceable.**

Medical OS must **never depend on one AI vendor**.

---

# Request Flow

```
Frontend → Backend → Authentication → Validation
    → Business Logic → AI Pipeline → Database → Response
```

---

# Consultation Flow

```
Recording → Upload → Speech Recognition → Transcript
    → Medical Extraction → Structured Medical Data
    → SOAP → Clinical Note → Review → Save → Copy
```

詳細: [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md)

---

# Logging Flow

Every request logs:

User · Endpoint · Execution Time · Status · Error · Consultation ID · Request ID

---

# Security Flow

```
Request → JWT Verification → Role Verification → Input Validation
    → Business Logic → Database → Audit Log → Response
```

詳細: [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`19_security.md`](./19_security.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Scalability

```
Version 0.1  → Single Clinic
Version 1    → Multiple Clinics
Version 2    → Regional Healthcare
Version 3    → National Platform
```

Architecture should require **minimal changes** when scaling.

---

# Folder Structure

```
apps/
  frontend/
  backend/
packages/
  ui/
  types/
  shared/
services/
  ai/
  database/
docs/
```

---

# Service Architecture

| Service | Responsibility |
|---------|----------------|
| Authentication Service | Auth |
| Patient Service | Patients |
| Consultation Service | Consultations |
| Recording Service | Audio |
| Transcript Service | STT output |
| AI Service | Extraction & generation |
| SOAP Service | SOAP |
| Clinical Note Service | Clinical notes |
| History Service | History |
| Audit Service | Audit logs |
| Settings Service | Settings |

**Every service has one responsibility.**

---

# Deployment

| Component | Options |
|-----------|---------|
| Frontend | Vercel |
| Backend | Railway · Render · AWS ECS |
| Database | Supabase PostgreSQL · AWS RDS |
| Storage | Cloudflare R2 · AWS S3 |

詳細: [`11_deployment_architecture.md`](./11_deployment_architecture.md)

# Observability

- Integrated Logging
- Performance Metrics
- Health Checks
- AI Processing Metrics
- Database Monitoring
- API Monitoring

**Future**: OpenTelemetry · Prometheus · Grafana

---

# Architecture Principles

- Frontend **never** accesses database.
- AI **never** accesses database directly.
- Frontend **never** calls AI directly.
- Database **never** contains business logic.
- Every layer is **replaceable**.
- Every service is **independently testable**.

---

# Future Expansion

FHIR Layer · HL7 Layer · Hospital Integration · Medical Knowledge Graph · Medical Timeline · Clinical Intelligence Engine

These should plug into the architecture **without redesign**.

---

# Core Principle

Medical OS is built as a **platform**—not a prototype.

Every architectural decision should support **ten years of evolution** while keeping Version 0.1 as **simple as possible**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| AI Architecture | [`04_ai_architecture.md`](./04_ai_architecture.md) |
| Database Architecture | [`05_database_architecture.md`](./05_database_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| AI Workflow Architecture | [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) |
| AI Service Architecture | [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) |
| Authentication Architecture | [`09_authentication_architecture.md`](./09_authentication_architecture.md) |
| Storage Architecture | [`10_storage_architecture.md`](./10_storage_architecture.md) |
| Deployment Architecture | [`11_deployment_architecture.md`](./11_deployment_architecture.md) |
| Logging And Observability | [`12_logging_and_observability.md`](./12_logging_and_observability.md) |
| Development Standards | [`13_development_standards.md`](./13_development_standards.md) |
| Project Directory Structure | [`14_project_directory_structure.md`](./14_project_directory_structure.md) |
| Technology Stack | [`15_technology_stack.md`](./15_technology_stack.md) |
| Development Roadmap | [`16_development_roadmap.md`](./16_development_roadmap.md) |
| API 索引 | [`17_api_design.md`](./17_api_design.md) |
| プロンプト | [`18_prompt_library.md`](./18_prompt_library.md) |
| セキュリティ索引 | [`19_security.md`](./19_security.md) |
| 次章 | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| MVP Database Design | [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) |
| MVP AI Pipeline | [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) |
