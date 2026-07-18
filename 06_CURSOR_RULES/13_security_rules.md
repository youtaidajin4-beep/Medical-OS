# Cursor Rules
# 13 — Security Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`12_code_review_rules.md`](./12_code_review_rules.md)

関連: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/19_security.md`](../05_SYSTEM_ARCHITECTURE/19_security.md) · [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md)

> **優先順位**: セキュリティ関連実装時は本書 + [`01_global_rules.md`](./01_global_rules.md) を必須適用。MVP 詳細 → [`10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

> **要確認**: 法務/セキュリティ監修 · RBAC（Medical Assistant / Read Only の MVP 0.1 実装）— [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# Purpose

This document defines the **security rules** that Cursor must always follow when implementing Medical OS.

Medical OS handles **highly sensitive medical information**.

**Security is not an optional feature.**

**Security is part of patient safety.**

**Every implementation must assume that attackers exist.**

---

# Security Philosophy

**Trust nothing. Validate everything. Log everything.**

**Protect patient data before protecting software.**

Every design decision should **minimize risk**.

---

# Security Principles

Medical OS follows:

```
Least Privilege → Defense in Depth → Zero Trust → Fail Secure → Audit Everything
```

**No single security mechanism should be trusted alone.**

---

# Authentication

All protected resources require:

```
Authentication → Authorization → Validation → Business Logic → Persistence
```

**Never reverse this order.**

詳細: [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md)

---

# Authorization

Use **Role-Based Access Control (RBAC)**.

Supported Roles: **Administrator · Physician · Medical Assistant · Read Only**

**Every endpoint explicitly declares permitted roles.**

**要確認**: Medical Assistant / Read Only を MVP 0.1 で実装するか

---

# Least Privilege

Every user receives **only the permissions required** for their role.

**Never grant administrator access by default.**

---

# Sensitive Data

Sensitive information includes:

Patient Name · Birth Date · Phone Number · Medical History · Transcript · SOAP · Clinical Notes · Audio Files · Authentication Tokens · API Keys · Database Credentials

**Never expose sensitive information to unauthorized users.**

---

# Secret Management

**Never hardcode:** API Keys · JWT Secrets · Database URLs · Encryption Keys · Passwords

Use: **Environment Variables · Secret Managers · Cloud Provider Secrets**

---

# Encryption

| Category | Standard |
|----------|----------|
| Data in Transit | **TLS 1.3** |
| Data at Rest | **AES-256** |
| JWT Signing | Strong Secret |
| Storage | Private Bucket |

**Encryption is mandatory.**

詳細: [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

---

# Input Validation

Every external input must be validated.

Examples: HTTP Requests · AI Responses · Environment Variables · Audio Metadata · File Uploads · Database IDs

**Never trust client input.**

---

# Output Validation

```
Before returning data → Verify Permissions → Sanitize Output → Remove Sensitive Fields → Return Response
```

**Never expose internal models directly.**

---

# SQL Injection

Always use: **Prisma ORM · Parameterized Queries**

**Never concatenate SQL strings.**

Raw SQL requires **explicit justification**.

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# XSS Protection

Escape user-generated content · Sanitize HTML · Use React's default escaping

**Avoid `dangerouslySetInnerHTML` unless absolutely necessary.**

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# CSRF Protection

For cookie-based authentication, use:

CSRF Tokens · SameSite Cookies · Secure Cookies · HttpOnly Cookies

---

# JWT Rules

| Token | Policy |
|-------|--------|
| Access Token | **15 Minutes** |
| Refresh Token | **30 Days** |
| Rotation | **Enabled** |

Store Refresh Tokens securely.

**Never expose tokens in logs.**

---

# Password Rules

| Item | Policy |
|------|--------|
| Minimum Length | **12 Characters** |
| Hash | **Argon2id** |

**Never store passwords in plaintext.**

**Never log passwords.**

---

# File Upload Security

Validate: File Type · File Size · Mime Type · Extension

**Future**: Virus Scan

**Reject executable files.**

---

# Audio Security

```
Uploaded audio → Private Storage → AI Processing → Optional Deletion
```

**Never expose direct storage URLs.**

詳細: [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

---

# Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Authentication | **5 Requests / Minute** |
| AI Endpoints | **30 Requests / Minute** |
| General API | **120 Requests / Minute** |

**Prevent abuse.**

---

# Prompt Injection Protection

Treat Transcript · Patient Speech · Uploaded Documents as **Untrusted Input**.

**Never allow transcript content to modify system behavior.**

詳細: [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# AI Safety

**Never send** to AI providers:

Secrets · Internal Prompts · Database Credentials · Internal Logs

**Only send the minimum required medical context.**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Logging Security

## Log

Request ID · User ID · Consultation ID · Errors · Latency

## Never log

Passwords · Tokens · Secrets · Patient Audio · Hidden AI Reasoning

**Sensitive values should be masked.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Audit Logging

Record: Login · Logout · Document Approval · Medical Record Changes · Permission Changes · Failed Authentication · Security Events

**Audit logs must be immutable.**

---

# Error Messages

Return **meaningful · safe · non-sensitive** messages.

**Bad:** `Database password invalid.`

**Good:** `Internal server error.`

**Internal details belong only in logs.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Dependency Security

Every dependency should be: Actively Maintained · Popular · Reviewed · Scanned

**Run dependency vulnerability scans regularly.**

---

# Environment Separation

```
Development → Staging → Production
```

**Secrets must never be shared across environments.**

詳細: [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) · [`15_deployment_rules.md`](./15_deployment_rules.md)

---

# Backup Security

Encrypt backups · Restrict access · Regularly verify restoration

**Backups contain medical data.**

**Treat them like production systems.**

---

# Incident Response

When a security issue is detected:

```
Log Event → Alert Team → Contain Issue → Investigate → Recover → Document → Prevent Recurrence
```

**Every incident should improve the system.**

---

# Future Security

Passkeys · Hardware Security Keys · Multi-Factor Authentication · Hospital SSO · Encryption Key Rotation · Data Loss Prevention · SIEM

**These belong to future versions.**

---

# Security Checklist

Before completing implementation, Cursor should verify:

Authentication · Authorization · Validation · Encryption · Logging · Audit · No Secrets · No Sensitive Output · Rate Limiting · Safe Error Handling

---

# Core Principle

**Security is not a feature.**

**Security is the foundation of trust.**

Medical OS exists because physicians trust it with patient information.

**Every implementation should strengthen that trust.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| MVP Security | [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) |
| Security 索引 | [`../05_SYSTEM_ARCHITECTURE/19_security.md`](../05_SYSTEM_ARCHITECTURE/19_security.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Security & Law (Domain) | [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md) |
| Global Rules | [`01_global_rules.md`](./01_global_rules.md) |
| Code Review Rules | [`12_code_review_rules.md`](./12_code_review_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| AI Prompt Rules | [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) |
| 次章 | [`14_performance_rules.md`](./14_performance_rules.md) |
