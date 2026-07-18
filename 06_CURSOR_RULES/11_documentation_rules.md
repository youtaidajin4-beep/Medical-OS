# Cursor Rules
# 11 — Documentation Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) · [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

> **優先順位**: ドキュメント作成・更新時は本書 + [`01_global_rules.md`](./01_global_rules.md)。リポジトリ全体の階層 → 本書 Documentation Hierarchy

---

# Purpose

This document defines **how Cursor should create and maintain documentation** for Medical OS.

**Documentation is part of the product.**

Good documentation allows:

```
Developers → AI Coding Assistants → Future Team Members
```

to understand the system **without reverse engineering the source code**.

---

# Documentation Philosophy

| Layer | Explains |
|-------|----------|
| Code | **How** |
| Documentation | **Why** |

**Never duplicate code in documentation.**

Instead, explain architecture, intent, trade-offs, and business reasoning.

---

# Documentation Hierarchy

```
Medical Domain Bible → Product Bible → MVP Specification → System Design → Cursor Rules → API Reference → Source Code
```

Higher-level documents explain **purpose**.

Lower-level documents explain **implementation**.

| レベル | パス（現リポジトリ） |
|--------|----------------------|
| Constitution | [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) |
| Medical Domain Bible | [`01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/) |
| Product Bible | [`02_PRODUCT_BIBLE/`](../02_PRODUCT_BIBLE/) |
| MVP Specification | [`04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/) |
| System Design | [`05_SYSTEM_ARCHITECTURE/`](../05_SYSTEM_ARCHITECTURE/) |
| Cursor Rules | [`06_CURSOR_RULES/`](./) |
| Roadmap / ADR | [`07_ROADMAP/`](../07_ROADMAP/) |

---

# Required Documentation

Every major feature requires:

Purpose · Architecture · Workflow · Data Flow · Error Handling · Future Expansion

**No feature is complete without documentation.**

---

# Public Classes

Every exported class requires: Purpose · Responsibilities · Dependencies · Side Effects

```typescript
/**
 * Responsible for generating SOAP documents
 * from structured medical data.
 *
 * This service never calls AI providers directly.
 * AI communication occurs through AIService.
 */
export class SOAPService {}
```

---

# Public Methods

Every public method documents: Purpose · Parameters · Return Value · Throws · Side Effects

```typescript
/**
 * Generates a SOAP draft.
 *
 * @param consultationId
 * @returns Generated SOAP document
 * @throws ValidationException
 */
```

---

# Complex Logic

Whenever business logic is difficult, document:

Why it exists · Medical reasoning · Known limitations · Alternative approaches considered · Future improvements

---

# Comments

Good comments explain: **Intent · Trade-offs · Medical reasoning**

Avoid comments describing obvious code.

**Bad:**

```typescript
// Increment i
i++;
```

**Good:**

```typescript
// Preserve version history because
// physicians may need to reproduce
// previous documentation.
```

---

# README

Every major module includes:

Overview · Responsibilities · Dependencies · Folder Structure · Public APIs · Testing Instructions · Known Limitations · Future Work

---

# Architecture Diagrams

Use diagrams for:

Workflow · AI Pipeline · Database Relationships · Authentication · Deployment · Sequence Flow

**Simple ASCII diagrams are acceptable.**

---

# API Documentation

Every endpoint includes:

Method · Path · Purpose · Authentication · Input · Output · Error Codes · Example Request · Example Response

詳細: [`../04_MVP_SPECIFICATION/08_api_specification.md`](../04_MVP_SPECIFICATION/08_api_specification.md) · [`../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md`](../05_SYSTEM_ARCHITECTURE/06_backend_api_architecture.md)

---

# AI Documentation

Every prompt documents:

Purpose · Input Schema · Output Schema · Supported Models · Prompt Version · Failure Modes · Safety Notes

詳細: [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) · [`../05_SYSTEM_ARCHITECTURE/18_prompt_library.md`](../05_SYSTEM_ARCHITECTURE/18_prompt_library.md)

---

# Database Documentation

Every table documents:

Purpose · Relationships · Indexes · Constraints · Versioning Strategy · Future Expansion

詳細: [`07_database_rules.md`](./07_database_rules.md) · [`../04_MVP_SPECIFICATION/07_database_design.md`](../04_MVP_SPECIFICATION/07_database_design.md)

---

# Change Log

Every significant change records:

Version · Date · Author · Reason · Impact · Migration Required

詳細: [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) · [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

---

# ADR (Architecture Decision Records)

Future architecture decisions should include:

Context · Decision · Alternatives · Consequences · Review Date

**Medical OS should preserve important design decisions.**

**要確認**: ADR 専用フォルダ（例: `07_ROADMAP/adr/`）の配置 — コード着手時に決定

---

# Markdown Standards

Use: `# Heading` · `## Section` · `### Subsection` · Bullet Lists · Tables · Code Blocks

**Avoid unnecessary formatting.**

Documentation should remain readable in plain text.

---

# Naming Rules

Documentation filenames: **PascalCase**（本書 v1.0 記載）

Examples: `MedicalDomainBible.md` · `ProductBible.md` · `SystemArchitecture.md` · `SOAPWorkflow.md`

**要確認**: 現リポジトリは `NN_snake_case_name.md` + 番号付きフォルダ（例: `05_frontend_rules.md`、`01_MEDICAL_DOMAIN_BIBLE/`）。新規ドキュメントは**既存規約を優先**し、PascalCase への統一は別途判断。

詳細: [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md)

---

# Examples

Whenever possible, **include examples**.

Examples improve both developer understanding and AI coding accuracy.

---

# Future Documentation

FHIR Mapping · HL7 Mapping · Medical Knowledge Graph · Deployment Guide · Contribution Guide · Security Handbook · Operations Manual

**These documents belong to later versions.**

---

# Documentation Checklist

Before completing documentation, Cursor should verify:

Purpose Explained · Architecture Explained · Workflow Explained · Examples Included · Future Expansion Listed · Consistent Terminology · Medical Context Explained

---

# Core Principle

**Documentation should make future development easier.**

A new developer should understand the system **before reading the code**.

A new AI coding assistant should understand the architecture **before generating code**.

**Documentation is not an afterthought.**

**Documentation is part of the architecture.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Project Directory Structure | [`../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md`](../05_SYSTEM_ARCHITECTURE/14_project_directory_structure.md) |
| Code Generation Rules | [`02_code_generation_rules.md`](./02_code_generation_rules.md) |
| Git Workflow Rules | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| Product Constitution | [`../00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) |
| 次章 | [`12_code_review_rules.md`](./12_code_review_rules.md) |
