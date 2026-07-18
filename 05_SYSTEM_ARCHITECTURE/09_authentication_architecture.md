# System Architecture
# 09 — Authentication Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md)

関連: [`03_backend_architecture.md`](./03_backend_architecture.md) · [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Purpose

This document defines the **authentication and authorization architecture** of Medical OS Version 0.1.

Medical OS manages highly sensitive medical information.

Therefore, authentication is **not merely a login function**.

It is the **first layer of patient safety**.

---

# Design Principles

Authentication should be:

| Principle | Meaning |
|-----------|---------|
| Secure | Protect patient data and physician identity |
| Simple | Minimal friction for clinical workflow |
| Reliable | Consistent session behavior |
| Fast | No perceptible delay at login |
| Invisible | Physicians spend time treating patients, not logging into systems |

---

# Authentication Flow

```
User Login
    ↓
Credential Validation
    ↓
JWT Generation
    ↓
Refresh Token Generation
    ↓
Secure Session
    ↓
Protected API Access
    ↓
Automatic Token Refresh
    ↓
Logout
```

---

# Authentication Method

## Version 0.1

| Component | Detail |
|-----------|--------|
| Credentials | Email · Password |
| Access | JWT Access Token |
| Session | Refresh Token |

## Future

Passkey · SSO · Google Workspace · Microsoft Entra ID · Hospital Identity Provider · Biometric Authentication

---

# Login Process

```
User
    ↓
Enter Email
    ↓
Enter Password
    ↓
Backend Validation
    ↓
Password Verification
    ↓
Generate JWT
    ↓
Generate Refresh Token
     ↓
Return Session
```

---

# JWT Structure

## Access Token

| Field | Detail |
|-------|--------|
| Purpose | API Authentication |
| Lifetime | **15 Minutes** |
| Contains | User ID · Role · Clinic ID · Issued At · Expiration |

---

# Refresh Token

| Field | Detail |
|-------|--------|
| Purpose | Issue new Access Tokens |
| Lifetime | **30 Days** |
| Storage | HttpOnly Cookie **or** Secure Storage |
| Rotation | **Enabled** — every refresh generates a new refresh token |

---

# Session Management

```
After login
    ↓
JWT Stored
    ↓
API Requests Authorized
    ↓
Token Expiration Checked
    ↓
Automatic Refresh
    ↓
Continue Session
```

Physicians should **rarely notice** authentication.

---

# Logout

```
Invalidate Refresh Token
    ↓
Delete Access Token
    ↓
Delete Local Session
    ↓
Redirect to Login
```

All future API requests become **unauthorized**.

---

# Password Policy

| Rule | Value |
|------|-------|
| Minimum Length | **12 Characters** |
| Requirements | Uppercase · Lowercase · Number · Special Character |

**Future**: Passwordless Login

---

# Password Storage

Passwords are **never stored**.

Only **password hashes**.

| Method | Status |
|--------|--------|
| **Argon2id** | Recommended |
| bcrypt | Alternative |

Plain text passwords are **prohibited**.

---

# Authorization

Medical OS uses **Role-Based Access Control (RBAC)**.

## Roles (Version 0.1)

| Role | Scope |
|------|-------|
| Administrator | Full Access |
| Physician | Consultation · SOAP · Clinical Notes · Patients |
| Medical Assistant | Patient Management · Scheduling (Future) |
| Read Only | History · Documents — **No Editing** |

## Future Roles

Dentist · Pharmacist · Nurse · Clinic Manager

---

# Permission Matrix

| Resource | Administrator | Physician | Medical Assistant | Read Only |
|----------|---------------|-----------|-------------------|-----------|
| Consultation | ✓ | ✓ | — | Read |
| SOAP | ✓ | ✓ | — | Read |
| Clinical Notes | ✓ | ✓ | — | Read |
| Patients | ✓ | ✓ | ✓ | Read |
| Settings | ✓ | — | — | — |
| Audit Logs | ✓ | — | — | — |

**要確認**: MVP 0.1 で Medical Assistant / Read Only を実装するか — [`../04_MVP_SPECIFICATION/03_functional_requirements.md`](../04_MVP_SPECIFICATION/03_functional_requirements.md)

---

# Protected Resources

Require Authentication:

Patient Data · Consultations · Transcript · SOAP · Clinical Notes · History · Settings · Audit Logs

**No medical endpoint is public.**

---

# Token Validation

Every request:

```
Verify Signature
    ↓
Check Expiration
    ↓
Verify User
    ↓
Verify Role
    ↓
Continue
```

If any validation fails → **401 Unauthorized**

---

# Session Timeout

| Rule | Value |
|------|-------|
| Inactive Session | **30 Minutes** (Configurable) |
| Long Recording Sessions | **Remain Active** |

Automatic logout should **never interrupt an active consultation**.

---

# Device Management

**Future**: View Active Devices · Logout All Devices · Device Name · Device Location · Last Activity

---

# Failed Login Protection

```
Failed Attempts: 5
    ↓
Temporary Lock: 15 Minutes
```

**Future**: CAPTCHA · Adaptive Authentication · IP Risk Analysis

---

# Security Headers

HTTPS Required · HSTS · Content Security Policy · X-Frame-Options · X-Content-Type-Options · Referrer Policy · Permissions Policy

詳細: [`19_security.md`](./19_security.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Multi-Clinic Support

**Future**:

```
One Physician → Multiple Clinics → Clinic Context Selected → Permissions Updated
```

---

# Audit Logging

Log: Login · Logout · Password Change · Failed Login · Token Refresh · Role Change · Permission Change

Each entry: Timestamp · IP Address · Device

詳細: [`05_database_architecture.md`](./05_database_architecture.md) — AuditLogs

---

# Authentication APIs

| Method | Endpoint |
|--------|----------|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/refresh` |
| GET | `/api/v1/auth/me` |
| POST | `/api/v1/auth/change-password` |

**Future**: `POST /api/v1/auth/passkey` · `POST /api/v1/auth/sso`

**要確認**: MVP 08 API 仕様との統合 — [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Future Authentication

Passkey · FIDO2 · Biometric · Hospital SSO · OAuth · OpenID Connect · Azure AD · Google Workspace · Medical Federation Login

---

# Authentication Principles

Authentication should:

- Protect Patients
- Protect Physicians
- Protect Medical Records
- Remain Invisible
- Remain Reliable
- **Never interrupt patient care**

---

# Core Principle

Authentication is **not about protecting software**.

Authentication is about **protecting patient trust**.

Every login grants access to someone's medical history.

That responsibility must guide **every authentication decision**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| MVP Security | [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) |
| MVP API | [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) |
| 次章 | [`10_storage_architecture.md`](./10_storage_architecture.md) |
