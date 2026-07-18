# System Architecture
# 08 — AI Workflow Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`07_ai_service_architecture.md`](./07_ai_service_architecture.md)

関連: [`04_ai_architecture.md`](./04_ai_architecture.md)（処理ステージ） · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) · [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md)

---

# Purpose

This document defines the **complete AI workflow** inside Medical OS.

Unlike the AI Pipeline document, which describes **processing stages**, this document defines how every AI module **collaborates** from the moment a consultation begins until documentation is approved.

It serves as the **operational blueprint** of the AI system.

---

# Design Philosophy

Medical OS is an **event-driven system**.

Every stage starts because the previous stage has **successfully completed**.

Each module performs **exactly one responsibility**.

**No module should know the internal implementation of another module.**

---

# Overall Workflow

```
Physician Starts Recording
    ↓
Audio Streaming → Temporary Audio Storage → Real-time Speech Recognition → Live Transcript
    ↓
Recording Stops → Final Speech Recognition → Transcript Normalization
    ↓
Clinical Fact Extraction → Medical Validation → Structured Medical Data
    ↓
SOAP Generation → Clinical Note Generation → Physician Review → Approval
    ↓
Clipboard Copy → Paste into MEDLEY → Consultation Completed
```

---

# Stage 01 — Consultation Started

**Trigger**: Physician presses **Start Recording**

**Actions**

- Create Consultation Session · Generate Consultation ID · Initialize AI Pipeline
- Initialize Logging · Begin Audio Stream

**Output**: Consultation Ready

---

# Stage 02 — Audio Capture

| | |
|---|---|
| Input | Microphone |
| Process | Continuous Recording → Temporary Local Buffer → Chunk Upload → Storage |

Every uploaded chunk is acknowledged.

**No audio should be discarded.**

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Stage 03 — Live Speech Recognition

**Purpose**: Provide confidence that recording is working.

**Output**: Real-time Transcript

**Requirements**

Low Latency · Not Final · Partial · Editable Later

**This transcript is informational only.**

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) — Real-Time Transcription Strategy

---

# Stage 04 — Recording Finished

**Trigger**: Physician presses **Stop Recording**

**Actions**

Close Recording · Merge Audio · Upload Final Recording · Lock Consultation · **Start AI Processing**

---

# Stage 05 — Final Speech Recognition

| | |
|---|---|
| Input | Complete Recording |
| Output | **Canonical Transcript** |

This transcript becomes the **official transcript** used by every downstream AI process.

---

# Stage 06 — Transcript Processing

**Actions**

Normalize punctuation · numbers · units · dates · Correct common recognition errors · Preserve medical meaning · Preserve uncertainty

**Output**: Normalized Transcript

---

# Stage 07 — Medical Information Extraction

| | |
|---|---|
| Input | Normalized Transcript |

**Extract**

Chief Complaint · Symptoms · Past History · Medication · Allergies · Vitals · Physical Findings · Assessment · Plan · Family History · Follow-up

**Output**: Structured Clinical Data

---

# Stage 08 — Validation

**Validate**

Medication · Dates · Units · Negation · Contradictions · Missing Information · Confidence

**Generate**

Warnings · Flags · Review Items

---

# Stage 09 — SOAP Generation

| | |
|---|---|
| Input | Validated Structured Data |
| Output | Subjective · Objective · Assessment · Plan |

Each section stores: Version · Confidence · Source References

---

# Stage 10 — Clinical Note Generation

| | |
|---|---|
| Input | SOAP + Structured Data |
| Output | Natural Clinical Documentation |

Version Controlled · Editable

---

# Stage 11 — Physician Review

**Display**

Transcript · SOAP · Clinical Note · Warnings · Confidence

**Physician may**

Edit · Approve · Reject · Retry AI

**AI never auto-approves.**

---

# Stage 12 — Final Approval

**Trigger**: Physician presses **Approve**

**Actions**

Lock Approved Version · Store Revision · Store Approval Time · Generate Audit Log · **Enable Clipboard**

---

# Stage 13 — Clipboard

| | |
|---|---|
| Trigger | Copy |
| Output | Clipboard |
| Purpose | Paste into MEDLEY |

**No automatic EHR integration in Version 0.1.**

---

# Stage 14 — Consultation Archived

**Store**

Transcript · Structured Data · SOAP · Clinical Note · Revision History · Audit

**Consultation Status**: `Completed`

---

# AI Event Bus

**Future Architecture**

```
RecordingStarted → RecordingStopped → TranscriptReady → ExtractionCompleted
    → ValidationCompleted → SOAPGenerated → ClinicalNoteGenerated → Approved
```

Each event can trigger future automation.

---

# Retry Workflow

```
Failure → Retry → Fallback → Manual Review → Continue
```

**The physician must never restart the consultation because of an AI error.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Parallel Processing

**Possible Future Optimization**

Some steps may execute in parallel when medically safe:

```
Speech Recognition → Normalization → Clinical Extraction → Validation
    ∥ (when safe) SOAP Generation → Clinical Note Generation
```

---

# AI Workflow Timing Goals

| Stage | Target |
|-------|--------|
| Recording Start | < 1 sec |
| Speech Recognition | Real-Time |
| Final Transcript | < 15 sec |
| Extraction | < 5 sec |
| Validation | < 2 sec |
| SOAP | < 5 sec |
| Clinical Note | < 5 sec |
| **Entire AI Pipeline** | Target < 30 sec · Ideal < 20 sec |

---

# Failure Recovery

| Failure | Recovery |
|---------|----------|
| Speech Recognition | Retry → Manual Transcript → Continue |
| Extraction | Retry → Manual SOAP → Continue |
| Validation | Warn Physician → Continue |
| SOAP | Retry → Manual Completion |
| Clinical Note | Retry → Manual Completion |

---

# Workflow Principles

Every stage:

```
Produces Output → Logs Activity → Stores Version
    → Supports Retry → Supports Manual Override
```

**Nothing is irreversible.**

---

# Future Workflow

Referral Letter → Patient Explanation → Medical Certificate → Timeline → Knowledge Graph → Clinical Search → Medical Memory

**All future workflows begin from Structured Medical Data.**

---

# Core Principle

Medical OS is a **workflow engine**.

AI is only one component of that workflow.

The true value of Medical OS is **not** AI generation.

The true value is the **reliable transformation** of clinical conversations into structured, reusable medical knowledge.

---

# 関連

| 内容 | ファイル |
|------|----------|
| AI Architecture | [`04_ai_architecture.md`](./04_ai_architecture.md) |
| AI Service Architecture | [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) |
| MVP AI Pipeline | [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) |
| User Flow | [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md) |
| 次章 | [`09_authentication_architecture.md`](./09_authentication_architecture.md) |
