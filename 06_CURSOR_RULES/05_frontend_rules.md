# Cursor Rules
# 05 — Frontend Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`04_ai_development_rules.md`](./04_ai_development_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) · [`../04_MVP_SPECIFICATION/05_screen_specification.md`](../04_MVP_SPECIFICATION/05_screen_specification.md) · [`../04_MVP_SPECIFICATION/06_component_specification.md`](../04_MVP_SPECIFICATION/06_component_specification.md)

> **優先順位**: フロント実装時は本書 + [`01_global_rules.md`](./01_global_rules.md) + [`03_architecture_rules.md`](./03_architecture_rules.md)。System Design 詳細 → [`02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)

---

# Purpose

This document defines **how Cursor should implement the frontend** of Medical OS.

The frontend exists to **support physician workflow**.

It should **never become the center** of the application.

| Layer | Responsibility |
|-------|----------------|
| Business logic | Backend |
| Medical logic | Domain |
| Frontend | Present information · Collect user interaction |

---

# Frontend Philosophy

Physicians should focus on **Patients**—not software.

Every UI decision should reduce:

Clicks · Thinking · Waiting · Distractions

**The interface should feel calm and predictable.**

詳細: [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md)

---

# Frontend Responsibilities

## The frontend IS responsible for

Rendering UI · Managing local UI state · Calling backend APIs · Displaying AI results · Handling clipboard operations · Displaying validation errors · Displaying loading states

## The frontend is NOT responsible for

Medical logic · Business rules · Database access · AI prompt execution · Clinical validation

---

# Technology

| Category | Technology |
|----------|------------|
| Framework | **Next.js 15** |
| Language | **TypeScript** |
| UI | **React 19** |
| Styling | **TailwindCSS** |
| Component Library | **shadcn/ui** |
| Icons | **Lucide** |
| State | **Zustand** |
| Server State | **TanStack Query** |
| Forms | **React Hook Form** |
| Validation | **Zod** |

詳細: [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md)

---

# Directory Rules

```text
src/
  app/
  components/
  features/
  hooks/
  providers/
  services/
  stores/
  styles/
  types/
  utils/
```

**Every feature owns its own UI.**

詳細: [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

---

# Component Rules

Every component should:

Have one responsibility · Receive typed props · Avoid hidden side effects · Remain reusable · Remain testable

| Guideline | Lines |
|-----------|-------|
| Recommended | 150–250 |
| Maximum | 300 |

---

# Component Hierarchy

```
Application → Layout → Page → Feature → Reusable Component → Primitive Component
```

**Never skip hierarchy.**

---

# State Rules

## Global State

Authentication · Current Consultation · Current Patient · Recording State · Theme · Language

## Local State

Form Input · Modal · Loading · Selection · Temporary Editing

**Never place business state inside React.**

---

# Data Flow

```
Backend → API → React Query → Feature → Component → User
```

**Never**: Component → Database

---

# API Rules

Every backend endpoint has **one Service**.

```typescript
consultationService.start()
consultationService.finish()
soapService.generate()
historyService.list()
```

**Never call `fetch()` directly from UI components.**

詳細: [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# React Query Rules

| Operation | Hook |
|-----------|------|
| GET | **Query** |
| POST · PUT · PATCH · DELETE | **Mutation** |

**Never manually synchronize cache unless necessary.**

---

# Forms

Every form uses **React Hook Form + Zod**.

Validation occurs: **Client → Server**

**Never rely on client validation only.**

---

# Error Handling

Always display: Friendly message · Retry · Recovery action

Never expose: Stack trace · Database error · Internal error

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Loading States

Every async operation requires:

Loading Skeleton · Spinner · Disabled Button · Progress Indicator

**Never leave users uncertain.**

---

# Empty States

Every screen supports: No Data · No Patients · No History · No Transcript · No SOAP · No Clinical Note

**Guide physicians toward the next action.**

---

# Recording UI

Recording screen displays:

Recording Status · Timer · Microphone Indicator · Transcript · Stop Button

**Recording should always appear reliable.**

詳細: [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md)

---

# Transcript UI

Display: Real-time transcript → Final transcript → Warnings → Confidence

**Transcript remains editable.**

---

# SOAP UI

Separate sections: **Subjective · Objective · Assessment · Plan**

**Each section editable independently.**

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/05_SOAP.md`](../01_MEDICAL_DOMAIN_BIBLE/05_SOAP.md)

---

# Clinical Note UI

Single editable document · Copy Button · Save Button · Revision Status

**Future**: Diff Viewer

---

# Clipboard Rules

Copy: SOAP · Clinical Note · Success Feedback

**Clipboard failures should allow manual selection.**

---

# Accessibility

Keyboard Navigation · Focus Indicators · ARIA Labels · Readable Fonts · High Contrast · Accessible Buttons

**Medical software should remain usable for long clinical sessions.**

**要確認**: WCAG 準拠レベル — 法務・UX 監修

---

# Styling Rules

Minimal Colors · High Contrast · Large Typography · Generous Spacing · Minimal Animation

**Whitespace is preferred over visual decoration.**

詳細: [`../04_MVP_SPECIFICATION/14_ui_guideline.md`](../04_MVP_SPECIFICATION/14_ui_guideline.md) — **スタブ · v1.0 未反映**

---

# Performance

| Target | Goal |
|--------|------|
| Initial Load | **< 2 sec** |
| Navigation | Instant |
| Transcript Updates | Real-Time |
| Rendering | Smooth |

**Avoid unnecessary re-renders.**

詳細: [`14_performance_rules.md`](./14_performance_rules.md)

---

# Code Rules

Prefer: Composition · Custom Hooks

Avoid: Inheritance · Duplicated Logic

**Keep rendering simple.**

---

# Testing

Every feature includes: Component Test · Interaction Test · Accessibility Test

Critical workflows include: **E2E Tests**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Forbidden

**Never:**

Call AI directly · Access database · Store business logic · Store medical rules · Hardcode API URLs · Duplicate API logic · Duplicate Components

---

# Future Features

Dark Mode · Voice Commands · Split View · Medical Timeline · Patient Dashboard · Referral Generator

**These features should fit naturally into the existing architecture.**

---

# Frontend Checklist

Before completing implementation, Cursor should verify:

Typed Props · Reusable Component · No Business Logic · API Through Services · Loading State · Error State · Accessibility · Responsive Layout · Testing

---

# Core Principle

**The best medical interface is the one physicians stop noticing.**

Every frontend decision should reduce cognitive load, increase confidence, and allow physicians to focus on **patient care**—not software.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Frontend Architecture | [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) |
| Screen Specification | [`../04_MVP_SPECIFICATION/05_screen_specification.md`](../04_MVP_SPECIFICATION/05_screen_specification.md) |
| Component Specification | [`../04_MVP_SPECIFICATION/06_component_specification.md`](../04_MVP_SPECIFICATION/06_component_specification.md) |
| UI UX Principles | [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md) |
| Architecture Rules | [`03_architecture_rules.md`](./03_architecture_rules.md) |
| 次章 | [`06_backend_rules.md`](./06_backend_rules.md) |
