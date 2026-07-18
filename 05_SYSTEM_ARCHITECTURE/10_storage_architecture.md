# System Architecture
# 10 — Storage Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`09_authentication_architecture.md`](./09_authentication_architecture.md)

関連: [`05_database_architecture.md`](./05_database_architecture.md) · [`03_backend_architecture.md`](./03_backend_architecture.md) · [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Purpose

This document defines how Medical OS **stores, manages, protects, and deletes files**.

Unlike traditional medical systems, Medical OS stores both **structured medical information** and **temporary consultation audio**.

The storage architecture must be:

| Principle | Meaning |
|-----------|---------|
| Secure | Private buckets · encryption · signed access |
| Scalable | Separate binary files from structured data |
| Traceable | Metadata · lifecycle · audit |
| Cost-efficient | Delete temporary audio · store references only |
| Compliant | No patient names in filenames · retention policy |

---

# Storage Philosophy

Medical OS separates **Medical Data** and **Binary Files**.

```
Database  →  Stores information
Storage   →  Stores files
```

This separation keeps the system **scalable**.

---

# Storage Architecture

```
Consultation
    ↓
Audio Recording
    ↓
Object Storage
    ↓
Speech Recognition
    ↓
Transcript
    ↓
Structured Medical Data
    ↓
SOAP
    ↓
Clinical Note
    ↓
Optional Audio Deletion
```

---

# Storage Layers

Medical OS consists of **four storage layers**.

| Layer | Purpose |
|-------|---------|
| **Layer 1** | Temporary Audio Storage |
| **Layer 2** | Permanent Database |
| **Layer 3** | Document Storage |
| **Layer 4** | Backup Storage |

---

# Temporary Audio Storage

| Field | Detail |
|-------|--------|
| Purpose | Store recordings during AI processing |
| Technology | **Cloudflare R2** or **AWS S3** — **要確認** |
| Recommended Folder | `/audio/` |

## Lifecycle

```
Recording → Upload → Speech Recognition → AI Processing → Deletion (Optional)
```

**Audio is NOT the permanent medical record.**

---

# Audio File Structure

```
/audio
    /clinic_id
        /2026
            /07
                consultation_uuid.webm
```

## Metadata

Consultation ID · Physician ID · Duration · File Size · Created Time · Status

---

# Supported Formats

| Status | Format |
|--------|--------|
| **Preferred** | WebM |
| Supported | WAV · MP3 · M4A |
| Future | AAC · FLAC |

**Video recording is intentionally excluded.**

---

# Transcript Storage

Transcript is stored in **PostgreSQL**.

| Property | Detail |
|----------|--------|
| Permanent | ✓ |
| Versioned | ✓ |
| Searchable | ✓ |
| Linked | Source consultation |

**Transcript** replaces audio as the **primary AI input** after processing.

詳細: [`05_database_architecture.md`](./05_database_architecture.md) · [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

---

# Structured Medical Storage

The following information is **permanently stored**:

Symptoms · Medication · Assessment · Plan · Vitals · Laboratory Values · SOAP · Clinical Note · Confidence · Warnings · Source References

**Future documents use this data.**

---

# Document Storage

Generated documents — SOAP · Clinical Note · Referral Letter · Medical Certificate · Patient Summary — are stored in the **database**.

**PDF generation belongs to future versions.**

---

# File Naming Strategy

**Never use patient names.**

**Always use UUID.**

| Correct | Wrong |
|---------|-------|
| `c3b70e18-7b79.webm` | `tanaka_taro.webm` |

Patient identity should **never appear in filenames**.

---

# Storage Security

Every uploaded file:

```
Virus Scan (Future)
    ↓
Encryption
    ↓
Private Bucket
    ↓
Signed Access
```

**Public URLs are prohibited.**

詳細: [`19_security.md`](./19_security.md) · [`09_authentication_architecture.md`](./09_authentication_architecture.md) · [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Encryption

| Context | Method |
|---------|--------|
| In Transit | TLS 1.3 |
| At Rest | AES-256 |
| Access | Signed URLs — **Required** |

Storage credentials are **never exposed to frontend**.

---

# Access Policy

| Resource | Access |
|----------|--------|
| Audio | Backend Only |
| Transcript | Authenticated Users |
| SOAP | Authenticated Users |
| Clinical Notes | Authenticated Users |
| Storage Bucket | **Private** |

---

# Storage Lifecycle

```
Recording → Upload → Processing → Transcript Generated
    → SOAP Generated → Clinical Note Generated
    → Audio Deleted (Optional) → Medical Data Preserved
```

---

# Backup Policy

| Target | Frequency | Retention |
|--------|-----------|-----------|
| Database | Daily | 30 Days |
| Storage | Weekly | 30 Days |

**Future**: Cross-region replication · Versioned storage · Immutable backup

---

# Storage Monitoring

Monitor: Storage Size · Upload Failures · Download Failures · Deletion Failures · Retention Status · Bucket Health

Alerts should trigger **before storage limits are reached**.

**Future**: [`GET /api/v1/health/storage`](../04_MVP_SPECIFICATION/08_api_specification.md) — **要確認** — Backend API 06 に記載

---

# Storage Cost Optimization

| Strategy | Detail |
|----------|--------|
| Temporary Audio | Deleted automatically |
| Transcript | Compressed |
| Database | Indexed |
| Large Binary Files | **Never** stored inside PostgreSQL — store references only |

---

# Future Storage

Medical Images · ECG · Ultrasound · Referral Attachments · Laboratory PDFs · Insurance Documents · Medical Timeline Assets · Knowledge Graph Cache

**These are intentionally excluded from Version 0.1.**

---

# Disaster Recovery

If object storage becomes unavailable:

```
Keep local upload queue → Retry upload → Notify physician → Never lose consultation audio
```

Recovery should always prioritize **patient safety**.

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Storage Principles

- Store files separately from structured data
- Never expose file paths publicly
- Never store patient names in filenames
- Delete temporary data whenever possible
- Keep medical knowledge permanently

---

# Core Principle

**Audio is temporary.**

**Medical knowledge is permanent.**

Medical OS is designed to preserve **clinical knowledge**—not recordings.

Everything in the storage architecture should reinforce this principle.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Database Architecture | [`05_database_architecture.md`](./05_database_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| AI Workflow Architecture | [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| MVP Database Design | [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) |
| 次章 | [`11_deployment_architecture.md`](./11_deployment_architecture.md) |
