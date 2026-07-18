# System Architecture
# 06 — Backend API Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`05_database_architecture.md`](./05_database_architecture.md)

MVP エンドポイント一覧: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

Cursor バックエンドルール: [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md)

---

# Purpose

This document defines how the **Backend API layer** of Medical OS Version 0.1 is designed.

The Backend API is the communication hub between:

```
Frontend → Business Logic → AI Engine → Database → Storage
```

**No component should bypass this layer.**

---

# API Design Philosophy

Medical OS APIs should represent **business workflows**, not database tables.

| Bad | Good |
|-----|------|
| `GET /soap` | Start Consultation |
| `POST /transcript` | Generate SOAP |
| `GET /patient` | Approve Consultation |

**The API should describe physician workflow.**

---

# API Style

| Item | Value |
|------|-------|
| Architecture | REST |
| Transport | HTTPS |
| Payload | JSON |
| Authentication | JWT |
| Encoding | UTF-8 |

---

# API Version

| Version | Base Path |
|---------|-----------|
| Current | `/api/v1/` |
| Future | `/api/v2/` |

**Breaking changes require a new version.**

Never silently change API behavior.

---

# Request Flow

```
Client → Authentication → Authorization → Validation
    → Business Service → AI → Database → Response
```

Every request follows the same lifecycle.

詳細: [`03_backend_architecture.md`](./03_backend_architecture.md)

---

# API Modules

Authentication API · User API · Patient API · Consultation API · Recording API · Transcript API · AI API · SOAP API · Clinical Note API · History API · Settings API · Audit API · Health API

---

# Authentication API

| Method | Path |
|--------|------|
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/refresh` |
| GET | `/api/v1/auth/me` |

**Responsibilities**: Authentication · Session · Current User

詳細: [`09_authentication_architecture.md`](./09_authentication_architecture.md)

---

# Patient API

| Method | Path |
|--------|------|
| GET | `/api/v1/patients` |
| GET | `/api/v1/patients/{id}` |
| POST | `/api/v1/patients` |
| PUT | `/api/v1/patients/{id}` |
| DELETE | `/api/v1/patients/{id}` |

**Version 0.1**: Delete may be disabled.

---

# Consultation API

| Method | Path |
|--------|------|
| POST | `/api/v1/consultations` |
| GET | `/api/v1/consultations/{id}` |
| PUT | `/api/v1/consultations/{id}` |
| GET | `/api/v1/consultations/history` |
| PATCH | `/api/v1/consultations/{id}/complete` |

---

# Recording API

| Method | Path |
|--------|------|
| POST | `/api/v1/recording/start` |
| POST | `/api/v1/recording/stop` |
| POST | `/api/v1/audio/upload` |
| GET | `/api/v1/audio/status/{id}` |

詳細: [`10_storage_architecture.md`](./10_storage_architecture.md)

---

# Transcript API

| Method | Path |
|--------|------|
| POST | `/api/v1/transcript/generate` |
| GET | `/api/v1/transcript/{consultationId}` |
| PUT | `/api/v1/transcript/{consultationId}` |

**Transcript edits are physician-controlled.**

---

# AI API

| Method | Path |
|--------|------|
| POST | `/api/v1/ai/extract` |
| POST | `/api/v1/ai/soap` |
| POST | `/api/v1/ai/clinical-note` |
| POST | `/api/v1/ai/retry` |

**Future**: Referral · Summary · Timeline

詳細: [`04_ai_architecture.md`](./04_ai_architecture.md)

---

# SOAP API

| Method | Path |
|--------|------|
| GET | `/api/v1/soap/{consultationId}` |
| PUT | `/api/v1/soap/{consultationId}` |
| POST | `/api/v1/soap/approve` |

---

# Clinical Note API

| Method | Path |
|--------|------|
| GET | `/api/v1/clinical-note/{consultationId}` |
| PUT | `/api/v1/clinical-note/{consultationId}` |
| POST | `/api/v1/clinical-note/approve` |

---

# History API

| Method | Path |
|--------|------|
| GET | `/api/v1/history` |
| GET | `/api/v1/history/{consultationId}` |

**Supports**: Pagination · Search · Sorting · Filtering

---

# Settings API

| Method | Path |
|--------|------|
| GET | `/api/v1/settings` |
| PUT | `/api/v1/settings` |

---

# Audit API

| Method | Path |
|--------|------|
| GET | `/api/v1/audit` |

**Admin only.**

---

# Health API

| Method | Path |
|--------|------|
| GET | `/api/v1/health` |
| GET | `/api/v1/health/database` |
| GET | `/api/v1/health/storage` |
| GET | `/api/v1/health/ai` |

Used by monitoring systems.

---

# Standard Response

**Success**

```json
{
  "success": true,
  "data": {},
  "message": null
}
```

**Failure**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Patient not found."
  }
}
```

---

# Error Codes

`AUTH_INVALID` · `AUTH_EXPIRED` · `PATIENT_NOT_FOUND` · `CONSULTATION_NOT_FOUND` · `RECORDING_FAILED` · `TRANSCRIPT_FAILED` · `SOAP_FAILED` · `NOTE_FAILED` · `DATABASE_ERROR` · `UNKNOWN_ERROR`

Errors should be **standardized**.

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Validation

Every endpoint validates:

```
Authentication → Permission → Request Schema → Business Rules → Database → Response
```

**No invalid request reaches business logic.**

---

# Rate Limiting

| Category | Limit |
|----------|-------|
| Authentication | 5 requests/minute |
| AI Endpoints | 30 requests/minute |
| General APIs | 120 requests/minute |
| Admin APIs | Higher limit |

---

# Timeout Policy

| Operation | Timeout |
|-----------|---------|
| Authentication | 5 sec |
| Database | 10 sec |
| Speech Recognition | 120 sec |
| SOAP | 30 sec |
| Clinical Note | 30 sec |
| Health | 2 sec |

---

# API Security

HTTPS · JWT · RBAC · Input Validation · Output Validation · Rate Limiting · Request Logging · Audit Logging · CORS · Secure Headers

詳細: [`19_security.md`](./19_security.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Logging

Every request stores:

Request ID · User · Endpoint · Status · Latency · Consultation ID · Error · Timestamp

---

# Idempotency

**Supported for**

Create Consultation · Upload Audio · Generate SOAP · Generate Clinical Note

**Duplicate requests should never create duplicate medical records.**

---

# Future APIs

Referral API · Certificate API · Timeline API · FHIR API · HL7 API · Knowledge Graph API · Analytics API · Notification API

**Excluded from Version 0.1.**

---

# Core Principle

The API should describe **physician workflow**, not implementation details.

Every endpoint should exist because it solves a **real clinical problem**—not because it matches a database table.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Cursor Backend Rules | [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) |
| MVP API Specification | [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) |
| Database Architecture | [`05_database_architecture.md`](./05_database_architecture.md) |
| User Flow | [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md) |
| 次章 | [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) |
