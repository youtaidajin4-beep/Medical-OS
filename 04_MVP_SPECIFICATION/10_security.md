# MVP Specification
# 10 — Security

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`09_ai_pipeline.md`](./09_ai_pipeline.md)

Cursor セキュリティルール: [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md)

---

# Purpose

This document defines the **security architecture** for Medical OS Version 0.1.

Medical OS handles **highly sensitive medical information**.

Security is therefore a **product requirement**, not an optional feature.

Every design decision must prioritize:

```
Patient Safety
    ↓
Medical Safety
    ↓
Information Security
    ↓
System Convenience
```

---

# Security Principles

Medical OS follows five security principles.

1. Least Privilege
2. Zero Trust
3. Encryption Everywhere
4. Audit Everything
5. Human Approval Required

---

# Authentication

| Item | Policy |
|------|--------|
| Method | JWT Access Token · Refresh Token |
| Transport | HTTPS Only |
| Password Hash | Argon2 or bcrypt |

**Minimum Password Policy**

- 12+ characters
- Uppercase
- Lowercase
- Number
- Special Character

**Future**: Multi-Factor Authentication · Single Sign-On · Passkey

---

# Authorization

Every request requires authentication.

**Role-Based Access Control (RBAC)**

| Role | Version 0.1 |
|------|-------------|
| Administrator | ✓ |
| Physician | ✓ |
| Medical Assistant | ✓ |
| Read Only | ✓ |

**Future**: Dentist · Pharmacist · Nurse · Clinic Manager

Each role should access only the **minimum required information**.

---

# Patient Data Protection

Medical OS stores:

- Patient Name
- Date of Birth
- Medical History
- Consultation
- Transcript
- SOAP
- Clinical Notes

These are classified as **highly sensitive medical information**.

Protection level must remain at the **highest standard**.

**Version 0.1**: 匿名化・模擬データ検証（Constitution）— **要確認**: 本番運用時のデータ分類

---

# Encryption

## Data in Transit

| | |
|---|---|
| Protocol | HTTPS · TLS 1.3 |
| Required | Yes |

## Data at Rest

| | |
|---|---|
| Algorithm | AES-256 |
| Required | Yes |

## Backups

| | |
|---|---|
| Encryption | Required |

---

# Audio Security

**Version 0.1 Policy**

```
Recording → Temporary Storage → Speech Recognition → AI Processing → Optional Automatic Deletion
```

The physician or administrator may configure:

- Auto Delete
- Keep Audio
- Retention Period

---

# Transcript Security

Transcript **remains stored**.

**Reason**

- Medical verification
- Future AI comparison
- Revision history
- Quality improvement

Transcript access requires authentication.

---

# AI Security

Medical OS **never sends patient information to AI providers for model training**.

AI providers must support:

- No Training
- Zero Data Retention
- Enterprise Privacy

**Patient information must never be used to improve external AI models.**

詳細: [`09_ai_pipeline.md`](./09_ai_pipeline.md) · [`../02_PRODUCT_BIBLE/09_ai_principles.md`](../02_PRODUCT_BIBLE/09_ai_principles.md)

---

# Human Approval

AI never finalizes documentation.

**Workflow**

```
Generate → Review → Edit → Approve → Copy → EHR
```

**Human approval is mandatory.**

---

# Audit Logging

Every important action must be recorded.

Login · Logout · Recording Start · Recording Stop · SOAP Generation · Clinical Note Generation · Transcript Access · Manual Edit · Copy · Delete · Settings Change · Permission Change

**Audit logs cannot be modified by normal users.**

詳細: [`07_database_design.md`](./07_database_design.md) — AuditLogs テーブル

---

# Session Management

| Item | Policy |
|------|--------|
| Automatic Session Timeout | 30 minutes (Configurable) |
| Logout All Devices | Supported |
| Refresh Token Rotation | Enabled |

---

# API Security

- JWT Authentication
- Rate Limiting
- Request Validation
- Input Sanitization
- Output Validation
- CSRF Protection
- CORS Restriction
- HTTPS Only

詳細: [`08_api_specification.md`](./08_api_specification.md)

---

# Database Security

- Prepared Statements
- Parameterized Queries
- Encrypted Backups
- Access Logging
- No Plain Text Passwords
- No Direct Database Access

詳細: [`07_database_design.md`](./07_database_design.md)

---

# File Storage

| Asset | Policy |
|-------|--------|
| Audio | Private Storage |
| Transcript | Private Storage |
| Generated Documents | Private Storage |

**No public URL should expose patient information.**

---

# Error Handling

System errors must **never expose**:

- Database structure
- API keys
- Stack traces
- Internal server paths
- LLM prompts

Errors should be logged internally and displayed safely to users.

---

# AI Prompt Security

Medical prompts should never expose:

- API Keys
- Patient IDs
- Internal Configuration
- Secrets

Prompt injection attempts should be **detected and rejected**.

---

# Monitoring

Monitor:

- Login Failures
- Unauthorized Access
- API Errors
- Storage Usage
- Recording Failures
- AI Processing Failures
- Suspicious Activities

Administrators should receive alerts for critical events.

---

# Compliance

Medical OS should be designed with **future compliance** in mind.

**Target Standards**

- Japanese Personal Information Protection Act
- Medical Information System Security Guidelines
- FHIR Compatibility
- HL7 Compatibility

**Future**: ISO 27001 · SOC2 · HIPAA (International Expansion)

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md)

**法的判断を確定しない。** 法務・セキュリティ監修: **要確認**

---

# Disaster Recovery

| Item | Policy |
|------|--------|
| Automatic Backup | Daily |
| Backup Encryption | Required |
| Recovery Testing | Monthly |
| Recovery Time Objective (RTO) | Less than 4 hours |
| Recovery Point Objective (RPO) | Less than 24 hours |

---

# Future Security Features

Multi-Factor Authentication · Passkey Login · Biometric Authentication · Hardware Security Keys · AI Anomaly Detection · Data Loss Prevention · Device Trust

---

# Security Philosophy

Security should **not** make physicians' work harder.

Security should protect patients **silently**.

Physicians should rarely notice security, but patients should always benefit from it.

---

# Core Principle

Medical OS earns **trust before it earns efficiency**.

Every security decision should answer one question:

> "If this patient's medical information were my own, would I feel safe?"

If the answer is not **absolutely yes**, the implementation must be **redesigned**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Non-Functional Requirements | [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) |
| AI Pipeline | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| Domain Bible — Security & Law | [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md) |
| アーキテクチャ索引 | [`../05_SYSTEM_ARCHITECTURE/19_security.md`](../05_SYSTEM_ARCHITECTURE/19_security.md) |
| Cursor Security Rules | [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Storage Architecture | [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md) |
| Deployment Architecture | [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) |
| Logging And Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| 次章 | [`11_error_handling.md`](./11_error_handling.md) |
