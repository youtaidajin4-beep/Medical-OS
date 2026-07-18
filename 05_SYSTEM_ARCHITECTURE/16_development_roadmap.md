# System Architecture
# 16 — Development Roadmap

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`15_technology_stack.md`](./15_technology_stack.md)

関連: [`../07_ROADMAP/`](../07_ROADMAP/) · [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

> **役割分担**: 本書 = **実装フェーズ・スプリント**のロードマップ。バージョン別機能計画 → [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md) · 未決定事項 → [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Purpose

This document defines the **implementation roadmap** for Medical OS.

The roadmap is based on one principle:

**Build the smallest product that creates the greatest physician value.**

Every phase should produce a **working product**.

Medical OS should **always remain deployable**.

---

# Development Philosophy

Never build everything at once.

```
Build → Test → Validate → Improve → Repeat
```

**Product Market Fit comes before scale.**

---

# Roadmap Overview

```
Phase 0  Foundation
    ↓
Phase 1  Core MVP
    ↓
Phase 2  Clinical Validation
    ↓
Phase 3  Workflow Expansion
    ↓
Phase 4  Multi-document Generation
    ↓
Phase 5  Medical Intelligence
    ↓
Phase 6  Platform Expansion
```

---

# Phase 0 — Foundation

| Field | Detail |
|-------|--------|
| **Goal** | Create development environment |

**Deliverables**: Repository · Monorepo · CI/CD · Docker · Database · Authentication · Basic Layout · Environment Variables · Logging · Monitoring · Health API

**Success Criteria**: Developers can run the project **with one command**.

詳細: [`14_project_directory_structure.md`](./14_project_directory_structure.md) · [`15_technology_stack.md`](./15_technology_stack.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Phase 1 — MVP

| Field | Detail |
|-------|--------|
| **Goal** | Complete physician workflow |

**Features**: Authentication · Patient Selection · Recording · Speech Recognition · Transcript · SOAP · Clinical Note · Clipboard · History · Settings

**Success Criteria**: Physician completes **one consultation** from recording to **MEDLEY copy**.

詳細: [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md)

**要確認**: EHR 表記 — MEDLEY CLINICS vs MEDLEY AI CLOUD — [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Phase 2 — Clinical Validation

| Field | Detail |
|-------|--------|
| **Goal** | Improve medical quality |

**Features**: Medical Validation · Confidence Score · Warnings · Revision Tracking · Transcript Review · Structured Medical Data

**Success Criteria**: Medical hallucination **approaches zero**.

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Phase 3 — Workflow Improvement

| Field | Detail |
|-------|--------|
| **Goal** | Reduce physician workload |

**Features**: Patient Summary · Previous Visit Summary · Timeline · Medication Summary · Follow-up Reminder · Future Visit Context

**Success Criteria**: Physician spends **less time reviewing history**.

---

# Phase 4 — Multi-document Generation

| Field | Detail |
|-------|--------|
| **Goal** | Generate multiple medical documents |

**Features**: Referral Letter · Medical Certificate · Patient Explanation · Insurance Forms · Long-term Care Opinion

**Future**: Dental Documents

**Success Criteria**: One consultation generates **multiple documents**.

詳細: [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# Phase 5 — Medical Intelligence

| Field | Detail |
|-------|--------|
| **Goal** | Understand longitudinal patient history |

**Features**: Timeline AI · Trend Analysis · Medication History · Problem List · Clinical Search · Medical Knowledge Graph

**Success Criteria**: Physicians quickly understand **years of medical history**.

---

# Phase 6 — Platform Expansion

| Field | Detail |
|-------|--------|
| **Goal** | Become the operating system for medical documentation |

**Expansion**: Dentistry · Pediatrics · Orthopedics · Dermatology · Surgery · Pharmacy · Nursing · Rehabilitation

**Success Criteria**: Multiple specialties share **one platform**.

---

# MVP Breakdown

| Sprint | Focus |
|--------|-------|
| **Sprint 1** | Authentication · Layout · Patient List |
| **Sprint 2** | Recording · Audio Upload · Speech Recognition |
| **Sprint 3** | Transcript · SOAP · Clinical Note |
| **Sprint 4** | History · Settings · Clipboard |
| **Sprint 5** | Testing · Bug Fixes · Deployment |

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Validation Stage

After MVP:

```
Real physicians → Real consultations → Daily feedback
    → Prompt improvement → Workflow improvement → Repeat
```

**No new feature before validation.**

---

# Success Metrics

| Metric | Target |
|--------|--------|
| Documentation Time | **50% Reduction** |
| Clinical Errors | **Zero** |
| Daily Usage | **80%+** |
| Physician Satisfaction | **80%+** |
| PMF | **Confirmed** |

**要確認**: 測定方法・ベースライン — パイロット開始前に確定

---

# Release Strategy

```
Internal Alpha → Private Beta → Pilot Clinic
    → Version 0.1 → Version 0.2 → Version 1.0
```

**Never skip validation stages.**

詳細: [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md) · [`11_deployment_architecture.md`](./11_deployment_architecture.md)

---

# Feature Prioritization

| Priority | Features |
|----------|----------|
| **Priority 1** | Recording · Speech Recognition · SOAP · Clinical Note |
| **Priority 2** | History · Revision · Validation |
| **Priority 3** | Referral · Timeline · Patient Summary |
| **Priority 4** | Knowledge Graph · Analytics · AI Memory |

**Everything not required for PMF is postponed.**

---

# Development Rules

Every sprint must produce **Working Software**.

Every feature must have: Tests · Documentation · Logging · Error Handling · Review

**No unfinished architecture.**

詳細: [`13_development_standards.md`](./13_development_standards.md) · [`12_logging_and_observability.md`](./12_logging_and_observability.md)

---

# Future Vision

```
Medical OS → Clinic → Hospital → Medical Group
    → Regional Healthcare → National Healthcare Platform
```

Architecture should support this journey **from the beginning**.

詳細: [`../02_PRODUCT_BIBLE/12_long_term_vision.md`](../02_PRODUCT_BIBLE/12_long_term_vision.md)

---

# Core Principle

**Build only what physicians need today.**

Design everything so **tomorrow's platform can grow naturally**.

Medical OS succeeds not by having the most features,

but by becoming **indispensable in daily clinical practice**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Version Roadmap | [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| Future Ideas | [`../07_ROADMAP/03_future_ideas.md`](../07_ROADMAP/03_future_ideas.md) |
| MVP Goal | [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) |
| AI Workflow | [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) |
| 次章 | [`17_api_design.md`](./17_api_design.md) |
