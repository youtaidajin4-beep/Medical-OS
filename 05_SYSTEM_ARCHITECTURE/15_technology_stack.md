# System Architecture
# 15 — Technology Stack

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`14_project_directory_structure.md`](./14_project_directory_structure.md)

関連: [`02_frontend_architecture.md`](./02_frontend_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md) · [`04_ai_architecture.md`](./04_ai_architecture.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md) · [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

> **要確認**: STT / LLM / クラウド / バックエンドホスティング — [`02_decision_log.md`](../07_ROADMAP/02_decision_log.md) で未確定。本書は **v1.0 公式スタック（提案）** として記載。

---

# Purpose

This document defines the **official technology stack** for Medical OS Version 0.1.

Every technology choice should support the product philosophy:

Simple · Reliable · Scalable · Replaceable · Developer-friendly · Medical-grade

The stack should allow **rapid iteration during PMF** while remaining suitable for future enterprise deployment.

---

# Technology Philosophy

| Rule | Meaning |
|------|---------|
| Choose boring technology | Proven over trendy |
| Choose proven technology | Wide adoption |
| Choose understandable technology | Developer productivity |
| No experimental frameworks | Medical OS must not depend on experiments |

---

# Overall Stack

```
Frontend → Backend → AI → Database → Storage → Infrastructure → Monitoring
```

---

# Frontend

| Category | Technology |
|----------|------------|
| Framework | **Next.js 15** |
| Language | **TypeScript** |
| UI | **React 19** |
| Styling | **TailwindCSS** |
| Component Library | **shadcn/ui** |
| Icons | **Lucide React** |
| Forms | **React Hook Form** |
| Validation | **Zod** |
| State | **Zustand** |
| Server State | **TanStack Query** |
| Animation | Framer Motion (Minimal) |
| Charts (Future) | Recharts |

詳細: [`02_frontend_architecture.md`](./02_frontend_architecture.md)

---

# Backend

| Category | Technology |
|----------|------------|
| Framework | **NestJS** |
| Language | **TypeScript** |
| Runtime | **Node.js 22+** |
| Validation | **Zod** |
| ORM | **Prisma** |
| Authentication | **JWT** |
| Password Hash | **Argon2id** |
| Logging | **Pino** |
| Testing | **Jest** |

詳細: [`03_backend_architecture.md`](./03_backend_architecture.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md)

---

# AI

| Category | Technology | Status |
|----------|------------|--------|
| Speech Recognition | OpenAI Whisper API | **要確認** |
| Primary LLM | OpenAI GPT | **要確認** |
| Alternative | Claude · Gemini | **要確認** |
| Prompt Management | Internal Prompt Manager | v1.0 |
| Schema Validation | Zod · JSON Schema | v1.0 |

**Future**: OpenRouter · Self-hosted Models · vLLM · Ollama

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) · [`18_prompt_library.md`](./18_prompt_library.md)

---

# Database

| Category | Technology |
|----------|------------|
| Primary | **PostgreSQL** |
| ORM | **Prisma** |
| Migration | **Prisma Migrate** |
| Backup | Automated Daily Backup |

**Future**: Read Replica · Partitioning

詳細: [`05_database_architecture.md`](./05_database_architecture.md)

---

# Storage

| Option | Status |
|--------|--------|
| **Primary** | Cloudflare R2 — **要確認** |
| Alternative | AWS S3 |
| Local Development | MinIO |

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Authentication

JWT · Refresh Token · RBAC

**Future**: Passkey · OAuth · OpenID Connect · Hospital SSO

詳細: [`09_authentication_architecture.md`](./09_authentication_architecture.md)

---

# Frontend Libraries

TanStack Query · Zustand · React Hook Form · Zod · shadcn/ui · Lucide · date-fns · clsx · tailwind-merge

---

# Backend Libraries

NestJS · Prisma · Pino · Helmet · Compression · CORS · JWT · Passport · Class Transformer (Optional) · BullMQ (Future)

---

# Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package Manager |
| **TurboRepo** | Monorepo |
| **Prettier** | Formatter |
| **ESLint** | Lint |
| **Husky** | Git Hooks |
| **Commitlint** | Commit Validation |

詳細: [`13_development_standards.md`](./13_development_standards.md) · [`14_project_directory_structure.md`](./14_project_directory_structure.md)

---

# Testing

| Layer | Tool |
|-------|------|
| Unit Test | **Jest** |
| Frontend Testing | **React Testing Library** |
| End-to-End | **Playwright** |
| API Testing | **Supertest** |
| Performance (Future) | k6 |

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

---

# CI/CD

GitHub · GitHub Actions · Docker · Vercel · Railway · Render · AWS

**Future**: ArgoCD

詳細: [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Monitoring

| Category | Technology |
|----------|------------|
| Logging | **Pino** |
| Error Tracking | **Sentry** — **要確認** |
| Metrics (Future) | Prometheus |
| Dashboard (Future) | Grafana |
| Tracing (Future) | OpenTelemetry |

詳細: [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Infrastructure

| Component | Technology |
|-----------|------------|
| Container | **Docker** |
| Reverse Proxy | **Nginx** |
| CDN | **Cloudflare** |
| DNS | **Cloudflare** |
| SSL | **Let's Encrypt** |

詳細: [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Local Development

**Docker Compose**: PostgreSQL · MinIO · Backend · Frontend · Optional Local AI

**One command should start the full development environment.**

---

# Environment Management

`.env.local` · `.env.development` · `.env.staging` · `.env.production`

**Secrets**: GitHub Secrets · Cloud Provider Secrets

**Never commit secrets.**

---

# Browser Support

Chrome · Edge · Safari · Firefox

| Priority | Support |
|----------|---------|
| Desktop | **First** |
| Tablet | Supported |
| Mobile | Optional |

---

# Coding Standards

Strict TypeScript · ESLint · Prettier · Husky · Commitlint · Conventional Commits

**All repositories follow the same standards.**

詳細: [`13_development_standards.md`](./13_development_standards.md)

---

# Future Technologies

Redis · BullMQ · Kafka · Kubernetes · Terraform · FHIR Server · OpenSearch · Medical Knowledge Graph

**These are intentionally excluded from Version 0.1.**

---

# Technology Selection Criteria

Before introducing a new dependency, ask:

| Question | Required |
|----------|----------|
| Is it actively maintained? | Yes |
| Is it widely adopted? | Yes |
| Does it reduce complexity? | Yes |
| Can it be replaced later? | Yes |
| Does it improve developer productivity? | Yes |

**If any answer is "No", do not add the dependency.**

---

# Approved Stack Summary

| Layer | Stack |
|-------|-------|
| Frontend | Next.js + React + TypeScript |
| Backend | NestJS + Prisma + PostgreSQL |
| AI | Whisper + GPT + Claude (Optional) — **要確認** |
| Storage | Cloudflare R2 — **要確認** |
| Infrastructure | Docker + Vercel + Railway — **要確認** |
| Testing | Jest + Playwright |
| Monitoring | Pino + Sentry — **要確認** |

---

# Core Principle

**Technology is not the product.**

The product is **physician workflow**.

Every technology decision should support:

Reliability · Maintainability · Medical Safety · Long-term evolution

**Technology may change. The architecture should not.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| AI Architecture | [`04_ai_architecture.md`](./04_ai_architecture.md) |
| Deployment Architecture | [`11_deployment_architecture.md`](./11_deployment_architecture.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| 次章 | [`16_development_roadmap.md`](./16_development_roadmap.md) |
