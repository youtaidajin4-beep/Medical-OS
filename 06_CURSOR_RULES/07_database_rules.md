# Cursor Rules
# 07 — Database Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`06_backend_rules.md`](./06_backend_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) · [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) · [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

> **優先順位**: DB / Prisma / マイグレーション実装時は本書 + [`01_global_rules.md`](./01_global_rules.md) + [`06_backend_rules.md`](./06_backend_rules.md)。System Design 詳細 → [`05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md)

> **要確認**: MVP Database Design（論理 ER）と System Database Architecture の差分 — TranscriptSegments・AIExecutions 等。Prisma スキーマ統合時に確定。

---

# Purpose

This document defines **how Cursor should design and implement the database layer** for Medical OS.

**The database is the permanent memory of Medical OS.**

It stores **medical facts**, not application behavior.

It must remain **stable** even if AI models, Frontend, Backend, or infrastructure change in the future.

---

# Database Philosophy

Medical OS stores:

```
Facts → Relationships → History → Versions
```

It does **NOT** store:

Business Logic · Workflow Decisions · Medical Judgement · Prompt Logic · UI State

---

# Primary Database

| Category | Technology |
|----------|------------|
| Engine | **PostgreSQL** |
| ORM | **Prisma ORM** |
| Migration | **Prisma Migrate** |
| Development | Docker PostgreSQL |
| Production | Managed PostgreSQL |

詳細: [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md)

---

# Single Source of Truth

**Structured Medical Data** is the canonical medical record inside Medical OS.

Everything else is generated from it.

```
Structured Medical Data → SOAP → Clinical Note → Referral Letter → Medical Certificate
```

**Never duplicate medical knowledge.**

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# Repository Rules

Repositories are the **only layer** allowed to communicate with Prisma.

## Allowed

```
Repository → Prisma
```

## Forbidden

```
Controller → Prisma
Service → Raw SQL
Frontend → Database
```

詳細: [`06_backend_rules.md`](./06_backend_rules.md)

---

# Table Design Rules

Every table should include:

`id` · `created_at` · `updated_at`

**Future**: `deleted_at`

Use **UUID** instead of auto-increment IDs.

---

# Naming Convention

| Item | Convention |
|------|------------|
| Tables | `snake_case` |
| Columns | `snake_case` |
| Primary Key | `id` |
| Foreign Key | `xxx_id` |

Examples: `patient_id` · `consultation_id` · `physician_id`

詳細: [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

---

# Relationships

Always define explicit relations.

```
Patient → Consultation → Transcript → Structured Medical Data → SOAP → Clinical Note
```

**Avoid orphan records.**

詳細: [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

---

# Foreign Keys

Use **foreign key constraints** whenever possible.

**Never rely only on application logic.**

**Database integrity is mandatory.**

---

# Versioning

**Never overwrite** SOAP · Clinical Notes · Structured Medical Data

**Always create new versions.**

```
Version 1 → Version 2 → Version 3 → Approved Version
```

**Medical history must remain reproducible.**

---

# Transactions

Use transactions for:

Consultation Creation · SOAP Save · Clinical Note Save · Approval · Revision Save · Audit Save

**Medical consistency is more important than speed.**

---

# Soft Delete

## Version 0.1

Avoid deleting important medical records.

**Preferred**: `status` · `archived`

**Future**: `deleted_at`

**Medical history should remain recoverable.**

---

# Index Rules

Always index:

Primary Keys · Foreign Keys · Patient ID · Consultation Date · Physician ID · Status · Frequently searched fields

**Avoid unnecessary indexes.**

---

# Search Rules

## Version 0.1

Simple SQL Search: Patient Name · Patient Code · Date

## Future

Full Text Search · Semantic Search · Medical Search

---

# JSON Usage

JSON is allowed only for:

Structured Medical Data · AI Metadata · Configuration

**Avoid storing relational data in JSON.**

**Prefer normalized tables.**

---

# Data Integrity

**Never allow:**

Consultation without Patient · SOAP without Consultation · Clinical Note without Consultation · Transcript without Consultation

**Every record must have a valid parent.**

---

# Constraints

Use: **NOT NULL · CHECK · UNIQUE · FOREIGN KEY**

**Database constraints protect medical integrity.**

---

# Migration Rules

**Never manually edit production schema.**

Always:

```
Update Prisma Schema → Generate Migration → Review Migration → Apply Migration → Test Migration
```

---

# Backup Rules

| Item | Policy |
|------|--------|
| Automatic Daily Backup | Enabled |
| Point-in-Time Recovery | Enabled |
| Retention | **30 Days** |

**Future**: Cross-region Backup · Recovery Testing

詳細: [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

---

# Sensitive Data

Encrypt or protect:

Patient Name · Phone Number · Birth Date · Medical Record · Transcript · SOAP · Clinical Notes

**Never expose database identifiers publicly.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Performance Rules

| Target | Goal |
|--------|------|
| Patient Search | **< 100ms** |
| Consultation Retrieval | **< 100ms** |
| SOAP Retrieval | **< 100ms** |
| History Search | **< 300ms** |

**Avoid premature optimization.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md)

---

# Audit Rules

Medical changes require history.

Track: **Before · After · Editor · Timestamp · Reason (Optional)**

**Never lose edit history.**

---

# AI Data Rules

## Store

Prompt Version · Model · Provider · Confidence · Warnings · Latency · Token Usage

## Never store

Chain of Thought · Hidden Reasoning · Internal AI deliberation

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Prisma Rules

Use: `findUnique()` · `findMany()` · `create()` · `update()` · `delete()` · `transaction()`

**Avoid raw SQL unless absolutely necessary.**

---

# Future Expansion

FHIR Resources · HL7 Messages · Knowledge Graph · Timeline · Dentistry · Pharmacy · Hospital Integration

**Current schema should support future additions without redesign.**

---

# Testing Rules

Every Repository requires:

Unit Tests · Migration Tests · Relationship Tests · Constraint Tests

**Medical data integrity must be verified automatically.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Forbidden

**Never:**

Store business logic · Store prompts · Store secrets · Duplicate medical facts · Disable foreign keys · Expose database schema · Use raw SQL unnecessarily

---

# Database Checklist

Before creating any table, Cursor should verify:

Correct normalization · Proper relationships · Indexes added · Constraints defined · Versioning supported · Audit support · Future extensibility · Medical integrity preserved

---

# Core Principle

**The database is the permanent memory of Medical OS.**

Medical documents may change. AI models may change. Software may change.

The stored medical facts must remain **trustworthy**, **recoverable**, and **understandable** for many years.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| MVP Database Design | [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) |
| Backend Rules | [`06_backend_rules.md`](./06_backend_rules.md) |
| Storage Architecture | [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md) |
| Security | [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) |
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
| 次章 | [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) |
