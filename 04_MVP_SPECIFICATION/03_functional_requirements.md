# MVP Specification
# 03 — Functional Requirements

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`02_user_flow.md`](./02_user_flow.md)

---

# Purpose

This document defines every **functional requirement** of Medical OS Version 0.1.

Only functions required for **Product Market Fit** are included.

If a function does not directly contribute to PMF, **it should not be implemented**.

---

# Functional Scope

Medical OS Version 0.1 consists of **six core modules**:

1. Authentication
2. Patient Management
3. Audio Recording
4. AI Processing
5. Documentation
6. History

（詳細は Module 01〜11 に分解して定義）

---

# Module 01 — Authentication

**Purpose**: Authenticate physicians securely.

**Functions**

- Login
- Logout
- Session Management
- Password Reset
- Remember Login

**Future**: SSO · Multi-Factor Authentication

---

# Module 02 — Patient Management

**Purpose**: Select the patient before consultation.

**Functions**

- Patient List
- Patient Search
- Patient Selection

**Displayed Information**

- Patient ID
- Name
- Age
- Sex

**Future**: Previous Visit · Medication Summary · Allergies

---

# Module 03 — Consultation Recording

**Purpose**: Record consultation audio.

**Functions**

- Start Recording
- Stop Recording
- Pause (**Required** — Kickoff v1.0)
- Resume (**Required** — Kickoff v1.0)
- Recording Timer
- Recording Status
- Auto Save

**Requirements**

- Recording must **never be lost**
- Unexpected browser refresh should **not destroy** recorded data

---

# Module 04 — Speech Recognition

**Purpose**: Convert speech into medical text.

**Requirements**

- Real-time transcription (preview only — not used for AI generation)
- Final transcript from **full audio re-processing** after recording ends (Kickoff v1.0)
- Japanese medical terminology
- Speaker separation: Physician / Patient / Other / Unknown — low confidence → Unknown (Kickoff v1.0)
- Timestamp generation
- Manual speaker label correction after consultation

**Output**: Transcript

---

# Module 05 — Medical Information Extraction

**Purpose**: Convert transcript into structured medical information.

**Extract**

- Chief Complaint
- Present Illness
- Past History
- Medication
- Allergy
- Symptoms
- Physical Findings
- Assessment
- Plan

**Important**

The AI should **extract facts**.

It must **not infer** missing facts.

---

# Module 06 — SOAP Generation

**Purpose**: Generate structured SOAP documentation.

**Output**: S · O · A · P

**Requirements**

- Editable
- Version history
- Manual overwrite allowed

---

# Module 07 — Clinical Note Generation

**Purpose**: Generate a physician-ready clinical note.

**Requirements**

- Natural medical language
- Readable
- Editable
- No duplicated information

---

# Module 08 — Manual Editing

**Purpose**: Allow physician correction.

**Requirements**

- Edit any sentence
- Edit any SOAP section
- Undo
- Redo
- Save draft

---

# Module 09 — Copy Function

**Purpose**: Transfer documentation to MEDLEY.

**Functions**

- Copy SOAP
- Copy Clinical Note
- Clipboard confirmation
- Formatting preservation

**No direct EHR modification.**

---

# Module 10 — Consultation History

**Purpose**: Review previous AI-generated consultations.

**Functions**

- History List
- Search
- Open Consultation
- View Transcript
- View SOAP
- View Clinical Note
- View Revision History

---

# Module 11 — Settings

**Functions**

- Language
- Recording Quality
- Auto Delete Audio
- Storage Policy
- Theme (Future)

---

# Functional Requirements Summary

| Function | Status |
|----------|--------|
| Authentication | **Required** |
| Patient Selection | **Required** |
| Recording | **Required** |
| Speech Recognition | **Required** |
| Medical Information Extraction | **Required** |
| SOAP Generation | **Required** |
| Clinical Note Generation | **Required** |
| Editing | **Required** |
| Copy | **Required** |
| History | **Required** |
| Settings | **Required** |

---

# Excluded Features

The following are **intentionally excluded** from Version 0.1.

- Referral Letter
- Medical Certificate
- Patient Explanation
- Diagnosis Support
- Prescription Suggestion
- Laboratory Interpretation
- Medical Coding
- Billing
- Appointment Management
- Insurance Claim
- FHIR Integration
- HL7 Integration
- Direct MEDLEY API Integration
- Dentistry Workflow
- Pharmacy Workflow
- Nursing Workflow
- Medical Imaging
- AI Chat
- Voice Commands

---

# Performance Targets

| Operation | Target |
|-----------|--------|
| Login | < 2 sec |
| Patient Search | < 1 sec |
| Recording Start | < 1 sec |
| Speech Recognition | Real-time |
| SOAP Generation | < 10 sec |
| Clinical Note Generation | < 10 sec |
| Copy | Instant |

---

# Reliability

The system must **never lose**:

- Recorded Audio
- Transcript
- SOAP
- Clinical Note
- Revision History

Unexpected browser termination should **not destroy** consultation data.

---

# Core Principle

Every function in Version 0.1 must answer one question:

> **"Does this help physicians complete documentation faster and more safely?"**

If not, **the feature does not belong in Version 0.1**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Project Overview | [`01_project_overview.md`](./01_project_overview.md) |
| User Flow | [`02_user_flow.md`](./02_user_flow.md) |
| Non-Functional Requirements | [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) |
| Screen Specification | [`05_screen_specification.md`](./05_screen_specification.md) |
| Component Specification | [`06_component_specification.md`](./06_component_specification.md) |
| API Specification | [`08_api_specification.md`](./08_api_specification.md) |
| AI Pipeline | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| Security | [`10_security.md`](./10_security.md) |
| Error Handling | [`11_error_handling.md`](./11_error_handling.md) |
| Test Plan | [`12_test_plan.md`](./12_test_plan.md) |
| MVP Goal | [`13_mvp_goal.md`](./13_mvp_goal.md) |
| UI Guideline | [`14_ui_guideline.md`](./14_ui_guideline.md) |
| Database Design | [`07_database_design.md`](./07_database_design.md) |
