# MVP Specification
# 09 — AI Pipeline

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`08_api_specification.md`](./08_api_specification.md)

---

# Purpose

This document defines the complete **AI processing pipeline** for Medical OS Version 0.1.

The AI Pipeline is the **core engine** of Medical OS.

It transforms raw consultation audio into **structured medical information**.

Every future medical document will be generated from this pipeline.

---

# Design Philosophy

Medical OS is **NOT** a text generation system.

Medical OS is an **information processing system**.

The AI does not think in paragraphs.

The AI thinks in **medical facts**.

Every processing step exists to increase **accuracy and reliability**.

---

# Overall Pipeline

```
Patient Consultation
    ↓
Audio Recording
    ↓
Speech Recognition
    ↓
Transcript
    ↓
Medical Information Extraction
    ↓
Structured Medical Data
    ↓
SOAP Generation
    ↓
Clinical Note Generation
    ↓
Physician Review
    ↓
Revision
    ↓
Copy to MEDLEY
```

---

# Step 01 — Audio Recording

**Input**: Real-time physician-patient conversation.

**Requirements**

- High quality recording
- Continuous recording
- Background noise tolerance
- Automatic temporary storage
- No information loss

**Output**: Audio File

---

# Step 02 — Speech Recognition (Two-Pass)

**Purpose**: Convert speech into text.

| Pass | When | Purpose |
|------|------|---------|
| **Pass 1 — Real-time** | During consultation | Preview only (1–2 lines). **Not** used for AI generation |
| **Pass 2 — Final** | After recording ends | Full audio re-processed → **authoritative transcript** for AI |

| | |
|---|---|
| Input | Audio |
| Output | Transcript (raw + normalized) |

**Requirements**

- Japanese medical terminology
- Real-time processing (preview)
- Medical vocabulary support
- **Speaker separation** (v0.1): Physician · Patient · Other · Unknown — never guess when confidence is low
- Timestamp segmentation
- Manual speaker correction after consultation

**Future**: Accent adaptation · Advanced noise reduction

---

# Step 03 — Transcript Normalization

**Purpose**: Clean transcript before AI processing.

**Tasks**

- Remove duplicated words
- Correct recognition errors
- Normalize punctuation
- Normalize medical abbreviations
- Standardize measurements
- Expand shorthand when appropriate

**Output**: Normalized Transcript

---

# Step 04 — Medical Information Extraction

**Purpose**: Extract structured medical facts.

**AI should identify**

- Chief Complaint
- History of Present Illness
- Past Medical History
- Current Medication
- Allergies
- Symptoms
- Vital Signs
- Physical Findings
- Laboratory Values
- Imaging Results
- Assessment Candidates
- Treatment Plan

**Important**: **Extraction comes before generation.**

---

# Step 05 — Validation Layer

**Purpose**: Verify extracted information.

**Checks**

- Medication consistency
- Date consistency
- Negation consistency
- Number consistency
- Duplicate detection
- Incomplete information
- Contradictions

**Unknown values remain unknown. The AI never guesses.**

---

# Step 06 — Structured Medical Data

**Purpose**: Convert extracted information into structured JSON.

**Example structure**

- Patient
- Symptoms
- Findings
- Assessment
- Plan
- Medication
- Vital Signs

**All future documents originate from this dataset.**

**This dataset is the heart of Medical OS.**

詳細: [`07_database_design.md`](./07_database_design.md) — StructuredMedicalData テーブル

---

# Step 07 — SOAP Generation

| | |
|---|---|
| Input | Structured Medical Data |
| Output | Subjective · Objective · Assessment · Plan |

**Requirements**

- Medical terminology
- Clear separation
- No hallucination
- Editable
- Version controlled

---

# Step 08 — Clinical Note Generation

**Purpose**: Generate physician-readable documentation.

**Requirements**

- Natural language
- Readable
- Professional
- No duplicated information
- Consistent with SOAP
- Editable

---

# Step 09 — Physician Review

**Medical OS stops here.**

The physician reviews:

- SOAP
- Clinical Note
- Transcript
- Corrections
- Approval

**AI never auto-approves.**

---

# Step 10 — Revision Tracking

Every physician edit is recorded.

```
Original → Edited → Approved
```

**Future**: AI learns editing patterns **without learning patient identity**.

詳細: [`07_database_design.md`](./07_database_design.md) — RevisionHistory テーブル

---

# Step 11 — Export

**Version 0.1**

```
Copy to Clipboard → Paste into MEDLEY
```

**Future**: Official API · FHIR · HL7

---

# AI Decision Tree

```
Audio
  ↓
Transcript
  ↓
Extract Facts
  ↓
Validate Facts
  ↓
Build Structured Data
  ↓
Generate SOAP
  ↓
Generate Clinical Note
  ↓
Human Review
  ↓
Approved Document
```

---

# AI Failure Handling

## Speech Recognition Failure

```
Retry → Fallback Transcript → Manual Edit
```

## Extraction Failure

```
Flag Missing Information → Continue Processing → Require Physician Review
```

## SOAP Generation Failure

```
Keep Structured Data → Retry Generation → Never discard consultation
```

## Clinical Note Failure

```
Keep SOAP → Retry → Manual Completion
```

---

# AI Safety Rules

- Never invent facts
- Never invent diagnosis
- Never invent medication
- Never invent dates
- Never invent allergies
- Never invent examination findings
- Never change physician intent
- **Always preserve uncertainty**

詳細: [`../02_PRODUCT_BIBLE/09_ai_principles.md`](../02_PRODUCT_BIBLE/09_ai_principles.md) · [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)

---

# Confidence Scoring

Each extracted item should receive a confidence score.

| Level | Range |
|-------|-------|
| High | 95–100% |
| Medium | 80–94% |
| Low | Below 80% |

**Low confidence items should be highlighted for physician review.**

---

# Future Pipeline

| Version | Capability |
|---------|------------|
| 0.2 | Referral Letter Generation |
| 0.3 | Medical Certificate Generation |
| 0.5 | Patient Summary Generation |
| 1.0 | Longitudinal Patient Understanding |
| 2.0 | Medical Knowledge Graph |
| 3.0 | Clinical Intelligence Platform |

---

# Pipeline Principles

- Extract before Generate
- Validate before Save
- Human before Approval
- Facts before Language
- Structure before Documents

---

# Core Principle

Medical OS is **not** an AI writing assistant.

Medical OS is an **AI medical information engine**.

Documents are only one possible output.

**Structured medical knowledge is the true product.**

Every future feature should begin from structured medical data—not from generated text.

---

# 関連

| 内容 | ファイル |
|------|----------|
| API Specification | [`08_api_specification.md`](./08_api_specification.md) |
| Database Design | [`07_database_design.md`](./07_database_design.md) |
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
| AI Principles | [`../02_PRODUCT_BIBLE/09_ai_principles.md`](../02_PRODUCT_BIBLE/09_ai_principles.md) |
| AI Workflow Architecture | [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) |
| AI Service Architecture | [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md) |
| AI Architecture | [`../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md`](../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md) |
| AI Development Rules | [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) |
| AI Prompt Rules | [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) |
| プロンプト | [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md) |
| 次章 | [`10_security.md`](./10_security.md) |
