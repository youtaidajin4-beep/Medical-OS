# Cursor Rules
# 09 — Testing Rules

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

関連: [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) · [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) · [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md)

> **優先順位**: テスト作成・検証時は本書 + [`01_global_rules.md`](./01_global_rules.md) + 該当ドメインルール（Frontend / Backend / Database / AI）。MVP 詳細 → [`12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md)

---

# Purpose

This document defines **how Cursor should create tests** for Medical OS.

**Testing is not optional.**

Medical software must **prove correctness**.

Every important workflow should be **automatically verifiable**.

---

# Testing Philosophy

**If code is not tested, it is not complete.**

Passing compilation is not enough.

Passing manual testing is not enough.

**Every critical medical workflow requires automated testing.**

---

# Testing Pyramid

```
                E2E
           Integration
              Unit
```

Most tests should be **Unit Tests**.

Critical workflows should have **Integration Tests**.

**End-to-End tests verify physician workflows.**

---

# Test Categories

Medical OS requires:

Unit Tests · Integration Tests · End-to-End Tests · Regression Tests · Performance Tests · Security Tests · **AI Evaluation Tests**

---

# Unit Tests

## Purpose

Verify isolated logic.

## Targets

Services · Utilities · Validators · AI Parsers · Prompt Manager · Medical Rules

## Coverage Target

| Level | Target |
|-------|--------|
| Target | **90%** |
| Minimum | **80%** |

---

# Integration Tests

## Purpose

Verify communication between layers.

## Examples

```
Controller → Service → Repository → Database
Authentication → Protected Endpoint
AI → Validation → Persistence
```

---

# End-to-End Tests

## Purpose

Verify complete physician workflow.

```
Login → Select Patient → Start Recording → Transcript → SOAP → Clinical Note → Approve → Copy → Complete
```

**Every release must pass E2E testing.**

詳細: [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md)

---

# AI Evaluation Tests

Every prompt requires:

```
Golden Dataset → AI Output → Expected Output → Comparison → Score
```

**Medical quality should be measurable.**

詳細: [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) · [`04_ai_development_rules.md`](./04_ai_development_rules.md)

---

# Regression Tests

Whenever a bug is fixed → Create regression test → Prevent recurrence

**Never fix the same bug twice.**

---

# Performance Tests

Measure: Login · Patient Search · Recording Start · SOAP Generation · Clinical Note Generation · Database Queries · History Search

**Target values should match MVP specifications.**

詳細: [`04_non_functional_requirements.md`](./04_non_functional_requirements.md) · [`14_performance_rules.md`](./14_performance_rules.md)

---

# Security Tests

Test: Authentication · Authorization · JWT · RBAC · SQL Injection · XSS · Prompt Injection · Rate Limiting · Sensitive Data Leakage

**Security regressions block release.**

詳細: [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) · [`13_security_rules.md`](./13_security_rules.md)

---

# Database Tests

Verify: Relations · Transactions · Constraints · Indexes · Version History · Rollback

**Medical integrity is critical.**

詳細: [`07_database_rules.md`](./07_database_rules.md)

---

# API Tests

Every endpoint verifies:

Success · Validation Error · Authentication Failure · Authorization Failure · Unexpected Error · Response Schema

詳細: [`06_backend_rules.md`](./06_backend_rules.md)

---

# Frontend Tests

Verify: Rendering · Interaction · Loading State · Error State · Accessibility · Clipboard · Navigation

**Avoid snapshot-only testing.**

詳細: [`05_frontend_rules.md`](./05_frontend_rules.md)

---

# AI Prompt Tests

Every prompt requires:

Normal Case · Edge Case · Failure Case · Empty Input · Malformed Input · Unexpected Transcript

**Prompt changes must remain measurable.**

詳細: [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md)

---

# Test Naming

## Good

`should_generate_valid_soap()` · `should_reject_invalid_token()` · `should_preserve_negation()`

## Bad

`test1()` · `works()` · `check()`

**Test names describe behavior.**

---

# Mocking Rules

## Mock

AI Providers · Storage · External APIs · Email · Future Notifications

## Do not mock

Business Logic · Medical Rules · Validation

**These should be tested directly.**

---

# Test Data

Use: **Anonymous · Synthetic · Generated** medical data

**Never use real patient information.**

---

# Continuous Integration

Every Pull Request runs:

```
Lint → Type Check → Unit Tests → Integration Tests → Build → E2E (Main Branch)
```

**No merge if tests fail.**

詳細: [`../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md`](../05_SYSTEM_ARCHITECTURE/11_deployment_architecture.md) · [`10_git_workflow_rules.md`](./10_git_workflow_rules.md)

---

# Coverage Rules

| Layer | Target |
|-------|--------|
| Services | **90%** |
| Repositories | **80%** |
| Utilities | **95%** |
| Critical Medical Logic | **100%** |

**Coverage is a guide—not the goal.**

**Meaningful tests matter more than percentages.**

---

# Failure Handling

Every test should clearly indicate: **What failed · Why it failed · How to reproduce**

**Avoid ambiguous failures.**

---

# Documentation

Complex tests should explain: Purpose · Scenario · Expected Behavior · Medical Context (if applicable)

**Future developers should understand the reason for each critical test.**

---

# Future Testing

Load Testing · Chaos Engineering · AI Benchmarking · FHIR Validation · Hospital Integration · Large-scale Clinical Evaluation

**These belong to future versions.**

---

# Testing Checklist

Before completing any feature, Cursor should verify:

Unit Test Exists · Integration Test Exists · Critical Workflow Tested · Validation Tested · Error Handling Tested · Security Tested · Logging Verified · Medical Safety Verified

---

# Core Principle

**Medical software earns trust through testing.**

Every feature should prove that it works, prove that it fails safely, and prove that physicians can rely on it.

**If it cannot be tested, it should be redesigned.**

---

# 関連

| 内容 | ファイル |
|------|----------|
| MVP Test Plan | [`../04_MVP_SPECIFICATION/12_test_plan.md`](../04_MVP_SPECIFICATION/12_test_plan.md) |
| Development Standards | [`../05_SYSTEM_ARCHITECTURE/13_development_standards.md`](../05_SYSTEM_ARCHITECTURE/13_development_standards.md) |
| MVP Goal | [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) |
| Frontend Rules | [`05_frontend_rules.md`](./05_frontend_rules.md) |
| Backend Rules | [`06_backend_rules.md`](./06_backend_rules.md) |
| Database Rules | [`07_database_rules.md`](./07_database_rules.md) |
| AI Prompt Rules | [`08_ai_prompt_rules.md`](./08_ai_prompt_rules.md) |
| AI Development Rules | [`04_ai_development_rules.md`](./04_ai_development_rules.md) |
| User Flow | [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md) |
| Security | [`../04_MVP_SPECIFICATION/10_security.md`](../04_MVP_SPECIFICATION/10_security.md) |
| Security Rules | [`13_security_rules.md`](./13_security_rules.md) |
| Git Workflow Rules | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
| Deployment Rules | [`15_deployment_rules.md`](./15_deployment_rules.md) |
| Final Checklist | [`16_final_checklist.md`](./16_final_checklist.md) |
| 次章 | [`10_git_workflow_rules.md`](./10_git_workflow_rules.md) |
