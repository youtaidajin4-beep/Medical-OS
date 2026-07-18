# System Architecture
# 07 — AI Service Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`06_backend_api_architecture.md`](./06_backend_api_architecture.md)

上位設計: [`04_ai_architecture.md`](./04_ai_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Purpose

This document defines the **internal architecture of the AI Service**.

The AI Service is the **heart** of Medical OS.

Its responsibility is **NOT** simply calling an LLM.

Its responsibility is converting physician-patient conversations into **structured medical knowledge**.

**Every AI provider is replaceable.**

**Medical OS owns the workflow.**

---

# Design Principles

The AI Service must be:

- Stateless · Deterministic · Observable · Replaceable · Traceable · Safe

**Every AI request should be reproducible.**

---

# AI Service Responsibilities

```
Receive Transcript → Normalize Transcript → Extract Clinical Facts
    → Validate Information → Generate Structured Medical Data
    → Generate SOAP → Generate Clinical Note → Return Review Result
```

---

# AI Service Architecture

```
AIService
├── TranscriptNormalizer
├── ClinicalExtractor
├── ClinicalValidator
├── SOAPGenerator
├── ClinicalNoteGenerator
├── PromptManager
├── ConfidenceEngine
├── RetryManager
├── ProviderAdapter
└── AuditLogger
```

**Every module has one responsibility.**

---

# AI Provider Layer

Medical OS never directly depends on OpenAI · Claude · Gemini.

Instead, Medical OS depends on **`LLMProvider` interface**.

```typescript
interface LLMProvider {
  generate(request: AIRequest): Promise<AIResponse>;
}
```

**Supported Providers**

OpenAI · Anthropic · Google · Azure OpenAI

**Future**: Self-hosted Models · Ollama · vLLM

> **要確認**: プロバイダ最終選定は関係者確認後。

---

# Prompt Manager

**Purpose**: Manage every AI prompt.

Every prompt has:

Prompt ID · Version · Purpose · Input Schema · Output Schema · Supported Model · Temperature · Max Tokens · Created Date · Status

**Prompt Examples**

`clinical_extraction_v1` · `soap_generation_v1` · `clinical_note_generation_v1`

**Future**: `referral_generation_v1` · `summary_generation_v1`

詳細: [`18_prompt_library.md`](./18_prompt_library.md) · [`05_database_architecture.md`](./05_database_architecture.md) — PromptVersions

---

# Transcript Normalizer

**Responsibilities**

Correct punctuation · Normalize spacing · Normalize numbers · Normalize units · Normalize dates · Correct common recognition mistakes · Preserve original meaning

**Never modify**

Medication · Diagnosis · Negation · Laboratory Values

---

# Clinical Extractor

**Purpose**: Extract medical facts.

**Output**

Chief Complaint · Symptoms · Past History · Medication · Allergy · Vitals · Findings · Assessment · Plan · Family History · Follow-up

**Every extracted fact includes**

Confidence · Source · Timestamp · Speaker

---

# Clinical Validator

**Purpose**: Verify extracted information.

**Checks**

Medication consistency · Date consistency · Negation · Units · Duplicated findings · Contradictions · Missing information

**Never guess. Return warnings.**

---

# Confidence Engine

**Purpose**: Assign confidence score.

| Level | Range |
|-------|-------|
| High | 95–100% |
| Medium | 80–94% |
| Low | Below 80% |

```
Low confidence → Highlight → Require Review
```

---

# SOAP Generator

| | |
|---|---|
| Input | Structured Medical Data |
| Output | SOAP |

**Rules**

Never invent facts · Never merge unrelated findings · Keep sections separated · Support physician editing

---

# Clinical Note Generator

| | |
|---|---|
| Input | SOAP + Structured Medical Data |
| Output | Natural physician documentation |

**Requirements**

Readable · Concise · No duplicated information · Consistent with SOAP

---

# Retry Manager

**Purpose**: Handle temporary AI failures.

| Condition | Policy |
|-----------|--------|
| Network | 3 retries |
| LLM Timeout | 2 retries |
| Rate Limit | Exponential Backoff |
| Validation Failure | No Retry |
| Unknown Error | 1 Retry |

**Never retry endlessly.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# AI Audit Logger

**Store**

Provider · Model · Prompt Version · Latency · Tokens · Execution Time · Warnings · Failures · Output Version

**Future**: Cost · Accuracy · Evaluation

詳細: [`05_database_architecture.md`](./05_database_architecture.md) — AIExecutions

---

# AI Pipeline

```
Transcript → Normalize → Extract → Validate → Structured Data
    → SOAP → Clinical Note → Return
```

**Every stage is independent.**

---

# Provider Adapter

**Purpose**: Hide provider-specific implementation.

**Examples**

OpenAIAdapter · ClaudeAdapter · GeminiAdapter · AzureAdapter

**Every adapter returns identical output structure.**

---

# Cost Optimization

| Model Size | Tasks |
|------------|-------|
| Small | Normalization · Extraction |
| Larger | SOAP · Clinical Note |

**Future**: Automatic model routing

---

# AI Timeout

| Stage | Timeout |
|-------|---------|
| Speech Recognition | 120 sec |
| Extraction | 20 sec |
| SOAP | 20 sec |
| Clinical Note | 20 sec |
| Overall Consultation | 180 sec |

---

# Error Recovery

```
Provider Failure → Retry → Fallback Provider → Manual Review
```

**Future**: Multiple Provider Failover

---

# AI Monitoring

Track:

Latency · Cost · Tokens · Accuracy · Failure Rate · Retry Rate · Daily Usage · Provider Availability

---

# AI Versioning

Every generated document stores:

Pipeline Version · Prompt Version · Model Version · Schema Version · Generation Time · Provider

**This guarantees reproducibility.**

---

# Future AI Modules

Referral Generator · Medical Certificate Generator · Patient Summary Generator · Timeline Generator · Knowledge Graph Generator · Clinical Search · Voice Assistant · Medical Memory

**Intentionally excluded from Version 0.1.**

---

# Core Principle

**Medical OS owns the intelligence.**

LLMs provide language generation.

The workflow, validation, structure, and medical safety belong to **Medical OS**—not to the AI provider.

---

# 関連

| 内容 | ファイル |
|------|----------|
| AI Architecture | [`04_ai_architecture.md`](./04_ai_architecture.md) |
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| Backend API Architecture | [`06_backend_api_architecture.md`](./06_backend_api_architecture.md) |
| Database Architecture | [`05_database_architecture.md`](./05_database_architecture.md) |
| Prompt Library | [`18_prompt_library.md`](./18_prompt_library.md) |
| Cursor AI Development Rules | [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) |
| Cursor AI Prompt Rules | [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) |
| 次章 | [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) |
