# MVP Specification
# 05 — Screen Specification

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md)

---

# Purpose

This document defines every screen included in **Medical OS Version 0.1**.

The objective is **simplicity**.

Every screen should **reduce physician workload**.

If a screen is unnecessary, **it should not exist**.

---

# Screen List

Version 0.1 includes only the following screens:

1. Login
2. Dashboard
3. Patient Selection
4. Consultation
5. SOAP Review
6. Clinical Note Review
7. Consultation History
8. Settings

---

# Screen 01 — Login

**Purpose**: Authenticate physician.

**Components**

- Email
- Password
- Login Button
- Forgot Password
- Remember Login

**Future**: Single Sign-On · Biometric Authentication

---

# Screen 02 — Dashboard

**Purpose**: Starting point after login.

**Displayed**

- Today's Date
- Today's Consultation Count
- Recent Patients
- Recent Consultations
- Quick Start Button
- Settings

**Future**: Usage Analytics · AI Accuracy · Product Updates

---

# Screen 03 — Patient Selection

**Purpose**: Select patient before consultation.

**Components**

- Search Box
- Patient List
- Patient Card
- Select Button

**Displayed Information**

- Patient Name
- Patient ID
- Age
- Sex
- Appointment Time

**Future**: Chief Complaint · Medication Summary · Alert Flags

---

# Screen 04 — Consultation Screen

**Purpose**: Main working screen.

**This is the most important screen in Version 0.1.**

**Layout**

```
---------------------------------
Patient Summary
---------------------------------
Recording Button
Recording Status
Recording Timer
---------------------------------
Real-time Transcript
---------------------------------
Stop Recording Button
---------------------------------
```

**Requirements**

- Real-time transcript updates **automatically**
- Physician should **not need to touch the screen** during consultation

### Consultation Screen Components

- Patient Header
- Recording Status
- Recording Timer
- Transcript Viewer
- Recording Controls
- Stop Button
- Loading Indicator

---

# Screen 05 — SOAP Review

**Purpose**: Review AI-generated SOAP.

**Layout**

```
---------------------------------
Subjective    (Editable)
---------------------------------
Objective     (Editable)
---------------------------------
Assessment    (Editable)
---------------------------------
Plan          (Editable)
---------------------------------
Generate Clinical Note Button
---------------------------------
```

**Requirements**

- Each section editable **independently**
- Undo supported
- Revision history stored

---

# Screen 06 — Clinical Note Review

**Purpose**: Review final clinical documentation.

**Layout**

```
---------------------------------
Generated Clinical Note
---------------------------------
Edit | Copy | Save
---------------------------------
```

**Requirements**

- Editable
- Copy to Clipboard (**disabled until consultation approved** — Kickoff v1.0)
- Version History
- Timestamp

---

# Screen 07 — Consultation History

**Purpose**: View previous consultations.

**Displayed**

- Date · Patient · Physician · SOAP · Clinical Note · Status

**Functions**

- Search · Filter · Open Consultation
- View Transcript · View SOAP · View Clinical Note

---

# Screen 08 — Settings

**Purpose**: Application configuration.

**Settings**

- Language
- Recording Quality
- Audio Storage Policy
- Transcript Storage
- Theme (Future)

**Account**

- Logout

---

# Navigation

```
Login
  ↓
Dashboard
  ↓
Patient Selection
  ↓
Consultation
  ↓
SOAP Review
  ↓
Clinical Note Review
  ↓
History / Settings
```

詳細: [`02_user_flow.md`](./02_user_flow.md)

---

# Screen Priority

| Priority | Screens |
|----------|---------|
| **Critical** | Consultation · SOAP Review · Clinical Note Review |
| **High** | Patient Selection · History |
| **Medium** | Dashboard · Settings |
| **Low** (v2+) | Analytics · Reports · Notifications |

---

# Screen Behavior

Every screen should:

- Load quickly
- Require minimal interaction
- Preserve entered data
- Support recovery after unexpected errors
- **Never interrupt physician workflow**

---

# Visual Design Principles

- Minimalist · Calm · Professional · Medical-grade
- Large readable typography · High contrast · Minimal colors
- No unnecessary animations · No decorative elements

**Focus on content.**

詳細: [`14_ui_guideline.md`](./14_ui_guideline.md) · [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md)

---

# Mobile Support

| Platform | Version 0.1 |
|----------|---------------|
| Desktop | **First** |
| Tablet | Compatible |
| Mobile | Optional |

---

# Error Handling

If AI processing fails:

- Display Transcript
- Allow Retry
- Allow Manual Editing
- **Never lose consultation data**

詳細: [`11_error_handling.md`](./11_error_handling.md)

---

# Future Screens

Referral Letter · Medical Certificate · Patient Summary · Longitudinal Timeline · Medical Dashboard · Knowledge Search · AI Suggestions

**Intentionally excluded from Version 0.1.**

---

# Core Principle

A physician should complete an entire consultation using **as few screens as possible**.

The ideal workflow requires only **three working screens**:

```
Consultation → SOAP Review → Clinical Note Review
```

**Everything else should stay in the background.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| User Flow | [`02_user_flow.md`](./02_user_flow.md) |
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
| Frontend Architecture | [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) |
| Cursor Frontend Rules | [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) |
| Component Specification | [`06_component_specification.md`](./06_component_specification.md) |
| API Specification | [`08_api_specification.md`](./08_api_specification.md) |
| AI Pipeline | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| Security | [`10_security.md`](./10_security.md) |
| Error Handling | [`11_error_handling.md`](./11_error_handling.md) |
| Test Plan | [`12_test_plan.md`](./12_test_plan.md) |
| MVP Goal | [`13_mvp_goal.md`](./13_mvp_goal.md) |
| UI Guideline | [`14_ui_guideline.md`](./14_ui_guideline.md) |
| Database Design | [`07_database_design.md`](./07_database_design.md) |
