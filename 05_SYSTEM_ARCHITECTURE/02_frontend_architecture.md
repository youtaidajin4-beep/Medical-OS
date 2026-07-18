# System Architecture
# 02 — Frontend Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`01_architecture.md`](./01_architecture.md)

技術スタック: [`15_technology_stack.md`](./15_technology_stack.md)

Cursor フロントルール: [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md)

---

# Purpose

This document defines the **frontend architecture** of Medical OS Version 0.1.

The frontend should prioritize **physician workflow** over visual complexity.

Every design decision should reduce cognitive load and allow physicians to focus on **patient care**.

---

# Frontend Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 |
| Language | TypeScript |
| UI Library | React 19 |
| Styling | TailwindCSS |
| Component Library | shadcn/ui |
| Icons | Lucide React |
| State Management | Zustand |
| Server State | TanStack Query |
| Forms | React Hook Form |
| Validation | Zod |
| Animation | Framer Motion (Minimal) |
| Charts (Future) | Recharts |

---

# Frontend Principles

**Frontend is responsible for**

Rendering UI · Handling user interactions · Displaying AI output · Managing local state · Calling backend APIs

**The frontend must never**

- Contain business logic
- Generate SOAP
- Call AI directly
- Access the database

詳細: [`01_architecture.md`](./01_architecture.md) — Architecture Principles

---

# Application Structure

```
app/
  (auth)/
  (dashboard)/
    patients/
    consultation/
    history/
    settings/
  layout.tsx
  page.tsx
```

---

# Folder Structure

```
src/
  components/
  features/
  hooks/
  services/
  stores/
  types/
  utils/
  constants/
  providers/
  styles/
  lib/
```

---

# Components Directory

```
components/
  ui/
  layout/
  common/
  medical/
  recording/
  soap/
  clinical-note/
  history/
  patient/
  settings/
```

詳細: [`../04_MVP_SPECIFICATION/06_component_specification.md`](../04_MVP_SPECIFICATION/06_component_specification.md)

---

# Feature Modules

```
features/
  authentication/
  patients/
  consultation/
  recording/
  transcript/
  soap/
  clinical-note/
  history/
  settings/
```

Each feature owns:

Components · Hooks · API Calls · Types · Validation

---

# State Management

**Global State**

Authentication · Current Patient · Current Consultation · Theme · Language · Recording Status

**Local State**

Input Fields · Modal State · Loading State · Selection State · Temporary Editing

---

# API Layer

**Frontend never calls AI.**

Frontend only communicates with Backend API.

```
Frontend → Axios / Fetch → Backend REST API → AI
```

詳細: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) · [`03_backend_architecture.md`](./03_backend_architecture.md) · [`04_ai_architecture.md`](./04_ai_architecture.md) · [`05_database_architecture.md`](./05_database_architecture.md) · [`06_backend_api_architecture.md`](./06_backend_api_architecture.md)

---

# Authentication Flow

```
Login → Receive JWT → Store Securely → Attach Token
    → Protected Routes → Auto Refresh
```

詳細: [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Routing

| Access | Routes |
|--------|--------|
| Public | `/login` |
| Protected | `/dashboard` · `/patients` · `/consultation` · `/history` · `/settings` |

詳細: [`../04_MVP_SPECIFICATION/05_screen_specification.md`](../04_MVP_SPECIFICATION/05_screen_specification.md) · [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md)

---

# Page Layout

```
Header → Sidebar → Main Content → Floating Notifications
```

Consistent across all screens.

---

# Component Hierarchy

```
App → Layout → Page → Feature Component → UI Component → Primitive Component
```

---

# Medical Components

PatientCard · RecordingPanel · TranscriptPanel · SOAPEditor · ClinicalNoteEditor · HistoryTable · ConsultationHeader · RecordingIndicator · ProcessingIndicator

---

# Hooks

`useAuth()` · `usePatient()` · `useConsultation()` · `useRecording()` · `useTranscript()` · `useSOAP()` · `useClinicalNote()` · `useHistory()` · `useSettings()`

Custom hooks isolate logic from components.

---

# Service Layer

```
services/
  auth.service.ts
  patient.service.ts
  consultation.service.ts
  recording.service.ts
  soap.service.ts
  clinical-note.service.ts
  history.service.ts
  settings.service.ts
```

**Every API endpoint has one service.**

---

# Error Handling

Display **user-friendly messages**.

**Never expose**

Stack Trace · Internal Errors · API Secrets · Database Messages

**Retry should always be available.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Loading States

Loading Skeleton · Spinner · Progress Indicator · Processing Status

**AI generation should clearly indicate progress.**

---

# Empty States

No Patients · No History · No Transcript · No SOAP · No Clinical Note

Each empty state should **guide the physician**.

---

# Accessibility

Keyboard Navigation · Screen Reader Support · Visible Focus States · Readable Font Sizes · Large Click Targets · Color Contrast Compliance

---

# Responsive Design

| Platform | Support |
|----------|---------|
| Desktop | **First** |
| Tablet | Supported |
| Mobile | Optional |

**Version 0.1 is optimized for desktop consultation rooms.**

---

# Clipboard Support

Copy SOAP · Copy Clinical Note · Copy Success Feedback

Clipboard failures handled gracefully.

---

# Theme

**Version 0.1**: Light Mode Only

**Future**: Dark Mode · Clinic Branding · Accessibility Themes

---

# Performance Goals

| Operation | Target |
|-----------|--------|
| Initial Load | < 2 sec |
| Navigation | Instant |
| Patient Search | < 1 sec |
| Transcript Rendering | Real-time |
| SOAP Rendering | < 1 sec |

詳細: [`../04_MVP_SPECIFICATION/04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md)

---

# Future Features

Voice Commands · Split Screen · Medical Timeline · AI Suggestions · Referral Generator · Document Center

**Intentionally excluded from Version 0.1.**

---

# Coding Principles

- Small Components
- Reusable Components
- Typed Props
- No Duplicate Logic
- Feature Isolation
- Strict TypeScript
- Reusable Hooks
- Composable Design

---

# Core Principle

The frontend should **disappear into the physician's workflow**.

Physicians should feel they are **treating patients**—not operating software.

**Every pixel should reduce cognitive load.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| System Architecture | [`01_architecture.md`](./01_architecture.md) |
| Deployment Architecture | [`11_deployment_architecture.md`](./11_deployment_architecture.md) |
| Cursor Frontend Rules | [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) |
| Screen Specification | [`../04_MVP_SPECIFICATION/05_screen_specification.md`](../04_MVP_SPECIFICATION/05_screen_specification.md) |
| Component Specification | [`../04_MVP_SPECIFICATION/06_component_specification.md`](../04_MVP_SPECIFICATION/06_component_specification.md) |
| UI Guideline | [`../04_MVP_SPECIFICATION/14_ui_guideline.md`](../04_MVP_SPECIFICATION/14_ui_guideline.md) |
| 次章 | [`03_backend_architecture.md`](./03_backend_architecture.md) |
