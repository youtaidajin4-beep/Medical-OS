# MVP Specification
# 04 — Non-Functional Requirements

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`03_functional_requirements.md`](./03_functional_requirements.md)

Cursor パフォーマンスルール: [`../06_CURSOR_RULES/14_performance_rules.md`](../06_CURSOR_RULES/14_performance_rules.md)

---

# Purpose

This document defines all **non-functional requirements** for Medical OS Version 0.1.

While functional requirements describe **"what the system does,"**  
non-functional requirements define **"how the system should behave."**

These requirements ensure **reliability, security, performance, and trust**.

---

# Design Principles

Medical OS is a **medical support system**.

Therefore, **Reliability · Safety · Performance · Security** must always take priority over adding new features.

---

# Performance

| Operation | Target |
|-----------|--------|
| Login | < **2 seconds** |
| Patient Selection | < **1 second** |
| Recording Start | < **1 second** |
| Speech Recognition | **Real-time** (max delay **2 seconds**) |
| SOAP Generation | < **10 seconds** (ideal < **5 seconds**) |
| Clinical Note Generation | < **10 seconds** |
| Copy to Clipboard | **Instant** |

詳細: [`03_functional_requirements.md`](./03_functional_requirements.md)

---

# Availability

**Target Availability**: **99.9%**

- Scheduled maintenance should be announced
- Unexpected downtime should be minimized

---

# Reliability

Medical OS must **never lose**:

- Recorded Audio
- Transcript
- SOAP
- Clinical Note
- Revision History

**Every consultation must be recoverable.**

---

# Data Integrity

Every generated document must preserve:

- Patient
- Consultation
- Timestamp
- Revision
- Approval Status

**No document should be overwritten without history.**

---

# Security

## Communication

- **HTTPS**
- **TLS 1.3** minimum

## Stored Data

- Encrypted — **AES-256** minimum

## Passwords

- Never stored as plain text
- Hash: **Argon2** or **bcrypt**

## Authentication

- Secure Session Management
- Automatic Timeout
- Remember Login (Optional)

詳細: [`10_security.md`](./10_security.md) · [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md)

---

# Privacy

Medical OS handles sensitive healthcare information.

The following requires the **highest level of protection**:

- Patient Name · Address · Phone Number · Birth Date
- Medical Record · Diagnosis · Medication · Laboratory Results
- Audio Recording · Transcript · Generated Documents

---

# Audio Policy

**Default**: Audio may be automatically deleted after successful processing.

- Configurable by administrator
- **Transcript remains available**

---

# AI Safety

AI must **never**:

- Invent facts
- Guess diagnoses
- Guess medication
- Guess laboratory values
- Guess dates
- Guess allergies
- Guess procedures

**Unknown information must remain unknown.**

---

# Human Review

Every AI-generated document requires **physician review**.

- **No automatic approval**
- **No automatic EHR submission**

---

# Audit Log

Every important action must be logged:

- Login · Logout
- Recording Start · Recording Stop
- SOAP Generation · Clinical Note Generation
- Manual Edit · Copy · Delete
- Settings Change

---

# Scalability

```
Version 0.1     Single Clinic
  ↓
Future          Multi Clinic
  ↓
                Regional Network
  ↓
                National Platform
```

Architecture should support **future expansion**.

---

# Browser Support

**Latest**: Google Chrome · Microsoft Edge · Safari · Firefox

- Mobile support is **optional** in Version 0.1
- **Desktop-first**

---

# Accessibility

- Readable fonts
- Large buttons
- Keyboard shortcuts
- High contrast
- Minimal visual noise

Designed for **long daily use**.

---

# Backup

| Item | Policy |
|------|--------|
| Automatic Backup | Daily |
| Version History | Enabled |
| Recovery | Supported |

**No consultation should be permanently lost.**

---

# Logging

- System Logs
- Application Logs
- Error Logs
- AI Processing Logs
- Performance Logs
- Audit Logs

All logs should be **searchable**.

---

# Error Recovery

| Failure | Behavior |
|---------|----------|
| AI generation fails | Transcript remains · Physician can retry |
| Recording fails | Partial recording preserved |
| Browser closes | Recover unfinished consultation |

詳細: [`11_error_handling.md`](./11_error_handling.md)

---

# Monitoring

Monitor:

- CPU · Memory · Response Time
- API Errors · Speech Recognition Errors
- AI Processing Time · Storage Capacity

---

# Maintainability

Code should be:

- Modular · Readable · Testable · Loosely Coupled

Every module should be **replaceable without affecting the entire system**.

---

# Observability

Every AI process should be **traceable**:

```
Input → Transcript → Structured Data → SOAP → Clinical Note → Revision
```

Developers must understand **where failures occur**.

---

# Future Compatibility

Medical OS should remain compatible with:

- FHIR · HL7 · MEDLEY · Other EHRs · Future AI Models

Architecture must allow **replacing AI providers without rewriting the application**.

---

# Quality Goals

**Fast · Reliable · Secure · Predictable · Calm · Invisible**

Medical-grade software should **never surprise physicians**.

---

# Core Principle

Medical OS is **trusted software**.

Trust is built through **Speed · Reliability · Safety · Transparency** —  
**not through flashy AI features.**

Every architectural decision should **strengthen physician trust**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
| Project Overview | [`01_project_overview.md`](./01_project_overview.md) |
| Screen Specification | [`05_screen_specification.md`](./05_screen_specification.md) |
| Component Specification | [`06_component_specification.md`](./06_component_specification.md) |
| API Specification | [`08_api_specification.md`](./08_api_specification.md) |
| AI Pipeline | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| Security | [`10_security.md`](./10_security.md) |
| Error Handling | [`11_error_handling.md`](./11_error_handling.md) |
| Test Plan | [`12_test_plan.md`](./12_test_plan.md) |
| Cursor Performance Rules | [`../06_CURSOR_RULES/14_performance_rules.md`](../06_CURSOR_RULES/14_performance_rules.md) |
| MVP Goal | [`13_mvp_goal.md`](./13_mvp_goal.md) |
| UI Guideline | [`14_ui_guideline.md`](./14_ui_guideline.md) |
| Database Design | [`07_database_design.md`](./07_database_design.md) |
| Database Architecture | [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md) |
| Backend API Architecture | [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md) |
| セキュリティ索引 | [`../05_SYSTEM_ARCHITECTURE/19_security.md`](../05_SYSTEM_ARCHITECTURE/19_security.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Logging And Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| System Architecture | [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md) |
| Backend Architecture | [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) |
| Frontend Architecture | [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md) |
