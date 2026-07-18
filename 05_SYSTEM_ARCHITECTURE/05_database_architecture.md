# System Architecture
# 05 — Database Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`04_ai_architecture.md`](./04_ai_architecture.md)

MVP 論理設計: [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

Cursor データベースルール: [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md)

> **要確認**: MVP Database Design（論理 ER）と本書（物理アーキテクチャ）の差分 — TranscriptSegments・AIExecutions・PromptVersions は System Design で追加。統合は Prisma スキーマ確定時。

---

# Purpose

This document defines the **database architecture** of Medical OS Version 0.1.

The database is designed around one principle:

**Medical OS stores medical knowledge—not medical documents.**

SOAP, Clinical Notes, Referral Letters, and every future document are generated from **structured medical information**.

The database should remain stable for many years, even as AI models and document types evolve.

---

# Design Principles

The database must be:

- Normalized · Extensible · Auditable · Traceable · Versioned · Secure

**No business logic belongs in the database.**

The database stores **facts**.

Applications generate **documents**.

---

# Core Architecture

```
Users → Patients → Consultations → Transcript
    → Structured Medical Data → Generated Documents
    → Revision History → Audit Logs
```

**Everything revolves around the Consultation.**

---

# Database Engine

| Item | Technology |
|------|------------|
| Primary Database | PostgreSQL |
| ORM | Prisma ORM |
| Migration | Prisma Migrate |
| Connection Pool | PgBouncer (Future) |

---

# Entity Overview

Users · Patients · Consultations · AudioFiles · TranscriptSegments · StructuredMedicalData · SOAPDocuments · ClinicalNotes · PromptVersions · AIExecutions · RevisionHistory · AuditLogs · Settings

---

# Primary Relationships

| From | To | Cardinality |
|------|-----|-------------|
| User | Consultations | 1 → Many |
| Patient | Consultations | 1 → Many |
| Consultation | Transcript Segments | 1 → Many |
| Consultation | Structured Medical Data | 1 → 1 |
| Consultation | SOAP Versions | 1 → Many |
| Consultation | Clinical Note Versions | 1 → Many |
| Consultation | AI Executions | 1 → Many |

---

# Users

**Purpose**: Authenticate physicians.

**Main Fields**

`id` · `email` · `password_hash` · `display_name` · `role` · `status` · `created_at` · `updated_at`

**Future**: Clinic · Department · Specialty · License Number

---

# Patients

**Purpose**: Patient master information.

**Main Fields**

`id` · `patient_code` · `name` · `birth_date` · `sex` · `phone` · `memo` · `created_at` · `updated_at`

**Future**: Insurance · Address · Emergency Contact

**Version 0.1**: 匿名化・模擬データ検証（Constitution）— **要確認**

---

# Consultations

**Purpose**: One encounter.

**Main Fields**

`id` · `patient_id` · `physician_id` · `status` · `started_at` · `ended_at` · `duration_seconds` · `created_at` · `updated_at`

**Status**

`Scheduled` · `Recording` · `Processing` · `Review` · `Completed` · `Archived`

---

# AudioFiles

**Purpose**: Store uploaded recordings.

**Fields**

`id` · `consultation_id` · `storage_path` · `duration` · `mime_type` · `size` · `delete_after_processing` · `created_at`

**Audio is not the permanent medical record.**

---

# Transcript Segments

**Purpose**: Store transcript incrementally.

**Fields**

`id` · `consultation_id` · `segment_index` · `speaker` · `text_raw` · `text_normalized` · `started_at_ms` · `ended_at_ms` · `confidence` · `created_at`

**Why segmented?**

Allows source tracing · Replay · Speaker review · Future timeline

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) — Source Traceability

> MVP Database Design の `Transcripts` テーブルは本セグメントモデルへ拡張 — **要確認**

---

# Structured Medical Data

**Purpose**: Single source of truth.

**Fields**

`consultation_id` · `chief_complaint` · `history_present_illness` · `past_history` · `family_history` · `medications` · `allergies` · `symptoms` · `vital_signs` · `physical_findings` · `laboratory_values` · `assessment` · `plan` · `warnings` · `confidence` · `structured_json` · `version` · `created_at` · `updated_at`

**Everything else is generated from here.**

---

# SOAPDocuments

**Purpose**: Generated SOAP.

**Fields**

`id` · `consultation_id` · `subjective` · `objective` · `assessment` · `plan` · `version` · `approved` · `created_at` · `updated_at`

**Never overwrite. Always create new versions.**

---

# ClinicalNotes

**Purpose**: Generated physician note.

**Fields**

`id` · `consultation_id` · `content` · `version` · `approved` · `created_at` · `updated_at`

Multiple versions supported.

---

# AIExecutions

**Purpose**: Track every AI execution.

**Fields**

`id` · `consultation_id` · `pipeline_stage` · `provider` · `model` · `prompt_version` · `schema_version` · `started_at` · `finished_at` · `success` · `latency_ms` · `token_input` · `token_output` · `error_code`

**This table allows complete AI observability.**

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) — Module 11 AI Audit

---

# PromptVersions

**Purpose**: Version every prompt.

**Fields**

`id` · `name` · `version` · `provider` · `system_prompt` · `schema` · `status` · `created_at`

**Every AI output references a prompt version.**

詳細: [`18_prompt_library.md`](./18_prompt_library.md) · [`07_ai_service_architecture.md`](./07_ai_service_architecture.md)

---

# RevisionHistory

**Purpose**: Track physician edits.

**Fields**

`id` · `consultation_id` · `document_type` · `field` · `before` · `after` · `edited_by` · `edited_at`

**Future**: AI personalization · Quality analytics

---

# AuditLogs

**Purpose**: Compliance.

**Fields**

`id` · `user_id` · `consultation_id` · `action` · `resource` · `ip` · `user_agent` · `created_at`

**Immutable. Never editable.**

---

# Settings

**Purpose**: Store physician preferences.

**Fields**

`user_id` · `language` · `theme` · `recording_quality` · `auto_delete_audio` · `storage_policy` · `updated_at`

---

# Versioning Strategy

Medical OS **never updates medical documents in place**.

```
Version 1 → Version 2 → Version 3 → Approved Version
```

**History is always preserved.**

---

# Index Strategy

**Primary Indexes**

Patient ID · Consultation Date · Physician ID · Status · Created At

**Additional Indexes**

Transcript Search · History Search · AI Execution · Audit

---

# Search Strategy

**Version 0.1**: Simple SQL Search — Patient Name · Patient Code · Consultation Date

**Future**: Full Text Search · Semantic Search · Medical Knowledge Search

---

# Backup Strategy

| Item | Policy |
|------|--------|
| Database | Daily Backup |
| Point-in-Time Recovery | Enabled |
| Retention | 30 Days |
| Future | Cross Region Backup |

---

# Retention Policy

| Data | Policy |
|------|--------|
| Audio | Temporary |
| Transcript | Permanent |
| Structured Data | Permanent |
| SOAP | Permanent |
| Clinical Notes | Permanent |
| Audit Logs | Permanent |
| Revision History | Permanent |

**Audio should never become the primary record.**

---

# Future Database Expansion

FHIR Resources · HL7 Messages · Medical Timeline · Knowledge Graph · Referral Letters · Medical Certificates · Clinical Templates · Dentistry · Pharmacy · Nursing

The current schema should support these additions **without redesign**.

---

# Database Constraints

- Every Consultation must belong to one Patient
- Every Transcript must belong to one Consultation
- Every Structured Medical Data record must belong to one Consultation
- Every SOAP must originate from Structured Medical Data
- Every Clinical Note must originate from Structured Medical Data
- **No orphan records allowed**

---

# Performance Targets

| Operation | Target |
|-----------|--------|
| Patient Search | < 100ms |
| Consultation Search | < 200ms |
| Transcript Retrieval | < 200ms |
| SOAP Retrieval | < 100ms |
| Clinical Note Retrieval | < 100ms |

---

# Core Principle

The database is **not** a document storage system.

It is a **structured medical knowledge repository**.

Every document is a view generated from structured medical information.

**If the structured data is correct, every future medical document can be regenerated consistently.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| MVP Database Design | [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) |
| AI Architecture | [`04_ai_architecture.md`](./04_ai_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Cursor Database Rules | [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md) |
| Security | [`19_security.md`](./19_security.md) |
| Storage Architecture | [`10_storage_architecture.md`](./10_storage_architecture.md) |
| 次章 | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
