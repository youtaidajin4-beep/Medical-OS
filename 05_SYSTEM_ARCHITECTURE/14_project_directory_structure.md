# System Architecture
# 14 — Project Directory Structure

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`13_development_standards.md`](./13_development_standards.md)

関連: [`13_development_standards.md`](./13_development_standards.md) · [`02_frontend_architecture.md`](./02_frontend_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Purpose

This document defines the **complete directory structure** of Medical OS.

The goal is to make the project immediately understandable by both **developers** and **AI coding assistants**.

| Principle | Meaning |
|-----------|---------|
| One file | One clear responsibility |
| Locate fast | Any implementation within seconds |

---

# Design Principles

The project should be:

Simple · Scalable · Modular · Predictable

**Every directory represents a domain—not a technology.**

---

# Overall Structure

```text
medical-os/

├── apps/
│   ├── frontend/
│   └── backend/
│
├── packages/
│   ├── ui/
│   ├── shared/
│   ├── types/
│   ├── medical/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── terraform/
│   └── scripts/
│
├── docs/
│
├── .github/
│
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
└── README.md
```

**要確認**: モノレポ初期化済み（`apps/frontend`, `apps/backend`, `packages/`）。Docker 起動後 `pnpm db:push && pnpm db:seed` で DB 初期化。

---

# Apps

`apps/` contains **executable applications**.

```text
apps/
  frontend/
  backend/
```

**No shared code belongs here.**

---

# Frontend Structure

```text
frontend/
  app/
  components/
  features/
  hooks/
  providers/
  services/
  stores/
  styles/
  types/
  utils/
  assets/
  public/
```

詳細: [`02_frontend_architecture.md`](./02_frontend_architecture.md)

---

# Backend Structure

```text
backend/
  src/
    modules/
    common/
    config/
    database/
    providers/
    middleware/
    guards/
    filters/
    interceptors/
    decorators/
    types/
    utils/
  main.ts
```

詳細: [`03_backend_architecture.md`](./03_backend_architecture.md)

---

# Backend Modules

```text
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
  health/
```

Each module owns:

Controller · Service · Repository · DTO · Entity · Tests

---

# AI Structure

```text
providers/
  ai/
    adapters/
    prompts/
    schemas/
    pipelines/
    validators/
    models/
```

Example:

```text
providers/ai/
  adapters/
    openai.adapter.ts
    claude.adapter.ts
    gemini.adapter.ts
  prompt-manager.ts
  clinical-extractor.ts
  soap-generator.ts
  clinical-note-generator.ts
  validator.ts
```

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) · [`18_prompt_library.md`](./18_prompt_library.md)

---

# Database

```text
database/
  schema/
  migrations/
  seed/
  prisma/
```

Example:

```text
database/
  schema.prisma
  migrations/
  seed.ts
```

詳細: [`05_database_architecture.md`](./05_database_architecture.md)

---

# Shared Packages

`packages/` contains **reusable code**.

```text
packages/
  ui/
  shared/
  types/
  medical/
  config/
```

---

# packages/ui

Reusable UI components.

```text
ui/
  button/
  card/
  dialog/
  input/
  table/
  toast/
  icons/
```

---

# packages/shared

Shared utilities.

```text
shared/
  constants/
  helpers/
  validation/
  logger/
```

---

# packages/types

Shared TypeScript types.

```text
types/
  api/
  database/
  medical/
  ai/
  common/
```

---

# packages/medical

Medical domain knowledge.

```text
medical/
  soap/
  terminology/
  templates/
  clinical-rules/
```

**Future**: FHIR · HL7 · SNOMED · ICD · LOINC

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# packages/config

Shared configuration.

```text
config/
  eslint/
  prettier/
  typescript/
  tailwind/
  jest/
```

---

# Documentation

## 現在のリポジトリ（ドキュメントフェーズ v1.0）

仕様書は**リポジトリルート**に配置している。

```text
Medical OS Project/
├── 00_PRODUCT_CONSTITUTION.md
├── 01_MEDICAL_DOMAIN_BIBLE/
├── 02_PRODUCT_BIBLE/
├── 03_USER_RESEARCH/
├── 04_MVP_SPECIFICATION/
├── 05_SYSTEM_ARCHITECTURE/     ← System Design（本書含む）
├── 06_CURSOR_RULES/
│   ├── README.md
│   ├── 01_global_rules.md
│   ├── 02_code_generation_rules.md
│   ├── 03_architecture_rules.md
│   ├── 04_ai_development_rules.md
│   ├── 05_frontend_rules.md
│   ├── 06_backend_rules.md
│   ├── 07_database_rules.md
│   ├── 08_ai_prompt_rules.md
│   ├── 09_testing_rules.md
│   ├── 10_git_workflow_rules.md
│   ├── 11_documentation_rules.md
│   ├── 12_code_review_rules.md
│   ├── 13_security_rules.md
│   ├── 14_performance_rules.md
│   ├── 15_deployment_rules.md
│   └── 16_final_checklist.md
├── 07_ROADMAP/
├── prototypes/
└── README.md
```

## 将来（コード着手後 — 要確認）

```text
docs/
  00_PRODUCT_CONSTITUTION.md
  01_MEDICAL_DOMAIN_BIBLE/
  02_PRODUCT_BIBLE/
  03_USER_RESEARCH/
  04_MVP_SPECIFICATION/
  05_SYSTEM_ARCHITECTURE/
  06_CURSOR_RULES/
  07_ROADMAP/
  08_API_REFERENCE/          ← OpenAPI 等
  09_CHANGELOG/
```

**要確認**: `docs/` サブフォルダへ移行するか、ルート維持するか — コードモノレポ追加時に決定

---

# Tests

```text
tests/
  unit/
  integration/
  e2e/
  fixtures/
  mocks/
```

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`13_development_standards.md`](./13_development_standards.md)

---

# Public Assets

```text
public/
  logo/
  icons/
  images/
  manifest.json
  favicon.ico
```

---

# Infrastructure

```text
infrastructure/
  docker/
  terraform/
  github-actions/
  monitoring/
  backup/
```

詳細: [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Environment Files

```text
.env.local
.env.development
.env.staging
.env.production
```

**Never commit secrets.**

詳細: [`11_deployment_architecture.md`](./11_deployment_architecture.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md)

---

# Naming Convention

| Kind | Convention |
|------|------------|
| Directories | kebab-case |
| Files | kebab-case |
| Components | PascalCase |
| Hooks | camelCase |
| Services | PascalCase |
| DTO | PascalCase |
| Entities | PascalCase |

詳細: [`13_development_standards.md`](./13_development_standards.md)

---

# Module Template

Every backend module follows:

```text
patients/
  patients.controller.ts
  patients.service.ts
  patients.repository.ts
  patients.module.ts
  patients.dto.ts
  patients.entity.ts
  patients.spec.ts
```

**Every module looks identical.**

---

# Import Rules

## Allowed

```
Feature → Shared → Common
```

## Forbidden

| Pattern | Reason |
|---------|--------|
| Feature A → Feature B (internal files) | Coupling |
| — | Modules communicate through **Services** only |

---

# Future Directories

```text
analytics/
billing/
notifications/
timeline/
knowledge-graph/
referrals/
certificates/
medical-memory/
ai-evaluation/
```

**These remain excluded from Version 0.1.**

---

# Monorepo

Medical OS uses a **Monorepo**.

**Benefits**: Shared Types · Shared UI · Shared Validation · Shared Medical Models · Single Version Control · Simple Deployment

**Stack**: pnpm workspace · Turborepo — **要確認**

---

# Repository Standards

Root contains only:

Configuration · Infrastructure · Documentation · Applications · Packages

**No business logic should exist in the repository root.**

---

# Core Principle

A new engineer should understand the entire project **within one hour**.

A new AI coding assistant should understand the structure **within one prompt**.

The directory structure is **part of the architecture**.

**Confusing folders create confusing software.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Development Standards | [`13_development_standards.md`](./13_development_standards.md) |
| Frontend Architecture | [`02_frontend_architecture.md`](./02_frontend_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Deployment Architecture | [`11_deployment_architecture.md`](./11_deployment_architecture.md) |
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
| 次章 | [`15_technology_stack.md`](./15_technology_stack.md) |
