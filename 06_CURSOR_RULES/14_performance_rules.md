# Cursor Rules
# 14 — Performance Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`13_security_rules.md`](./13_security_rules.md)

関連: [`../04_MVP_SPECIFICATION/04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md) · [`05_frontend_rules.md`](./05_frontend_rules.md) · [`06_backend_rules.md`](./06_backend_rules.md) · [`07_database_rules.md`](./07_database_rules.md) · [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

> **優先順位**: パフォーマンス最適化時は本書 + 該当ドメインルール。MVP 数値の正本 → [`04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md)

> **要確認**: 本書の数値目標と MVP NFR / Backend Rules の差分（例: Login、SOAP 生成時間）— 実装時は MVP NFR を優先し、差分は Decision Log で統合

---

# Purpose

This document defines the **performance rules** for Medical OS.

Performance is important because physicians interact with the system **continuously during patient consultations**.

However, Medical OS always prioritizes:

```
Correctness → Safety → Reliability → Performance
```

**The fastest incorrect result has no value.**

---

# Performance Philosophy

**Optimize physician workflow, not benchmark scores.**

Users should perceive the application as: **Fast · Responsive · Reliable · Predictable**

**Every optimization should improve the physician experience.**

---

# General Principles

Correctness first · Measure before optimizing · Avoid premature optimization

**Every optimization should have measurable benefits.**

---

# Response Time Targets

| Operation | Target |
|-----------|--------|
| Login | **< 500ms** |
| Patient Search | **< 200ms** |
| Consultation Open | **< 300ms** |
| Transcript Load | **< 300ms** |
| SOAP Load | **< 300ms** |
| Clinical Note Load | **< 300ms** |
| History Search | **< 500ms** |

詳細: [`../04_MVP_SPECIFICATION/04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md)

---

# AI Performance Targets

| Operation | Target |
|-----------|--------|
| Real-Time Transcript | **< 2 sec** latency |
| Final Transcript | **< 15 sec** |
| Clinical Extraction | **< 5 sec** |
| Validation | **< 2 sec** |
| SOAP Generation | **< 5 sec** |
| Clinical Note Generation | **< 5 sec** |
| Entire AI Pipeline | Target **< 30 sec** · Ideal **< 20 sec** |

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Frontend Performance

| Target | Goal |
|--------|------|
| Initial Load | **< 2 sec** |
| Navigation | Instant |
| Rendering | **60 FPS** |

**Avoid unnecessary rerenders.**

Use memoization **only when profiling proves benefit**.

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# Backend Performance

| Target | Goal |
|--------|------|
| API Response | **< 300ms** |
| Database Query | **< 100ms** |
| Authentication | **< 200ms** |
| History Retrieval | **< 500ms** |

**Avoid blocking operations.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md)

---

# Database Performance

Use: **Indexes · Pagination · Selective Queries · Transactions**

Avoid: `SELECT *` · Unnecessary joins · Repeated queries · **N+1 queries**

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# AI Performance

Use the **smallest model** capable of safely completing the task.

```
Transcript Normalization → Small Model
Clinical Extraction → Medium Model
SOAP → Medium Model
```

**Future**: Automatic Model Routing

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Storage Performance

| Operation | Approach |
|-----------|----------|
| Uploads | **Stream** |
| Downloads | **Signed URLs** |
| Large files | Never load entirely into memory |

**Delete temporary audio automatically.**

詳細: [`../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md`](../05_SYSTEM_ARCHITECTURE/10_storage_architecture.md)

---

# API Performance

Return **only required fields**.

Support: **Pagination · Filtering · Sorting**

**Avoid oversized responses.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) · [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md)

---

# Caching

## Version 0.1

**Minimal caching.**

Safe candidates: Configuration · Prompt Metadata · Reference Data

**Do not cache mutable medical records.**

---

# Memory Usage

Avoid: Large in-memory arrays · Repeated object cloning · Unnecessary JSON serialization

**Release temporary objects quickly.**

---

# Network Optimization

Compress responses · Use **HTTP Compression** · Keep payloads small

**Avoid repeated API calls.**

---

# Bundle Size

Frontend bundle should remain **as small as possible**.

Use: Code Splitting · Lazy Loading · Dynamic Imports — **only when beneficial**

---

# Background Processing

```
Long-running work → Async Processing → Progress Updates → Completion Notification
```

**Never block the UI unnecessarily.**

詳細: [`06_backend_rules.md`](./06_backend_rules.md) — Async Processing

---

# Logging Performance

Logging should be **asynchronous** whenever possible.

**Logging must never noticeably delay physician workflow.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Monitoring

Continuously monitor:

CPU · Memory · Database · Storage · AI Latency · API Latency · Frontend Errors

**Performance regressions should be detected early.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Load Testing

**Future**: Concurrent Physicians · Concurrent AI Requests · Large Patient History · Large Transcript · Hospital Scale

**Version 0.1 focuses on clinic-scale workloads.**

詳細: [`09_testing_rules.md`](./09_testing_rules.md)

---

# Performance Anti-Patterns

Avoid:

Premature Optimization · Global State Abuse · Repeated Rendering · Duplicate API Calls · Large Components · Blocking Loops · Nested Async Chains · Excessive Database Queries

---

# Performance Checklist

Before approving implementation, Cursor should verify:

Fast API · Efficient Queries · Minimal Payload · No Duplicate Work · Measured Optimization · No Performance Regression · Physician Experience Improved

---

# Future Optimization

Redis Cache · Read Replicas · Queue Workers · Background Jobs · Streaming AI · Edge Deployment · Regional Infrastructure · Automatic Scaling

**These belong to future versions after Product Market Fit.**

---

# Core Principle

**Performance exists to support physician workflow.**

A fast system that produces unsafe medical data is a **failure**.

Medical OS optimizes only after **Correctness, Safety, and Reliability** have been achieved.

---

# 関連

| 内容 | ファイル |
|------|----------|
| MVP Non-Functional Requirements | [`../04_MVP_SPECIFICATION/04_non_functional_requirements.md`](../04_MVP_SPECIFICATION/04_non_functional_requirements.md) |
| Frontend Rules | [`05_frontend_rules.md`](./05_frontend_rules.md) |
| Backend Rules | [`06_backend_rules.md`](./06_backend_rules.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Code Review Rules | [`12_code_review_rules.md`](./12_code_review_rules.md) |
| Logging & Observability | [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md) |
| MVP AI Pipeline | [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) |
| Deployment Rules | [`15_deployment_rules.md`](./15_deployment_rules.md) |
| 次章 | [`15_deployment_rules.md`](./15_deployment_rules.md) |
