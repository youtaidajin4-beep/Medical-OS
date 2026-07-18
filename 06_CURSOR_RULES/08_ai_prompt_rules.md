# Cursor Rules
# 08 — AI Prompt Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`07_database_rules.md`](./07_database_rules.md)

関連: [`04_ai_development_rules.md`](./04_ai_development_rules.md) · [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md) · [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

> **優先順位**: プロンプト作成・編集時は本書 + [`04_ai_development_rules.md`](./04_ai_development_rules.md) + [`01_global_rules.md`](./01_global_rules.md)。索引 → [`18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md)

---

# Purpose

This document defines **how prompts are designed, managed, versioned, and maintained** inside Medical OS.

**Prompts are product assets.**

They are **not temporary strings** inside source code.

Medical OS should treat prompts the same way it treats **APIs** or **database schemas**.

---

# Prompt Philosophy

A prompt is **software**.

It should be: **Versioned · Tested · Documented · Reusable · Replaceable**

**Never hardcode prompts inside business logic.**

---

# Prompt Architecture

```
Application → Prompt Manager → Prompt Definition → LLM Provider → Structured Output → Validation → Business Logic
```

**Every prompt passes through the Prompt Manager.**

詳細: [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md)

---

# Prompt Directory

```text
providers/
  ai/
    prompts/
      clinical-extraction/
      soap/
      clinical-note/
      validation/
      shared/
      system/
```

**Each prompt has its own file.**

実装配置: [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) — `apps/backend/src/providers/ai/prompts/`

---

# Prompt Structure

Each prompt contains:

Prompt ID · Version · Purpose · Supported Models · Input Schema · Output Schema · Prompt Text · Examples (Optional) · Metadata

Example:

| Field | Value |
|-------|-------|
| Prompt ID | `clinical_extraction_v1` |
| Version | `1.0` |
| Purpose | Extract structured clinical facts |
| Supported Models | GPT · Claude · Gemini |

---

# Prompt Naming

Use **descriptive names**.

Examples: `clinical_extraction_v1` · `soap_generation_v1` · `clinical_note_generation_v1` · `clinical_validation_v1`

**Never use**: `prompt1` · `newPrompt` · `testPrompt`

---

# Prompt Versioning

**Never overwrite prompts.**

Instead: `v1 → v2 → v3`

Every AI execution stores: **Prompt Version · Model · Provider · Timestamp**

**This allows complete reproducibility.**

詳細: [`07_database_rules.md`](./07_database_rules.md) — AI Data Rules

---

# Prompt Loading

**Never:**

```typescript
const prompt = `
Generate SOAP...
`;
```

**Always:**

```typescript
const prompt = promptManager.get("soap_generation_v1");
```

**Prompt loading is centralized.**

---

# Prompt Responsibilities

**One prompt → One task**

Examples: Extraction Prompt · SOAP Prompt · Clinical Note Prompt · Validation Prompt

**Do not combine unrelated responsibilities.**

---

# Prompt Inputs

Prompts receive **only the minimum required information**.

## Allowed

Transcript · Structured Medical Data · Consultation Context · Language · Output Schema

## Forbidden

API Keys · Database Records · Internal Logs · Secrets · Developer Notes

---

# Prompt Outputs

Every prompt returns **Structured JSON** validated by **Zod** or **JSON Schema**.

**Never rely on free-form text parsing.**

---

# Prompt Validation

```
Prompt → LLM → JSON → Schema Validation → Business Validation → Medical Validation → Return
```

**Invalid outputs must be rejected.**

詳細: [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Temperature Rules

| Task | Temperature |
|------|-------------|
| Clinical Extraction | **0.0** |
| Validation | **0.0** |
| SOAP | **0.2** |
| Clinical Note | **0.3** |
| Referral | **0.2** |
| Patient Explanation | **0.5** |

**Determinism is preferred for medical documentation.**

---

# Prompt Context

Context should be: **Minimal · Relevant · Ordered · Stable**

**Avoid unnecessary tokens.**

Every additional token increases cost and potential inconsistency.

---

# Prompt Security

Prompt text must **never** include:

Secrets · API Keys · Database URLs · Internal Infrastructure · Credentials · Sensitive implementation details

---

# Prompt Injection Protection

Transcript · Patient speech · Uploaded documents must always be treated as **Untrusted Data**.

The model should receive explicit instructions that **clinical content is not executable instructions**.

詳細: [`13_security_rules.md`](./13_security_rules.md) — Prompt Injection Protection

---

# Prompt Testing

Every prompt requires:

Golden Cases · Edge Cases · Failure Cases · Regression Tests

**Prompt changes should always be measurable.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`09_testing_rules.md`](./09_testing_rules.md)

---

# Prompt Metadata

Each prompt stores:

Prompt ID · Version · Created By · Created Date · Status · Description · Supported Models · Expected Schema · Change Log

---

# Prompt Review

Every prompt modification requires:

Review · Testing · Version Increment · Documentation Update

**Prompt changes are treated like code changes.**

---

# Prompt Optimization

Optimize prompts only after **Accuracy · Stability · Safety** are verified.

**Token reduction is secondary.**

---

# Prompt Reuse

Shared instructions belong in **`shared/`**

Examples: Medical Safety · JSON Formatting · Language Rules · System Instructions

**Avoid duplication.**

---

# Prompt Failure

If prompt execution fails:

```
Retry → Fallback Model → Return Warning → Manual Workflow
```

**Prompt failures must never stop physician workflow.**

---

# Future Prompt Types

Referral Letter · Medical Certificate · Patient Summary · Timeline · Clinical Search · Knowledge Graph · Decision Support

**These should follow the same architecture.**

---

# AI Prompt Checklist

Before creating a prompt, Cursor should verify:

Single Responsibility · Version Exists · Schema Defined · Output Structured · Validation Ready · Injection Protected · Documented · Tested

---

# Core Principle

**Prompts are part of the architecture.**

They are not disposable text.

Every prompt should be treated as a **versioned software component**, capable of being tested, reviewed, improved, and reproduced years later.

---

# 関連

| 内容 | ファイル |
|------|----------|
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
| Prompt Library 索引 | [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md) |
| AI Service Architecture | [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md) |
| AI Workflow Architecture | [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) |
| MVP AI Pipeline | [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| AI Principles | [`../02_PRODUCT_BIBLE/09_ai_principles.md`](../02_PRODUCT_BIBLE/09_ai_principles.md) |
| 次章 | [`09_testing_rules.md`](./09_testing_rules.md) |
