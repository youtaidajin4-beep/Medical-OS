# System Architecture
# 11 — Deployment Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`10_storage_architecture.md`](./10_storage_architecture.md)

関連: [`01_architecture.md`](./01_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md) · [`02_frontend_architecture.md`](./02_frontend_architecture.md) · [`10_storage_architecture.md`](./10_storage_architecture.md) · [`06_backend_api_architecture.md`](./06_backend_api_architecture.md)

Cursor Git ワークフロー: [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md)  
Cursor デプロイルール: [`../06_CURSOR_RULES/15_deployment_rules.md`](../06_CURSOR_RULES/15_deployment_rules.md)

---

# Purpose

This document defines how Medical OS Version 0.1 is **deployed**.

The deployment architecture should prioritize:

| Priority | Meaning |
|----------|---------|
| Reliability | Stable service for clinical use |
| Scalability | Support growth without redesign |
| Security | Secure infrastructure and secrets |
| Developer Productivity | Fast iteration |
| Cost Efficiency | Sustainable for early-stage deployment |

Version 0.1 should be **simple enough for rapid iteration** while supporting future growth.

---

# Deployment Philosophy

| Principle | Meaning |
|-----------|---------|
| Deploy often | Continuous improvement |
| Deploy safely | Tests · staging · approval |
| Rollback quickly | Minutes, not hours |
| Never interrupt physician workflow | Active consultations must survive deployment |

Medical software should evolve continuously **without disrupting clinical practice**.

---

# Environment Structure

```
Development → Staging → Production
```

**No development code should ever be deployed directly to Production.**

---

# Development Environment

| Field | Detail |
|-------|--------|
| Purpose | Local development |
| Frontend | Next.js |
| Backend | NestJS |
| Database | PostgreSQL (Docker) |
| Storage | Local Object Storage (MinIO) |
| AI | Local AI Provider — **要確認** |
| Features | Hot Reload Enabled |

---

# Staging Environment

| Field | Detail |
|-------|--------|
| Purpose | Integration testing |
| Goal | Mirror Production as closely as possible |

**Components**: Frontend · Backend · Database · Storage · AI Providers · Authentication · Logging · Monitoring

Used for **physician acceptance testing**.

---

# Production Environment

| Field | Detail |
|-------|--------|
| Purpose | Serve real physicians |

**Requirements**: High Availability · Secure Infrastructure · Encrypted Storage · Automatic Backups · Monitoring · Logging · Disaster Recovery

---

# Infrastructure Overview

```
Users
    ↓
Vercel (Frontend)
    ↓
NestJS API
    ↓
PostgreSQL
    ↓
Object Storage
    ↓
AI Providers
    ↓
Monitoring
```

---

# Frontend Hosting

| Field | Detail |
|-------|--------|
| Platform | **Vercel** |
| Responsibilities | Next.js Hosting · CDN · HTTPS · Automatic Deployments · Preview Deployments |

**Future**: Self-hosted Kubernetes

詳細: [`02_frontend_architecture.md`](./02_frontend_architecture.md)

---

# Backend Hosting

| Option | Status |
|--------|--------|
| Railway | Candidate |
| Render | Candidate |
| AWS ECS | Candidate |
| Google Cloud Run | Candidate |
| Azure Container Apps | Candidate |

**Preferred**: Dockerized Deployment — **要確認**

詳細: [`03_backend_architecture.md`](./03_backend_architecture.md)

---

# Database Hosting

| Option | Status |
|--------|--------|
| **Supabase PostgreSQL** | Preferred |
| AWS RDS | Alternative |

**Future**: High Availability PostgreSQL Cluster · Automatic Failover

詳細: [`05_database_architecture.md`](./05_database_architecture.md)

---

# Object Storage

| Option | Status |
|--------|--------|
| **Cloudflare R2** | Preferred |
| AWS S3 | Alternative |

**Future**: Encrypted Regional Storage · Lifecycle Policies

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Environment Variables

## Frontend

`NEXT_PUBLIC_API_URL`

## Backend

`DATABASE_URL` · `JWT_SECRET` · `OPENAI_API_KEY` · `ANTHROPIC_API_KEY` · `GOOGLE_API_KEY` · `R2_ACCESS_KEY` · `R2_SECRET_KEY` · `R2_BUCKET` · `LOG_LEVEL` · `APP_ENV`

**Secrets must never be committed to Git.**

**要確認**: STT/LLM プロバイダー選定後に変数名を確定 — [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# CI/CD Pipeline

```
Developer Push → GitHub → GitHub Actions
    → Run Tests → Lint → Build → Deploy Staging
    → Acceptance Tests → Manual Approval → Deploy Production
```

---

# Build Pipeline

```
Install Dependencies → Type Check → Lint → Unit Tests
    → Build → Integration Tests → Docker Build → Deploy
```

---

# Docker Architecture

| Service | Image |
|---------|-------|
| Frontend | `frontend:latest` |
| Backend | `backend:latest` |
| Database | `postgres` |
| Storage | External Object Storage |
| Monitoring | Separate Container — **Future** |

---

# Release Strategy

**Version**: Semantic Versioning

| Type | Example | Meaning |
|------|---------|---------|
| Patch | 0.1.1 | Bug Fix |
| Minor | 0.2.0 | Feature |
| Major | 1.0.0 | Breaking Changes |

---

# Rollback Strategy

```
Deployment → Health Check → Failure Detected
    → Automatic Rollback → Previous Version → Notify Developers
```

Rollback should complete **within minutes**.

---

# Monitoring

Monitor: API Latency · Database Health · Storage Usage · AI Latency · CPU · Memory · Disk · Network · Active Users · Recording Success · SOAP Success · Clinical Note Success

詳細: [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Logging

Application Logs · AI Logs · Database Logs · Audit Logs · Security Logs · Deployment Logs

**All logs centralized.**

---

# Health Checks

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/health` | Overall |
| `/api/v1/health/database` | Database |
| `/api/v1/health/storage` | Object Storage |
| `/api/v1/health/ai` | AI Providers |

Health checks should run **continuously**.

詳細: [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Backup Strategy

| Target | Frequency | Retention |
|--------|-----------|-----------|
| Database | Daily | 30 Days |
| Object Storage | Weekly | 30 Days |
| Configuration | Git | — |
| Infrastructure | IaC (Future) | — |

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Disaster Recovery

## Database Failure

```
Restore Backup → Reconnect Backend → Verify Integrity → Resume Service
```

## Storage Failure

```
Retry → Restore Backup → Reprocess Audio if Needed
```

Recovery should prioritize **patient safety** and **consultation continuity**.

---

# Zero Downtime Deployment

| Version | Strategy |
|---------|----------|
| **Target (Future)** | Blue-Green Deployment |
| **Version 0.1** | Rolling Deployment |

**Existing consultations must never be interrupted during deployment.**

---

# Observability

| Component | Technology |
|-----------|------------|
| Metrics | Prometheus (Future) |
| Visualization | Grafana (Future) |
| Tracing | OpenTelemetry (Future) |
| Alerts | Email · Slack · PagerDuty (Future) |

---

# Security During Deployment

HTTPS Only · Secure Environment Variables · Private Networks · Least Privilege IAM · Container Image Scanning · Dependency Vulnerability Scanning · Secret Rotation

詳細: [`19_security.md`](./19_security.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Future Infrastructure

Kubernetes · Multi-region Deployment · Auto Scaling · Redis · BullMQ · CDN Optimization · AI Gateway · Service Mesh · Global Load Balancer

**These are intentionally excluded from Version 0.1.**

---

# Deployment Principles

- Deploy Frequently
- Deploy Safely
- Rollback Quickly
- Monitor Continuously
- **Never Interrupt Physicians**

Every deployment should improve the product **without affecting patient care**.

---

# Core Principle

Deployment is **not the end of development**.

Deployment is the **beginning of real-world learning**.

Every release should bring Medical OS closer to becoming the **trusted operating system for medical information**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| System Architecture | [`01_architecture.md`](./01_architecture.md) |
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Storage Architecture | [`10_storage_architecture.md`](./10_storage_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| MVP Test Plan | [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) |
| Cursor Git Workflow Rules | [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md) |
| Cursor Deployment Rules | [`../06_CURSOR_RULES/15_deployment_rules.md`](../06_CURSOR_RULES/15_deployment_rules.md) |
| 次章 | [`12_logging_and_observability.md`](./12_logging_and_observability.md) |
