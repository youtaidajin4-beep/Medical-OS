# Cursor Rules
# 03 — Architecture Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`02_code_generation_rules.md`](./02_code_generation_rules.md)

関連: [`01_global_rules.md`](./01_global_rules.md) · [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md)

> **優先順位**: [`01_global_rules.md`](./01_global_rules.md) が最優先。本書は **架構整合性** の具体ルール。System Design 詳細 → [`../05_SYSTEM_ARCHITECTURE/`](../05_SYSTEM_ARCHITECTURE/)

---

# Purpose

This document defines the **architectural rules** that Cursor must always follow.

These rules ensure that Medical OS maintains a **consistent architecture** regardless of who writes the code.

Every implementation must **preserve architectural integrity**.

---

# Philosophy

**Architecture is more important than implementation.**

Good architecture allows implementation to change.

Poor architecture makes every change expensive.

Medical OS is designed to **evolve for many years**.

---

# Layered Architecture

Medical OS follows this dependency direction:

```
Frontend
    ↓
Backend API
    ↓
Application Service
    ↓
Domain
    ↓
Repository
    ↓
Database
```

**No layer may skip another layer.**

詳細: [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md)

---

# Dependency Rule

Dependencies always point **inward**.

## Allowed

```
UI → Application → Domain → Infrastructure
```

## Forbidden

| Pattern | Reason |
|---------|--------|
| Infrastructure → UI | Wrong direction |
| Repository → Controller | Layer violation |
| Database → Frontend | Security · architecture |
| AI Provider → React Component | Infrastructure must not drive UI |

---

# Frontend Rules

Frontend is responsible **only** for:

Rendering · Interaction · State · API Communication

Frontend must **never**:

Access Database · Call AI Provider · Implement Medical Logic · Implement Business Rules

詳細: [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)

---

# Backend Rules

Backend owns:

Workflow · Medical Logic · Validation · Authentication · Authorization · Persistence

**Every important decision belongs here.**

詳細: [`../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md`](../05_SYSTEM_ARCHITECTURE/03_backend_architecture.md)

---

# Domain Rules

The Domain Layer contains:

Medical Workflow · Business Rules · Clinical Validation · Approval Rules

**Medical concepts should never be duplicated elsewhere.**

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/)

---

# Repository Rules

Repositories perform **only**: Create · Read · Update · Delete

Repositories must **not**:

Generate SOAP · Validate Medical Data · Call AI · Transform Business Objects

詳細: [`../05_SYSTEM_ARCHITECTURE/05_database_architecture.md`](../05_SYSTEM_ARCHITECTURE/05_database_architecture.md)

---

# AI Rules

AI Providers are **infrastructure**.

Medical knowledge belongs to **Medical OS**.

```
Correct:  Medical OS → LLM
Wrong:    LLM → Medical Workflow
```

**The AI generates. Medical OS decides.**

詳細: [`../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md`](../05_SYSTEM_ARCHITECTURE/04_ai_architecture.md) · [`../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md`](../05_SYSTEM_ARCHITECTURE/07_ai_service_architecture.md)

---

# Provider Independence

Medical OS should support **multiple providers**.

**Never** write code like `OpenAI.generate()`.

**Instead**: `LLMProvider.generate()`

Providers: OpenAI · Claude · Gemini · Azure · **Future**: Local Models

---

# Prompt Rules

Prompts are **assets**.

Prompts are **never hardcoded**.

Always load through **PromptManager**.

Every prompt must have: ID · Version · Purpose · Schema · Status

詳細: [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md)

---

# Validation Rules

Every external input must be validated:

HTTP Request · AI Output · Environment Variables · Audio Metadata · Database IDs

**Never trust external systems.**

---

# State Management Rules

| Layer | State |
|-------|-------|
| Frontend | UI State |
| Backend | Business State |
| Database | Persistent State |
| AI | Temporary Processing State |

**These responsibilities must remain separate.**

---

# Module Rules

Each module owns:

Controller · Service · Repository · DTO · Tests · Types

**No module should access another module's internals directly.**

Communication occurs through **public services**.

詳細: [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

---

# Event Rules

**Future** versions may introduce events.

Examples: RecordingStarted · TranscriptGenerated · SOAPGenerated · ClinicalNoteApproved

Events should describe **business actions**, not technical actions.

詳細: [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) — AI Event Bus

---

# Configuration Rules

Configuration belongs in `config/`.

**Never hardcode**: API Keys · URLs · Timeouts · Provider Names · Magic Numbers

**Everything configurable should be centralized.**

---

# Error Rules

Errors must propagate upward:

```
Repository → Service → Controller → Client
```

**Never hide failures. Always log them.**

詳細: [`../04_MVP_SPECIFICATION/11_error_handling.md`](../04_MVP_SPECIFICATION/11_error_handling.md)

---

# Logging Rules

Every business workflow should be **traceable**.

Log: Request ID · Consultation ID · User ID · Pipeline Stage · Execution Time · Result · Errors

**Logs must support debugging and audits.**

詳細: [`../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md`](../05_SYSTEM_ARCHITECTURE/12_logging_and_observability.md)

---

# Security Rules

```
Authentication → Authorization → Business Logic → Persistence
```

**Security should never depend on UI.**

詳細: [`../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md`](../05_SYSTEM_ARCHITECTURE/09_authentication_architecture.md)

---

# Database Rules

Database stores: Facts · History · Relationships

It does **not** store: Business Logic · Workflow · Medical Decisions · Prompt Logic

---

# API Rules

Endpoints represent **workflows**.

| Good | Bad |
|------|-----|
| Generate SOAP | Insert SOAP Row |
| Approve Consultation | Update Transcript Table |
| Complete Consultation | — |

**Design APIs around user intent.**

詳細: [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# Testing Rules

Every architectural boundary should be tested:

```
Controller → Service → Repository → Database
```

**Each layer should be independently testable.**

詳細: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`../06_CURSOR_RULES/09_testing_rules.md`](../06_CURSOR_RULES/09_testing_rules.md)

---

# Refactoring Rules

Refactoring must:

Reduce coupling · Increase cohesion · Improve readability · Preserve behavior

**Architectural consistency is more important than code style.**

---

# Forbidden Architecture

**Never implement:**

Business Logic in React · Medical Logic in Controllers · AI Calls in UI · SQL in Services · Prompt Text in Controllers · Circular Dependencies · Hidden Side Effects · Global Mutable State

---

# Architectural Checklist

Before completing any implementation, Cursor should verify:

Correct Layer · Correct Module · Correct Dependency Direction · No Duplication · Replaceable Provider · Validation Exists · Logging Exists · Tests Exist

---

# Core Principle

**Architecture is the foundation of Medical OS.**

Features will change · AI models will change · Technologies will change

**The architecture must remain stable.**

Every implementation should **strengthen** the architecture, **never weaken** it.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Global Rules | [`01_global_rules.md`](./01_global_rules.md) |
| Code Generation Rules | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
| System Architecture | [`../05_SYSTEM_ARCHITECTURE/01_architecture.md`](../05_SYSTEM_ARCHITECTURE/01_architecture.md) |
| AI Workflow Architecture | [`../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md`](../05_SYSTEM_ARCHITECTURE/08_ai_workflow_architecture.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| 次章 | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
