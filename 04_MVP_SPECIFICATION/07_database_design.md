# MVP Specification
# 07 — Database Design

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`06_component_specification.md`](./06_component_specification.md)

---

# Purpose

This document defines the **database structure** for Medical OS Version 0.1.

The primary goal is not to build a perfect medical database.

The goal is to support the Version 0.1 workflow with a **clean, extensible architecture**.

The schema should allow **future expansion without major redesign**.

---

# Database Principles

Medical OS stores **structured medical information**.

The database should be:

- Simple
- Normalized
- Extensible
- Auditable
- Secure

**Medical data must never be duplicated unnecessarily.**

---

# Database Overview

Version 0.1 core entities:

- Users
- Patients
- Consultations
- AudioFiles
- Transcripts
- StructuredMedicalData
- SOAP
- ClinicalNotes
- RevisionHistory
- AuditLogs
- Settings

---

# Entity Relationship

```
User → Consultation ← Patient
         ↓
       Audio → Transcript → Structured Medical Data → SOAP → Clinical Note → Revision History
```

---

# Table — Users

**Purpose**: Manage physician accounts.

| Field | Description |
|-------|-------------|
| id | uuid |
| name | |
| email | |
| password_hash | |
| role | |
| created_at | |
| updated_at | |
| last_login | |
| status | |

---

# Table — Patients

**Purpose**: Patient master information.

| Field | Description |
|-------|-------------|
| id | uuid |
| patient_code | |
| name | |
| date_of_birth | |
| sex | |
| phone | |
| email | optional |
| memo | |
| created_at | |
| updated_at | |

**Future**: Insurance · Address · Emergency Contact

**Version 0.1**: 匿名化 · 模擬データ検証（Constitution）— **要確認**: 本番患者マスタの扱い

---

# Table — Consultations

**Purpose**: One consultation session.

| Field | Description |
|-------|-------------|
| id | uuid |
| patient_id | |
| physician_id | |
| consultation_date | |
| start_time | |
| end_time | |
| duration | |
| status | |
| created_at | |
| updated_at | |

## Consultation Status

`Scheduled` · `Recording` · `Processing` · `Review` · `Completed` · `Archived`

---

# Table — AudioFiles

**Purpose**: Store recorded consultation audio.

| Field | Description |
|-------|-------------|
| id | uuid |
| consultation_id | |
| file_path | |
| duration | |
| file_size | |
| storage_type | |
| delete_after_processing | |
| created_at | |

## Storage Policy

```
Temporary Storage → Processing → Optional Automatic Deletion
```

---

# Table — Transcripts

**Purpose**: Store speech recognition output.

| Field | Description |
|-------|-------------|
| id | uuid |
| consultation_id | |
| transcript_text | |
| language | |
| confidence_score | |
| created_at | |
| updated_at | |

**Future**: Speaker Separation · Timestamp Blocks

---

# Table — StructuredMedicalData

**Purpose**: Store extracted medical facts.

| Field | Description |
|-------|-------------|
| id | |
| consultation_id | |
| chief_complaint | |
| present_illness | |
| past_history | |
| family_history | |
| medications | |
| allergies | |
| physical_findings | |
| vital_signs | |
| assessment | |
| plan | |
| structured_json | |
| created_at | |

## Important

**This table is the heart of Medical OS.** Everything is generated from here.

SOAP · Clinical Note · Referral Letter · Medical Certificate · Future documents should all reference this structure.

---

# Table — SOAP

**Purpose**: Store generated SOAP.

| Field | Description |
|-------|-------------|
| id | |
| consultation_id | |
| subjective | |
| objective | |
| assessment | |
| plan | |
| version | |
| approved | |
| created_at | |
| updated_at | |

---

# Table — ClinicalNotes

**Purpose**: Store physician-ready documentation.

| Field | Description |
|-------|-------------|
| id | |
| consultation_id | |
| note | |
| approved | |
| version | |
| created_at | |
| updated_at | |

---

# Table — RevisionHistory

**Purpose**: Track every edit.

| Field | Description |
|-------|-------------|
| id | |
| consultation_id | |
| document_type | |
| before_text | |
| after_text | |
| edited_by | |
| edited_at | |
| reason | optional |

---

# Table — AuditLogs

**Purpose**: Record important actions.

| Field | Description |
|-------|-------------|
| id | |
| user_id | |
| consultation_id | |
| action | |
| target | |
| ip_address | |
| user_agent | |
| created_at | |

## Audit Actions

Login · Logout · Recording Started · Recording Stopped · SOAP Generated · Clinical Note Generated · Edited · Copied · Deleted · Settings Changed

---

# Table — Settings

**Purpose**: User preferences.

| Field | Description |
|-------|-------------|
| id | |
| user_id | |
| language | |
| theme | |
| recording_quality | |
| auto_delete_audio | |
| storage_policy | |
| created_at | |
| updated_at | |

---

# Relationships

| From | To | Cardinality |
|------|-----|-------------|
| Users | Consultations | 1 → Many |
| Patients | Consultations | 1 → Many |
| Consultation | Transcript | 1 → 1 |
| Consultation | Structured Medical Data | 1 → 1 |
| Consultation | SOAP Versions | 1 → Many |
| Consultation | Clinical Note Versions | 1 → Many |
| Consultation | Revision History | 1 → Many |

---

# Indexes

Index for fast search:

- Patient ID
- Consultation Date
- Physician ID
- Status
- Created At

---

# Future Tables

ReferralLetters · MedicalCertificates · PatientSummaries · MedicalTimeline · KnowledgeGraph · AIFeedback · PromptHistory · FHIRResources

**Intentionally excluded from Version 0.1.**

---

# Data Retention

| Data | Policy |
|------|--------|
| Audio | Optional automatic deletion |
| Transcript | Stored |
| Structured Medical Data | Stored |
| SOAP | Stored |
| Clinical Notes | Stored |
| Revision History | Stored |
| Audit Logs | Stored |

**No approved medical document should ever be permanently lost.**

詳細: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md)

---

# Core Principle

Medical OS does **not store documents**.

Medical OS stores **structured medical knowledge**.

**Documents are generated views of that knowledge.**

This distinction is fundamental to the architecture and should guide every future database design decision.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Project Overview | [`01_project_overview.md`](./01_project_overview.md) |
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
| 次章 | [`08_api_specification.md`](./08_api_specification.md) |
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| Cursor Database Rules | [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md) |
| Storage Architecture | [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md) |
| 旧論理モデル草案 | [`16_data_model_legacy.md`](./16_data_model_legacy.md) |
