# MVP Specification
# 02 — User Flow

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`01_project_overview.md`](./01_project_overview.md)

---

# Purpose

This document defines how physicians interact with **Medical OS Version 0.1**.

The objective is to **minimize interaction with the system**.

Physicians should spend their time with patients—not with software.

Every screen, action, and transition must **reduce cognitive load**.

---

# User Journey

```
Physician Login
  ↓
Patient Selection
  ↓
Consultation Preparation
  ↓
Recording Starts
  ↓
Consultation
  ↓
Recording Ends
  ↓
AI Processing
  ↓
SOAP Generation
  ↓
Clinical Note Generation
  ↓
Physician Review
  ↓
Edit if Necessary
  ↓
Copy
  ↓
Paste into MEDLEY
  ↓
Finish
```

---

# Step 1 — Login

**Purpose**: Authenticate physician.

**Actions**

- Enter email
- Enter password
- Login

**Future**: Single Sign-On · Biometric Login

---

# Step 2 — Patient Selection

**Purpose**: Choose the patient for today's consultation.

**Displayed Information**

- Patient Name
- Patient ID
- Age
- Sex
- Appointment Time

**Future**: Chief Complaint · Previous Visit · Medication Alerts

**Actions**

- Search Patient
- Select Patient

---

# Step 3 — Consultation Preparation

**Purpose**: Prepare recording.

**Displayed**

- Patient Summary
- **Start Recording** Button

No AI output yet.

---

# Step 4 — Recording

**Purpose**: Capture consultation.

**Displayed**

- Recording Status
- Recording Timer
- Real-time Transcript

**Important**

The physician should **not need to interact with the screen** during consultation.

Recording should continue until **manually stopped**.

---

# Step 5 — Consultation Ends

**Actions**

Press **Stop Recording**.

AI processing begins **automatically**.

No manual upload required.

---

# Step 6 — AI Processing

**Pipeline**

```
Audio
  ↓
Speech Recognition
  ↓
Medical Information Extraction
  ↓
Structured Medical Data
  ↓
SOAP Generation
  ↓
Clinical Note Generation
```

（Speaker Separation: **Future** — [`03_functional_requirements.md`](./03_functional_requirements.md)）

**Displayed**

- Processing Indicator
- Estimated Remaining Time

**Target Processing Time**: Less than **15 seconds**（SOAP + Clinical Note 各 < 10 sec — [`03_functional_requirements.md`](./03_functional_requirements.md)）

---

# Step 7 — SOAP Review

**Displayed**

| Section | Content |
|---------|---------|
| S | Subjective |
| O | Objective |
| A | Assessment |
| P | Plan |

Each section should be **independently editable**.

---

# Step 8 — Clinical Note Review

Generated after SOAP.

- Displayed as a **natural clinical note**
- **Editable**
- Changes are **preserved**

---

# Step 9 — Physician Review

**Checklist**

- ✓ Symptoms correct
- ✓ Examination correct
- ✓ Diagnosis wording correct
- ✓ Medication correct
- ✓ Dates correct
- ✓ Negation correct

**Physician remains responsible for approval.**

---

# Step 10 — Copy

**Button**: Copy Clinical Note

- Clipboard receives finalized note
- **No formatting loss**

---

# Step 11 — Paste

Physician switches to **MEDLEY**.

Paste. Save.

**Medical OS does not automatically modify the EHR.**

---

# Consultation Complete

Consultation is archived.

**Stored**

- Transcript
- SOAP
- Clinical Note
- Revision History
- Timestamp
- Anonymous Consultation ID

---

# Future Flow

## Version 0.2

```
SOAP → Referral Letter → Physician Review → Copy
```

## Version 0.3

```
SOAP → Medical Certificate → Physician Review → Copy
```

## Version 1.0

```
SOAP → Multiple Medical Documents → Document Center → Search → Medical Knowledge Platform
```

**要確認**: Roadmap との整合 — [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# UX Rules

The physician should **never perform unnecessary actions**.

**Maximum clicks after consultation:**

1. Stop Recording
2. Copy

Everything else should happen **automatically**.

詳細: [`14_ui_guideline.md`](./14_ui_guideline.md) · [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md)

---

# Failure Flow

## Recording Failure

```
Retry Recording → Notify Physician → Never lose recorded audio
```

## Speech Recognition Failure

```
Retry → Show Partial Transcript → Allow Manual Editing
```

## AI Generation Failure

```
Keep Transcript → Retry Generation → Never discard physician data
```

---

# Core Principle

Medical OS should **disappear into the physician's workflow**.

The physician should feel they are **treating patients—not operating software**.

The ideal user experience is:

```
Start Recording → Treat Patient → Review → Copy → Done
```

---

# 関連

| 内容 | ファイル |
|------|----------|
| Project Overview | [`01_project_overview.md`](./01_project_overview.md) |
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
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
