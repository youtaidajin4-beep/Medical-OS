# Cursor Rules
# 15 — Deployment Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`14_performance_rules.md`](./14_performance_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) · [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) · [`09_testing_rules.md`](./09_testing_rules.md) · [`13_security_rules.md`](./13_security_rules.md) · [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md)

> **優先順位**: デプロイ・リリース準備時は本書 + [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) + [`13_security_rules.md`](./13_security_rules.md)。System Design 詳細 → [`11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)

> **要確認**: ホスティング選定（Railway / Render / Cloud Run 等）· モノレポ初期化 · Git / CI 未設定 — [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Purpose

This document defines **how Cursor should prepare, deploy, and release** Medical OS.

Deployment is **not merely uploading code**.

Deployment is the **controlled transition from development to physician use**.

Medical software requires **predictable deployments** with **rapid rollback capability**.

---

# Deployment Philosophy

Deploy: **Small · Frequently · Safely**

Every deployment should improve the product while **minimizing risk**.

**No deployment should interrupt physician workflow.**

---

# Environment Strategy

Medical OS uses **four environments**:

```
Local → Development → Staging → Production
```

**Each environment has an independent configuration.**

詳細: [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)

---

# Local Environment

## Purpose

Developer productivity.

## Requirements

Docker · Local PostgreSQL · Local Storage (MinIO) · Mock AI (Optional) · Local Environment Variables

Everything should start with:

```bash
pnpm dev
```

or

```bash
docker compose up
```

**要確認**: パッケージマネージャ（pnpm / npm）— モノレポ確定時に [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) と統合

---

# Development Environment

## Purpose

Feature development.

## Characteristics

Debug Enabled · Sample Data · Development API Keys · Verbose Logging · Fast Iteration

**No production patient data.**

---

# Staging Environment

## Purpose

Acceptance testing.

**Mirror Production.**

Includes: Production Database Schema · Production Infrastructure · Production AI Providers · Production Authentication · **Anonymized Test Data**

**Used for physician testing before release.**

---

# Production Environment

## Purpose

Real physician usage.

## Requirements

HTTPS · Encrypted Storage · Monitoring · Logging · Backups · Health Checks · Automatic Recovery

詳細: [`13_security_rules.md`](./13_security_rules.md)

---

# Deployment Pipeline

```
Developer → Git Push → GitHub → GitHub Actions → Lint → Type Check → Unit Tests → Integration Tests → Build → Docker Image → Deploy Staging → Acceptance Test → Manual Approval → Deploy Production
```

---

# CI Rules

Every Pull Request must pass:

TypeScript · ESLint · Unit Tests · Integration Tests · Build

**If any step fails, deployment stops.**

詳細: [`09_testing_rules.md`](./09_testing_rules.md) · [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

---

# CD Rules

Deployment to Production requires:

```
Successful Staging → Manual Approval → Health Check → Deployment → Verification → Monitoring
```

**Automatic deployment directly from feature branches is prohibited.**

---

# Docker Rules

Each service has its own image.

Example: `frontend` · `backend` · `database` · `monitoring`

**Containers should be stateless whenever possible.**

---

# Health Checks

Every deployment verifies:

API · Database · Storage · Authentication · AI Provider

**Failure prevents rollout.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) — Health Checks

---

# Blue-Green Deployment

**Future Target:**

```
Blue Environment → Health Verification → Traffic Switch → Green Environment → Rollback if Necessary
```

**Version 0.1 may use Rolling Deployment.**

---

# Rolling Deployment

Requirements:

```
No Downtime → Session Preservation → Health Verification → Completion
```

**Existing physician sessions must continue uninterrupted.**

---

# Rollback Rules

Rollback triggers: Critical Error · Health Failure · High Error Rate · Authentication Failure · Database Failure

**Rollback must restore the previous stable version.**

詳細: [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) — Revert Strategy

---

# Versioning

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

Examples: `0.1.0` · `0.1.1` · `0.2.0` · `1.0.0`

**Every deployment receives a version number.**

詳細: [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) · [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# Release Checklist

Before Production:

Architecture Verified · Tests Passed · Documentation Updated · Migration Verified · Environment Variables Verified · Health Checks Passing · Rollback Prepared · Monitoring Enabled

詳細: [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) · [`12_code_review_rules.md`](./12_code_review_rules.md)

---

# Database Migration

```
Schema Update → Migration Generation → Migration Review → Staging Test → Backup → Production Migration
```

**Never modify production schema manually.**

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# Secrets

**Never commit:** API Keys · JWT Secrets · Database Passwords · Cloud Credentials

Use: **Environment Variables · Cloud Secret Manager · GitHub Secrets**

詳細: [`13_security_rules.md`](./13_security_rules.md)

---

# Monitoring After Deployment

Monitor:

CPU · Memory · API Latency · Database · Storage · AI Latency · Authentication · Error Rate · **Medical Workflow Completion**

詳細: [`14_performance_rules.md`](./14_performance_rules.md) · [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Incident Response

```
Deployment Failure → Automatic Rollback → Notify Team → Investigate → Fix → Redeploy
```

**Never continue running an unstable production system.**

---

# Deployment Logging

Record: Version · Deployment Time · Commit Hash · Author · Environment · Duration · Status · Rollback Status

**Every deployment should be fully traceable.**

---

# Infrastructure as Code

**Future**: Terraform → Infrastructure Versioning → Automated Provisioning → Disaster Recovery

**Version 0.1 may use manually managed infrastructure.**

---

# Disaster Recovery

## Database Failure

```
Restore Backup → Reconnect → Verify → Resume Service
```

## Storage Failure

```
Retry → Restore → Resume
```

**Patient workflow takes priority.**

詳細: [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

---

# Future Deployment

Multi-region · Auto Scaling · Kubernetes · Canary Release · Feature Flags · AI Gateway · Service Mesh

**These belong after Product Market Fit.**

---

# Deployment Checklist

Before deployment, Cursor should verify:

Tests Passed · Lint Passed · Documentation Updated · Migration Safe · Secrets Configured · Monitoring Enabled · Rollback Available · Health Checks Ready

---

# Core Principle

**Deployment is a medical event.**

Every deployment affects physicians, and physicians affect patients.

**Release software with the same discipline expected in clinical practice.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Deployment Architecture | [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) |
| Git Workflow Rules | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Security Rules | [`13_security_rules.md`](./13_security_rules.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| MVP Goal | [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) |
| Technology Stack | [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| Final Checklist | [`16_final_checklist.md`](./16_final_checklist.md) |
| 次章 | [`16_final_checklist.md`](./16_final_checklist.md) |
