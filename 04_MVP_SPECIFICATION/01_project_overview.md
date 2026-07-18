# MVP Specification
# 01 — Project Overview

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md)

---

# Purpose

This document defines the scope of **Version 0.1**.

Version 0.1 exists for one reason only:

**Validate Product Market Fit.**

It is NOT designed to be a complete medical platform.

It is NOT an Electronic Health Record.

It is NOT a Hospital Information System.

It is the **smallest possible product** that solves one real problem.

---

# Product Name

**Medical OS** — Version 0.1

---

# Goal

Reduce physicians' documentation time after consultation.

Medical OS should assist physicians by **organizing consultation information** and generating **structured documentation**.

---

# Primary Target

Local internal medicine clinics.

Specifically:

- Clinic owners
- Solo physicians
- Small medical practices
- Physicians using cloud-based EHR systems
- **MEDLEY CLINICS** users (first verification target)

**EHR 表記**: MEDLEY CLINICS（Version 0.1 検証先）。Constitution は Kickoff v1.0 に追随更新済み。

詳細: [`../02_PRODUCT_BIBLE/05_target_user.md`](../02_PRODUCT_BIBLE/05_target_user.md) · [`../07_ROADMAP/04_implementation_kickoff.md`](../07_ROADMAP/04_implementation_kickoff.md)

---

# Product Position

Medical OS is **not an EHR**.

Medical OS works **beside an EHR**.

```
Patient
  ↓
Consultation
  ↓
Medical OS
  ↓
SOAP
  ↓
Clinical Note
  ↓
Copy
  ↓
MEDLEY CLINICS
```

---

# MVP Scope

## Included

- User Login
- Patient Selection
- Real-time Audio Recording
- Speech-to-Text
- Medical Information Extraction
- SOAP Generation
- Clinical Note Generation
- Physician Editing
- Copy to Clipboard
- Consultation History

## Excluded

- Referral Letter
- Medical Certificate
- Patient Explanation
- Insurance Documents
- FHIR
- HL7
- API Integration
- Prescription Generation
- Diagnosis Support
- Image Analysis
- Laboratory Interpretation
- Scheduling
- Billing
- Reception
- Pharmacy
- Dentistry
- Nursing

---

# User

**Primary User**: Physician

**Future Users**: Dentist · Pharmacist · Nurse · Medical Assistant

---

# Success Metrics

| Metric | Before | After / Target |
|--------|--------|----------------|
| Consultation Documentation | 5 minutes | **2 minutes or less** |
| Reduction | — | **50%+** |
| Critical Medical Errors | — | **0** |
| Medication Errors | — | **0** |
| Date Errors | — | **0** |
| Negation Errors | — | **0** |
| Physician Satisfaction | — | **80%+** |
| Daily Active Usage | — | **More than 80% of consultations** |

---

# Product Philosophy

Medical OS does **not** replace physicians.

Medical OS **reduces administrative burden**.

The physician always remains responsible for diagnosis and treatment.

Medical OS **organizes information**.

The physician **makes medical decisions**.

---

# Information Flow

```
Real-time Audio
  ↓
Speech Recognition
  ↓
Medical Information Extraction
  ↓
Structured Medical Data
  ↓
SOAP
  ↓
Clinical Note
  ↓
Physician Review
  ↓
Copy
  ↓
MEDLEY
```

詳細: [`02_user_flow.md`](./02_user_flow.md)

---

# Data Policy

| Data | Policy |
|------|--------|
| Audio | Temporary · Automatically deletable |
| Transcript | Stored |
| SOAP | Stored |
| Clinical Note | Stored |
| Revision History | Stored |
| Patient Identifier | Anonymous ID available |

Version 0.1 validation: **匿名化 · 模擬データ**（Constitution）

詳細: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) · [`07_database_design.md`](./07_database_design.md)

---

# Security

- Encrypted Communication
- Encrypted Storage
- Role-based Access
- Audit Logs
- Patient Consent Required
- Human Review Required
- **No AI Auto Approval**

詳細: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) · [`10_security.md`](./10_security.md)

---

# Version 0.1 Deliverables

- Login
- Patient List
- Consultation Screen
- Recording
- Real-time Transcript
- SOAP Generator
- Clinical Note Generator
- Editing Screen
- Copy Function
- History Screen
- Settings

---

# Version Roadmap

| Version | Scope |
|---------|-------|
| 0.2 | Referral Letter |
| 0.3 | Medical Certificate |
| 0.5 | Longitudinal Patient Summary |
| 1.0 | Medical OS Platform |

**要確認**: Product Bible · Domain Bible · [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# Core Principle

Version 0.1 is **not built to impress**.

Version 0.1 is **built to validate**.

Every feature must answer one question:

> **"Will this make physicians use Medical OS every day?"**

If the answer is no, **do not build it**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| ユーザーフロー | [`02_user_flow.md`](./02_user_flow.md) |
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
| Database Design | [`07_database_design.md`](./07_database_design.md) |
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| UI | [`14_ui_guideline.md`](./14_ui_guideline.md) |
| AI Workflow Architecture | [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Storage Architecture | [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md) |
| Deployment Architecture | [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) |
| Logging And Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Project Directory Structure | [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) |
| Technology Stack | [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) |
| Development Roadmap | [`../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md`](../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md) |
| AI Service Architecture | [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md) |
| Backend API Architecture | [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md) |
| System Architecture | [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md) |
| AI Architecture | [`../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md`](../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md) |
| Backend Architecture | [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) |
| Frontend Architecture | [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) |
| 決定ログ | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
