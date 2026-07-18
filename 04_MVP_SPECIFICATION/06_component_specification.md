# MVP Specification
# 06 — Component Specification

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`05_screen_specification.md`](./05_screen_specification.md)

---

# Purpose

This document defines every **reusable UI component** used in Medical OS Version 0.1.

The objective is **consistency**.

Every screen should be built using **reusable components** rather than custom implementations.

This reduces development complexity and improves maintainability.

---

# Component Architecture

Medical OS follows a **component-based architecture**.

```
Pages
  ↓
Layouts
  ↓
Components
  ↓
UI Elements
```

---

# Component List

**Version 0.1 Components**

- App Layout
- Navigation Bar
- Sidebar
- Header
- Page Container
- Patient Card
- Recording Panel
- Transcript Panel
- SOAP Card
- Clinical Note Card
- Loading Indicator
- Status Badge
- Search Box
- Action Button
- Confirmation Dialog
- Notification Toast
- Modal
- History Card

---

# Component 01 — App Layout

**Purpose**: Provides the overall page structure.

**Structure**

```
Header → Sidebar → Main Content → Footer (Optional)
```

**Requirements**: Responsive · Consistent spacing · Reusable across all pages

---

# Component 02 — Navigation Bar

**Purpose**: Provide application navigation.

**Items**: Dashboard · Patients · History · Settings · Logout

**Requirements**: Always visible · Fixed position

---

# Component 03 — Patient Card

**Purpose**: Display patient information.

**Fields**: Patient Name · Patient ID · Age · Sex · Appointment Time

**Future**: Chief Complaint · Allergies · Medication Summary

**Actions**: Select Patient · Open History

---

# Component 04 — Recording Panel

**Purpose**: Control consultation recording.

**Components**: Start Button · Stop Button · Recording Status · Recording Timer · Audio Indicator

**Requirements**: Large controls · Visible recording state · Single-click operation

---

# Component 05 — Transcript Panel

**Purpose**: Display live speech recognition.

**Features**

- Auto Scroll
- Timestamp (**Future**)
- Speaker Separation (**Future**)
- Manual Selection
- Copy Text

**Requirements**: Smooth scrolling · Fast updates · Large readable text

---

# Component 06 — SOAP Card

**Purpose**: Display one SOAP section.

**Used for**: Subjective · Objective · Assessment · Plan

**Features**: Editable · Auto Save · Undo · Redo · Revision Tracking

---

# Component 07 — Clinical Note Card

**Purpose**: Display generated clinical note.

**Features**: Editable · Copy · Save · Version History · Expand / Collapse

---

# Component 08 — Action Button

**Purpose**: Primary user actions.

**Examples**: Start Recording · Stop Recording · Generate SOAP · Generate Clinical Note · Copy · Save

**Requirements**: Consistent size · Consistent color · Keyboard accessible

---

# Component 09 — Search Box

**Purpose**: Search patients and consultation history.

**Features**: Instant Search · Clear Button · Keyboard Navigation

**Future**: Fuzzy Search

---

# Component 10 — Status Badge

**Purpose**: Display current processing state.

**Examples**: Recording · Processing · Completed · Saved · Failed · Retry Required

---

# Component 11 — Loading Indicator

**Purpose**: Show AI processing status.

**Displayed During**: Speech Recognition · SOAP Generation · Clinical Note Generation

**Requirements**: Simple · Non-blocking · Minimal animation

---

# Component 12 — Notification Toast

**Purpose**: Provide lightweight feedback.

**Examples**: Saved · Copied · Retry Failed · Recording Started · Recording Stopped

**Requirements**: Disappear automatically · **Do not interrupt workflow**

---

# Component 13 — Confirmation Dialog

**Purpose**: Prevent accidental destructive actions.

**Examples**: Delete Consultation · Discard Changes · Logout

**Requirements**: Clear wording · Safe defaults

---

# Component 14 — Modal

**Purpose**: Display temporary information.

**Examples**: Settings · Patient Details · Future Features

**Requirements**: Close easily · Keyboard accessible

---

# Component 15 — History Card

**Purpose**: Display consultation history.

**Fields**: Patient · Date · Duration · SOAP Status · Clinical Note Status

**Actions**: Open · Copy · View Transcript

---

# Shared Component Rules

Every component should be:

- Reusable
- Independent
- Stateless where possible
- Composable
- Easy to test
- Easy to replace

---

# Naming Convention

**Buttons**: `ButtonStartRecording` · `ButtonCopy` · `ButtonSave`

**Panels**: `TranscriptPanel` · `RecordingPanel` · `SOAPPanel`

**Cards**: `PatientCard` · `HistoryCard` · `SOAPCard` · `ClinicalNoteCard`

---

# Component Design Rules

- One responsibility per component
- Avoid large components
- Prefer **composition over inheritance**
- Do not duplicate UI logic

---

# Accessibility

Every component must support:

- Keyboard Navigation
- Screen Readers
- Focus Indicators
- Readable Typography
- High Contrast

---

# Error State

Each component must define:

- Loading State
- Empty State
- Success State
- Error State
- Disabled State

**No component should have undefined behavior.**

---

# Future Components

ReferralCard · CertificateCard · TimelineCard · PatientSummaryCard · KnowledgePanel · MedicalGraph

**Intentionally excluded from Version 0.1.**

---

# Core Principle

Components should be **invisible to physicians**.

They exist to **reduce friction**, not to demonstrate design complexity.

Every reusable component should make **future development faster** while keeping the **user experience simple**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Frontend Architecture | [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) |
| Cursor Frontend Rules | [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) |
| Screen Specification | [`05_screen_specification.md`](./05_screen_specification.md) |
| API Specification | [`08_api_specification.md`](./08_api_specification.md) |
| AI Pipeline | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| Security | [`10_security.md`](./10_security.md) |
| Error Handling | [`11_error_handling.md`](./11_error_handling.md) |
| Test Plan | [`12_test_plan.md`](./12_test_plan.md) |
| MVP Goal | [`13_mvp_goal.md`](./13_mvp_goal.md) |
| UI Guideline | [`14_ui_guideline.md`](./14_ui_guideline.md) |
| Database Design | [`07_database_design.md`](./07_database_design.md) |
| Product Bible UX | [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md) |
