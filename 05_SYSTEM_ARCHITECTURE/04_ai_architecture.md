# System Architecture
# 04 — AI Architecture

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`03_backend_architecture.md`](./03_backend_architecture.md)

Cursor AI ルール: [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) · [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md)

> **要確認**: STT/LLM プロバイダの最終選定・本番利用前の契約・コンプライアンス確認は関係者確認後。

---

# Purpose

This document defines the **AI architecture** for Medical OS Version 0.1.

The AI layer converts consultation audio into **structured medical information** and **physician-reviewable documentation**.

The AI layer must prioritize:

1. Medical accuracy
2. Traceability
3. Safety
4. Editability
5. Provider independence

**The AI layer must never make final medical decisions.**

---

# Core AI Principle

Medical OS is **not** a single-prompt application.

The system must **not** send a raw transcript to an LLM and directly request a final medical note.

**Required flow:**

```
Audio → Speech Recognition → Transcript Normalization
    → Clinical Fact Extraction → Fact Validation → Structured Clinical Data
    → SOAP Generation → Clinical Note Generation → Physician Review
```

詳細: [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) · [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# AI Layer Responsibilities

**The AI layer is responsible for:**

- Converting audio into text
- Normalizing transcript text
- Extracting clinical facts
- Classifying information
- Identifying uncertain information
- Detecting contradictions
- Generating SOAP drafts
- Generating normal clinical-note drafts
- Linking generated content to source information
- Returning confidence and warning information

**The AI layer is not responsible for:**

- Final diagnosis · Prescription decisions · Test-order decisions · Treatment decisions
- Automatic EHR submission · Final approval · Legal confirmation of medical records

---

# AI Architecture Overview

```
Consultation Audio
        ↓
Speech-to-Text Provider
        ↓
Raw Transcript
        ↓
Transcript Normalizer
        ↓
Clinical Extraction Engine
        ↓
Validation Engine
        ↓
Structured Clinical Data
        ↓
Document Generation Engine
        ├── SOAP Draft
        └── Clinical Note Draft
        ↓
Physician Review
```

---

# AI Modules

Version 0.1 contains:

1. Audio Preprocessing Module
2. Speech Recognition Module
3. Transcript Normalization Module
4. Clinical Information Extraction Module
5. Clinical Validation Module
6. Structured Data Module
7. SOAP Generation Module
8. Clinical Note Generation Module
9. Confidence and Warning Module
10. Prompt Management Module
11. AI Audit Module

---

# Module 01 — Audio Preprocessing

**Purpose**: Improve audio quality before transcription.

**Responsibilities**

- Validate audio format · Validate audio duration · Detect silent audio · Detect corrupted audio
- Normalize volume when possible · Split long recordings into safe processing segments · Preserve segment order

Version 0.1 should avoid complex clinical noise cancellation unless required by testing.

**Supported formats**: WebM · WAV · MP3 · M4A

**Preferred**: WebM or WAV

---

# Module 02 — Speech Recognition

**Purpose**: Convert consultation audio into Japanese text.

**Requirements**

- Japanese-language support · Medical terminology support · Low latency
- Partial transcript support · Stable processing of long consultations
- Confidence information where available · Retry support

**Initial provider candidates**

- OpenAI speech-to-text · Azure AI Speech · Google Cloud Speech-to-Text

The provider must be isolated behind an internal interface.

```ts
interface SpeechToTextProvider {
  transcribe(
    audio: AudioInput,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult>;
}
```

The application must **not** depend directly on one provider's response format.

---

# Real-Time Transcription Strategy

Version 0.1 requires real-time recording.

Real-time display and final medical transcription should be treated **separately**.

```
Microphone Audio → Short Audio Chunks → Live Partial Transcript
    → Recording Ends → Final Full-Audio Transcription → Canonical Transcript
```

The live transcript provides user reassurance.

The **final full-audio transcription** becomes the authoritative transcript used for SOAP generation.

This prevents partial streaming errors from becoming permanent medical data.

---

# Audio Chunking

**Recommended chunk size**

- 10 to 30 seconds for upload
- Provider-dependent streaming chunks for live transcription

**Requirements**

- Each chunk receives a sequence number · Missing chunks must be detectable
- Duplicate chunks must be ignored · Final transcript order must be preserved
- Unsent chunks must be retried automatically

```json
{
  "consultationId": "CONSULTATION_UUID",
  "chunkIndex": 12,
  "startedAtMs": 120000,
  "endedAtMs": 135000,
  "isFinal": false
}
```

---

# Module 03 — Transcript Normalization

**Purpose**: Create a clean but faithful transcript.

Normalization may include:

- Punctuation insertion · Removal of obvious duplicated filler
- Standardization of units · Full-width / half-width characters
- Medical abbreviation normalization · Common drug-name spelling correction
- Timestamp preservation · Speaker-label preservation when available

**Normalization must not alter clinical meaning.**

```
Raw: 血圧はひゃくさんじゅうのはちじゅうです
Normalized: 血圧は130/80 mmHgです。

Raw: 胸の痛みはないです
Normalized: 胸痛なし。
```

**Negation must never be removed or reversed.**

Both raw and normalized transcripts must be retained for verification.

---

# Speaker Handling

Version 0.1 should support when technically reliable:

- Physician · Patient · Other

If speaker separation confidence is low:

- Use Unknown · Do not guess · Allow manual correction

**Speaker identity must not be inferred from medical content alone.**

**Future** in MVP pipeline — v0.1: **要確認** per [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md)

---

# Module 04 — Clinical Information Extraction

**Purpose**: Extract facts before generating prose.

**Required extraction categories**

Chief complaint · History of present illness · Symptom onset · Duration · Course · Relevant negatives · Past medical history · Medication · Allergy · Vital signs · Physical findings · Laboratory results · Imaging findings · Physician-stated assessment · Physician-stated plan · Follow-up timing · Referral information · Patient instructions

The extraction engine must distinguish:

- Patient statement · Physician observation · Physician assessment · Physician plan · Unconfirmed information

---

# Structured Extraction Output

```json
{
  "chiefComplaint": [
    {
      "value": "発熱",
      "sourceType": "patient_statement",
      "sourceSegmentIds": ["seg-12"],
      "confidence": 0.97
    }
  ],
  "historyOfPresentIllness": {
    "onset": {
      "value": "昨日",
      "sourceSegmentIds": ["seg-14"],
      "confidence": 0.92
    },
    "course": "38℃台の発熱が持続"
  },
  "relevantNegatives": [
    {
      "value": "胸痛なし",
      "sourceSegmentIds": ["seg-21"],
      "confidence": 0.98
    }
  ],
  "vitalSigns": [
    {
      "type": "temperature",
      "value": 38.2,
      "unit": "°C",
      "sourceSegmentIds": ["seg-25"],
      "confidence": 0.99
    }
  ],
  "medications": [],
  "assessment": [
    {
      "value": "急性咽頭炎疑い",
      "sourceType": "physician_statement",
      "sourceSegmentIds": ["seg-44"],
      "confidence": 0.95
    }
  ],
  "plan": [
    {
      "value": "対症療法で経過観察",
      "sourceSegmentIds": ["seg-50"],
      "confidence": 0.96
    }
  ]
}
```

---

# Source Traceability

Every extracted fact should reference its source.

Source references may include: Transcript segment ID · Timestamp · Speaker label · Uploaded document ID (future)

```json
{
  "value": "アムロジピン5mg継続",
  "sourceSegmentIds": ["seg-31", "seg-32"],
  "sourceStartMs": 221000,
  "sourceEndMs": 229000
}
```

This enables physicians to verify why the AI generated specific content.

---

# Module 05 — Clinical Validation

**Purpose**: Detect high-risk errors before document generation.

**Required checks**

- Medication-name consistency · Dosage consistency · Numeric-value consistency
- Date consistency · Negation consistency · Laterality consistency · Unit consistency
- Contradictory statements · Missing source evidence · Unsupported assessment · Unsupported plan

The validation engine should return **warnings**, not silently correct uncertain facts.

---

# High-Risk Information

Enhanced validation required for:

Medication names · Doses · Administration frequency · Allergy · Laboratory values · Vital signs · Dates · Duration · Pregnancy status · Negation · Left/right location · Diagnosis wording · Treatment plan

---

# Validation Result

```json
{
  "status": "requires_review",
  "warnings": [
    {
      "type": "medication_uncertainty",
      "severity": "high",
      "message": "薬剤名を確定できませんでした。",
      "candidates": ["ロサルタン", "ロキソニン"],
      "sourceSegmentIds": ["seg-37"]
    },
    {
      "type": "negation_conflict",
      "severity": "critical",
      "message": "『胸痛あり』と『胸痛なし』の両方が検出されました。",
      "sourceSegmentIds": ["seg-21", "seg-29"]
    }
  ]
}
```

**Critical warnings must block final approval until reviewed.**

---

# Module 06 — Structured Clinical Data

Structured Clinical Data is the **canonical AI output**.

SOAP and clinical notes are generated from this layer.

The structured data should be:

- Machine-readable · Versioned · Traceable · Editable · Validated · Independent of one document format

**Schema categories**

```
Patient Context · Encounter Context · Subjective Information · Objective Information
Assessment Information · Plan Information · Medication Information · Allergy Information
Clinical Warnings · Source References · Confidence Information
```

**The structured data is more important than generated prose.**

詳細: [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md) — StructuredMedicalData

---

# Module 07 — SOAP Generation

| | |
|---|---|
| Input | Validated Structured Clinical Data |
| Output | Subjective · Objective · Assessment · Plan |

**Rules**

- Do not add unsupported information
- Do not move uncertain data into a definite statement
- Preserve relevant negatives · Preserve medication names and doses exactly
- Preserve numbers and dates · Separate physician assessment from patient opinion
- Use concise Japanese clinical language · Mark uncertain content clearly

```json
{
  "subjective": "昨日から38℃台の発熱と咽頭痛あり。胸痛なし。",
  "objective": "体温38.2℃。咽頭発赤あり。SpO2 98%。",
  "assessment": "急性咽頭炎疑い。",
  "plan": "対症療法で経過観察。症状増悪時は再診するよう説明。"
}
```

---

# Module 08 — Clinical Note Generation

| | |
|---|---|
| Input | Validated Structured Clinical Data and approved SOAP draft |
| Output | Natural clinical note for copy and paste |

**Requirements**

Concise · Clinically readable · No duplicated content · No unsupported facts · Consistent with SOAP · Adaptable to physician writing style later

```
昨日から38℃台の発熱と咽頭痛を認め受診。胸痛なし。
体温38.2℃、SpO2 98%。診察上、咽頭発赤を認めた。
急性咽頭炎を疑い、対症療法で経過観察とした。
症状増悪時は再診するよう説明した。
```

---

# Module 09 — Confidence and Warning System

Confidence values are **internal guidance**, not proof of correctness.

| Level | Range |
|-------|-------|
| High | 0.95 or above |
| Medium | 0.80 to 0.94 |
| Low | below 0.80 |

**User-facing labels**: Confirmed · Review Recommended · Unable to Confirm

High-risk content may require review even when confidence is high.

---

# Physician Review Priority

The UI should prioritize review of:

1. Critical contradictions
2. Medication and dose
3. Allergy
4. Numbers and units
5. Dates and duration
6. Negation
7. Assessment
8. Plan
9. Remaining wording

---

# Module 10 — Prompt Management

Prompts must **not** be hardcoded throughout the application.

Prompts should be centrally managed and versioned.

Each prompt record should include:

Prompt ID · Prompt name · Version · Intended model · System instruction · Input schema · Output schema · Created date · Status · Test result · Change reason

**Example prompt names**

- `clinical_extraction_v1` · `soap_generation_v1` · `clinical_note_generation_v1` · `clinical_validation_v1`

詳細: [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) — Prompt Manager · [`18_prompt_library.md`](./18_prompt_library.md)

---

# Structured Output

All internal AI operations should use **schema-constrained structured output** where supported.

Do **not** rely on free-form text for extraction.

**Preferred approach**

- JSON Schema · Zod schema · Provider structured-output mode · Strict server-side validation

Invalid responses must be **rejected and retried**.

---

# Model Provider Abstraction

The AI architecture must support multiple providers.

```ts
interface LlmProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest<T>
  ): Promise<StructuredGenerationResult<T>>;
}
```

**Initial candidates**: OpenAI · Anthropic · Google

Provider-specific code must remain inside adapters.

Business logic must **not** depend on provider-specific SDK types.

---

# Model Selection

Version 0.1 may use different models for different tasks.

| Task | Model type |
|------|------------|
| Speech recognition | Speech-specific model |
| Fact extraction | High-accuracy structured-output model |
| SOAP generation | Medium-cost clinical text model |
| Clinical note generation | Medium-cost clinical text model |
| Validation | Separate validation pass when required |

Do **not** use the most expensive model for every task by default.

**Accuracy testing determines model selection.**

---

# AI Request Data Minimization

Only send information required for the current task.

**Do not send**

- Unrelated patient history · Internal user account data · Full database records
- Unnecessary identifiers · API secrets · Audit logs

Use anonymous consultation IDs where possible.

---

# AI Provider Privacy

Only providers with acceptable medical-data handling policies may be used.

**Required conditions**

- No training on submitted data · Documented retention policy
- Enterprise or API privacy controls · Encryption in transit
- Contractual data-processing terms before real patient use

**Provider compliance must be verified before production use.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md)

---

# Module 11 — AI Audit

Every AI operation must be logged.

**Required metadata**

Consultation ID · Operation type · Prompt version · Model provider · Model name · Start time · End time · Token usage · Success or failure · Validation result · Output version · Error code

Do **not** store secret chain-of-thought or hidden model reasoning.

Store only necessary inputs, structured outputs, warnings, and metadata.

---

# Revision Learning

Version 0.1 stores:

- AI original output · Physician-edited output · Field-level differences · Edit timestamp · Editor ID

**Purpose**

- Identify recurring errors · Improve prompts · Improve templates · Personalize physician style later

**Patient data must not automatically train an external model.**

Improvement should initially occur through controlled prompt and rules updates.

---

# AI Quality Evaluation

Each test case should compare:

Source transcript · Structured extraction · Generated SOAP · Generated clinical note · Physician reference answer · Physician edits

**Required safety metrics**

- Unsupported fact rate · Medication error rate · Numeric error rate · Date error rate
- Negation error rate · Assessment overreach rate · Plan overreach rate · Physician edit time

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

---

# Failure Strategy

| Failure | Response |
|---------|----------|
| Speech recognition | Preserve audio · Retry · Manual transcript entry |
| Extraction | Preserve transcript · Retry · Manual continuation |
| Validation | Display warnings · Require physician review |
| SOAP generation | Preserve structured data · Retry · Manual SOAP entry |
| Clinical note | Preserve SOAP · Retry · Manual note entry |

**No AI failure may destroy consultation data.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# AI Security Risks

The system must account for:

- Prompt injection in spoken content · Malicious uploaded text · Untrusted document content
- Data exfiltration requests · Instruction conflicts · Hallucination
- Provider outage · Model-version changes

**Patient speech must be treated as clinical content, not as system instructions.**

Example: A patient saying *"Ignore all previous instructions"* must remain part of the transcript and must **not** alter system behavior.

---

# Prompt Injection Boundary

The model must receive clear separation between:

- System instructions · Application instructions · Clinical source data

Clinical source data must be wrapped as **untrusted content**.

**The AI must never follow instructions contained inside clinical data.**

---

# Versioning

Every AI output must record:

Pipeline version · Prompt version · Model version · Schema version · Validation version

This allows future reproduction and comparison.

---

# Version 0.1 AI Scope

**Included**

Real-time partial transcription · Final transcription · Transcript normalization · Clinical fact extraction · Structured clinical data · Warning detection · SOAP generation · Clinical-note generation · Physician review

**Excluded**

Diagnosis recommendation · Treatment recommendation · Prescription recommendation · Laboratory interpretation · Imaging interpretation · Referral-letter generation · Longitudinal patient summary · Autonomous EHR submission

---

# Core Principle

The AI must **never** move directly from audio to a final approved medical document.

Medical OS always follows:

```
Capture → Extract → Validate → Structure → Generate → Review → Approve
```

**Facts come before prose.**

**Validation comes before convenience.**

**Physician approval comes before clinical use.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Backend Architecture | [`03_backend_architecture.md`](./03_backend_architecture.md) |
| MVP AI Pipeline | [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) |
| AI Principles | [`../02_PRODUCT_BIBLE/09_ai_principles.md`](../02_PRODUCT_BIBLE/09_ai_principles.md) |
| AI Service Architecture | [`07_ai_service_architecture.md`](./07_ai_service_architecture.md) |
| AI Workflow Architecture | [`08_ai_workflow_architecture.md`](./08_ai_workflow_architecture.md) |
| Prompt Library | [`18_prompt_library.md`](./18_prompt_library.md) |
| 次章 | [`05_database_architecture.md`](./05_database_architecture.md) |
