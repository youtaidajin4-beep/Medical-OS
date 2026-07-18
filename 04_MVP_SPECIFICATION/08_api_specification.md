# MVP Specification
# 08 — API Specification

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`07_database_design.md`](./07_database_design.md)

---

# Purpose

This document defines all **backend APIs** required for Medical OS Version 0.1.

The API is designed around the **physician workflow**.

Every endpoint should exist because it supports a real clinical workflow.

**If an endpoint does not directly support the MVP, it should not exist.**

---

# API Design Principles

Medical OS follows **RESTful API** principles.

Future versions may support GraphQL or gRPC.

Version 0.1 uses **JSON over HTTPS**.

| Item | Value |
|------|-------|
| Authentication | JWT Bearer Token |
| Content Type | `application/json` |
| Base Path | `/api/v1/` |

All endpoints below are relative to `/api/v1/` unless noted.

---

# Authentication APIs

## Login

`POST /auth/login`

**Purpose**: Authenticate physician.

**Request**: Email · Password

**Response**: Access Token · Refresh Token · User Information

---

## Logout

`POST /auth/logout`

**Purpose**: Invalidate current session.

---

## Refresh Token

`POST /auth/refresh`

**Purpose**: Issue new access token.

---

# User APIs

## Get Current User

`GET /users/me`

**Returns**: User Profile · Role · Preferences

---

## Update Profile

`PUT /users/me`

**Updates**: Name · Language · Settings

---

# Patient APIs

## Patient List

`GET /patients`

**Purpose**: Retrieve available patients.

**Supports**: Pagination · Search · Sorting

---

## Patient Detail

`GET /patients/{patientId}`

**Returns**: Basic Information

**Future**: Medical Summary · Medication · Allergies · Timeline

---

# Consultation APIs

## Create Consultation

`POST /consultations`

**Purpose**: Create new consultation session.

**Returns**: Consultation ID · Status

---

## Get Consultation

`GET /consultations/{id}`

**Returns**: Consultation Details · Transcript · SOAP · Clinical Note

---

## Consultation History

`GET /consultations/history`

**Supports**: Search · Date Filter · Patient Filter · Status Filter

---

# Recording APIs

## Start Recording

`POST /recording/start`

**Purpose**: Start consultation recording.

**Response**: Recording Session ID · Recording Status

---

## Stop Recording

`POST /recording/stop`

**Purpose**: Finish recording.

Automatically triggers AI pipeline.

---

## Upload Audio

`POST /audio/upload`

**Purpose**: Upload recorded audio.

**Returns**: Audio ID · Processing Status

---

# Speech Recognition APIs

## Start Transcription

`POST /transcription/start`

**Purpose**: Start speech recognition.

**Input**: Audio ID

---

## Get Transcript

`GET /transcription/{consultationId}`

**Returns**: Transcript · Confidence Score · Language · Processing Status

---

# AI Processing APIs

## Extract Medical Information

`POST /ai/extract`

**Purpose**: Convert transcript into structured medical data.

**Returns**: Structured JSON · Chief Complaint · Assessment · Plan · Medication · Findings

---

## Generate SOAP

`POST /ai/soap`

**Input**: Consultation ID

**Returns**: SOAP

---

## Generate Clinical Note

`POST /ai/clinical-note`

**Returns**: Clinical Documentation

---

# Future AI APIs

Referral Letter · Medical Certificate · Patient Summary · Timeline Summary

**Intentionally excluded from Version 0.1.**

---

# SOAP APIs

## Get SOAP

`GET /soap/{consultationId}`

---

## Update SOAP

`PUT /soap/{consultationId}`

**Purpose**: Save physician edits.

---

# Clinical Note APIs

## Get Clinical Note

`GET /clinical-note/{consultationId}`

---

## Update Clinical Note

`PUT /clinical-note/{consultationId}`

**Purpose**: Save physician edits.

---

# Copy APIs

**Version 0.1**: Clipboard copy occurs on the **client**. No backend API required.

**Future**: Clipboard logging may be added.

---

# History APIs

## Consultation List

`GET /history`

**Supports**: Pagination · Search · Date Range · Patient

---

## Consultation Detail

`GET /history/{consultationId}`

**Returns**: Transcript · SOAP · Clinical Note · Revision History

---

# Settings APIs

## Get Settings

`GET /settings`

---

## Update Settings

`PUT /settings`

**Settings**: Language · Theme · Recording Policy · Audio Deletion · Storage Policy

---

# Audit APIs

## Audit Logs

`GET /audit`

**Admin Only**

**Returns**: User Actions — Login · Recording · Editing · Generation · Copy · Delete

---

# Response Format

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
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

# HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 429 | Rate Limit |
| 500 | Internal Server Error |

---

# API Security

- JWT Authentication
- HTTPS Only
- Rate Limiting
- Request Validation
- Input Sanitization
- Audit Logging
- Role-based Authorization

詳細: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) · [`10_security.md`](./10_security.md)

---

# Versioning

All APIs should support versioning.

| Version | Base Path |
|---------|-----------|
| Current | `/api/v1/` |
| Future | `/api/v2/` |

**Breaking changes must never affect existing clients.**

---

# Future APIs

FHIR Export · HL7 Export · MEDLEY Integration · AI Feedback · Knowledge Graph · Prompt Management · Medical Timeline

**These belong to Version 2 and beyond.**

---

# Core Principle

APIs should reflect **physician workflow**—not database structure.

Every endpoint must answer a **real clinical need**.

If an endpoint exists only because it is technically convenient, it should be **redesigned or removed**.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Database Design | [`07_database_design.md`](./07_database_design.md) |
| Functional Requirements | [`03_functional_requirements.md`](./03_functional_requirements.md) |
| User Flow | [`02_user_flow.md`](./02_user_flow.md) |
| 次章 | [`09_ai_pipeline.md`](./09_ai_pipeline.md) |
| AI Architecture | [`../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md`](../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md) |
| Backend Architecture | [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md) |
| Cursor Backend Rules | [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) |
| Backend API Architecture | [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md) |
| Authentication Architecture | [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md) |
| Storage Architecture | [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md) |
| Deployment Architecture | [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) |
| Logging And Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Project Directory Structure | [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) |
| Technology Stack | [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) |
| アーキテクチャ索引 | [`../05_SYSTEM_ARCHITECTURE/17_api_design.md`](../05_SYSTEM_ARCHITECTURE/17_api_design.md) |
