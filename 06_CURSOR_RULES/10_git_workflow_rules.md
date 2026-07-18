# Cursor Rules
# 10 — Git Workflow Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`09_testing_rules.md`](./09_testing_rules.md)

関連: [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) · [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

> **優先順位**: コミット・PR・ブランチ操作時は本書 + [`01_global_rules.md`](./01_global_rules.md)。コード品質詳細 → [`13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md)

> **要確認**: リポジトリは現時点で Git 未初期化。本書はコード着手時の標準ワークフロー。

---

# Purpose

This document defines the **Git workflow** for Medical OS.

The objective is to ensure that every code change is:

**Traceable · Reviewable · Recoverable · Deployable**

Medical software requires **disciplined version control**.

**Git history is part of the product documentation.**

---

# Git Philosophy

**Commit often. Commit small. Commit meaningful changes.**

Every commit should represent **one logical change**.

---

# Branch Strategy

## Main Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production |
| `develop` | Integration |

## Supporting Branches

| Prefix | Purpose |
|--------|---------|
| `feature/*` | Feature Branches |
| `bugfix/*` | Bug Fixes |
| `hotfix/*` | Hot Fixes |
| `release/*` | Release |

Examples: `feature/soap-generator` · `feature/transcript-normalizer` · `bugfix/login-timeout`

---

# Branch Workflow

```
develop → feature/new-feature → Pull Request → Review → Merge into develop → Release → main
```

**Never develop directly on `main`.**

---

# Commit Philosophy

**One Commit → One Purpose**

Avoid mixing Feature · Refactor · Bug Fix · Documentation in the same commit.

---

# Commit Format

Use **Conventional Commits**.

Types: `feat:` · `fix:` · `refactor:` · `docs:` · `test:` · `style:` · `perf:` · `build:` · `ci:` · `chore:`

---

# Good Commit Messages

```text
feat: implement SOAP generation pipeline
fix: prevent transcript duplication
refactor: extract validation service
docs: update AI architecture
test: add consultation workflow tests
perf: optimize patient search query
```

---

# Bad Commit Messages

```text
update
fix
changes
work
test
asdf
```

Commit messages should describe **what changed**, not why it was committed.

---

# Pull Requests

Every Pull Request should include:

Purpose · Scope · Screenshots (if UI) · Testing Results · Checklist · Related Issues

**No Pull Request without description.**

---

# Pull Request Checklist

Architecture respected · Tests passed · Lint passed · Type check passed · Medical safety verified · Logging added · Documentation updated · No duplicated code

詳細: [`12_code_review_rules.md`](./12_code_review_rules.md)

詳細: [`09_testing_rules.md`](./09_testing_rules.md)

---

# Code Review Rules

Review priority:

```
Architecture → Security → Medical Safety → Business Logic → Performance → Style
```

**Correctness always comes before style.**

詳細: [`12_code_review_rules.md`](./12_code_review_rules.md)

---

# Merge Strategy

| Strategy | Usage |
|----------|-------|
| **Squash Merge** | Preferred |
| Merge Commit | Alternative |
| Rebase after review | Avoid unless necessary |

**Git history should remain readable.**

---

# Release Workflow

```
develop → release/x.y.z → Testing → Approval → Merge into main → Tag → Deploy → Merge back into develop
```

詳細: [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)

---

# Versioning

**Semantic Versioning**: `MAJOR.MINOR.PATCH`

Examples: `0.1.0` · `0.1.1` · `0.2.0` · `1.0.0`

| Level | Meaning |
|-------|---------|
| Major | Breaking Changes |
| Minor | New Features |
| Patch | Bug Fixes |

詳細: [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# Tagging

Every production release receives a **Git tag**.

Examples: `v0.1.0` · `v0.1.1` · `v0.2.0` · `v1.0.0`

**Tags should never be reused.**

---

# Protected Branches

Protect: **`main`** · **`develop`**

Rules: No force push · Pull Request required · Passing CI required · Review required · Status checks required

---

# CI Requirements

Every Pull Request runs:

Type Check · Lint · Unit Tests · Integration Tests · Build

**No merge if any required check fails.**

詳細: [`09_testing_rules.md`](./09_testing_rules.md) · [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md)

---

# Hotfix Workflow

```
main → hotfix/critical-auth-bug → Review → Merge into main → Deploy → Merge back into develop
```

**Production fixes must always return to develop.**

---

# Revert Strategy

If deployment fails:

```
Revert Commit → Restore Previous Version → Investigate → Create New Fix
```

**Never rewrite production history.**

---

# Git Ignore

Ignore: `node_modules` · `.env` · `dist` · `coverage` · `logs` · `.tmp` · Generated files

**Never commit secrets.**

---

# Documentation Updates

| Change Type | Update |
|-------------|--------|
| Architecture changes | Architecture Docs |
| Prompt changes | Prompt Docs |
| Workflow changes | Product Bible |

詳細: [`11_documentation_rules.md`](./11_documentation_rules.md)

**Documentation evolves together with code.**

---

# Forbidden

**Never:**

Commit secrets · Commit API keys · Commit database credentials · Force push to main · Skip code review · Merge failing tests · Mix unrelated features · Rewrite production history

---

# Future Workflow

GitHub Flow · Release Automation · Semantic Release · Automatic Changelog · Release Notes · Deployment Approval

**These may be introduced after Version 1.0.**

---

# Git Checklist

Before every commit, Cursor should verify:

Single Responsibility · Meaningful Commit Message · Tests Pass · Lint Passes · Documentation Updated · Architecture Preserved · No Secrets Included

---

# Core Principle

**Git is the historical memory of Medical OS.**

Every commit should tell the story of how the product evolved.

A developer should be able to understand the entire history of the project by reading the commit log.

---

# 関連

| 内容 | ファイル |
|------|----------|
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| Deployment Architecture | [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) |
| Deployment Rules | [`15_deployment_rules.md`](./15_deployment_rules.md) |
| Final Checklist | [`16_final_checklist.md`](./16_final_checklist.md) |
| Testing Rules | [`09_testing_rules.md`](./09_testing_rules.md) |
| Version Roadmap | [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md) |
| Technology Stack | [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md) |
| Decision Log | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
| 次章 | [`11_documentation_rules.md`](./11_documentation_rules.md) |
