# Medical OS Version 0.1 — Implementation Kickoff

Version: 1.0  
Status: **実装基準ドキュメント**（Kickoff Instructions 採用 — 2026-07）

最上位: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
Decision Log: [`02_decision_log.md`](./02_decision_log.md)  
実装計画: Cursor Plan `v0.1 Implementation Kickoff`

---

# Purpose

Version 0.1 実装の**最上位実装指示**。MVP/Bible と矛盾する場合、**本書が優先**（Decision Log 参照）。

Medical OS は電子カルテ本体ではない。既存 EHR（第一検証: **MEDLEY CLINICS**）の横で動き、診療後の SOAP と通常診療記録の下書きを生成する。

**Version 0.1 仮説**: 診療中音声から下書きを作成し、医師の診療後記録時間を **5分 → 2分以内** に短縮できるか。

---

# Document Path Mapping

Kickoff の `docs/` 表記 → 本リポジトリ（ルート維持）:

| Kickoff | 実パス |
|---------|--------|
| `docs/00_PRODUCT_CONSTITUTION` | [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) |
| `docs/01_MEDICAL_DOMAIN_BIBLE` | [`01_MEDICAL_DOMAIN_BIBLE/`](../01_MEDICAL_DOMAIN_BIBLE/) |
| `docs/02_PRODUCT_BIBLE` | [`02_PRODUCT_BIBLE/`](../02_PRODUCT_BIBLE/) |
| `docs/03_MVP_SPECIFICATION` | [`04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/) |
| `docs/04_SYSTEM_DESIGN` | [`05_SYSTEM_ARCHITECTURE/`](../05_SYSTEM_ARCHITECTURE/) |
| `docs/05_CURSOR_RULES` | [`06_CURSOR_RULES/`](../06_CURSOR_RULES/) |

---

# Core Workflow

```
Login → Patient/Anonymous Case → Consultation → Record → RT Transcript
→ Stop → Final Transcript → Structured Extraction → SOAP + Clinical Note
→ Warnings → Physician Review → Approve → Copy → MEDLEY CLINICS
```

---

# Mandatory Features (Summary)

- Auth (login/logout/session, single clinic initially)
- Patient **or** Anonymous Case selection
- Recording: start / pause / resume / stop (30min typical, 60min max)
- Offline-resilient chunk upload design
- **2-pass STT**: RT preview only; **final transcript** from full audio re-processing
- Speaker labels: Physician / Patient / Other / Unknown (no guessing)
- Structured extraction → SOAP + Clinical Note (no fabrication)
- Clinical warnings (medications, numbers, negation, etc.)
- Physician approval gate — **copy disabled until approved**
- Revision history, audit trail
- Audio deleted after AI processing

詳細: Kickoff Instructions 全文（Cursor セッション）· [`04_MVP_SPECIFICATION/`](../04_MVP_SPECIFICATION/)

---

# Implementation Phases & PRs

| PR | Phase | Scope |
|----|-------|-------|
| PR0 | Docs | Kickoff adoption, conflict resolution |
| PR1 | Foundation | Monorepo, Docker, Health API, CI |
| PR2 | Mock Workflow | Login → Copy without AI |
| PR3 | Persistence | Full Prisma schema, history |
| PR4 | Browser Audio | MediaRecorder, chunks, upload |
| PR5 | Transcription | STT provider, 2-pass flow |
| PR6 | AI Pipeline | Extraction, SOAP, Clinical Note |
| PR7 | Pilot Quality | Audit, diff, audio deletion, tests |

---

# AI Absolute Rules

1. Never generate final chart directly from raw transcript
2. Structure medical information first
3. Validate structured output (Zod / JSON Schema)
4. Generate SOAP and Clinical Note from validated structure only
5. Never add information not in input
6. Never auto-approve or auto-send to EHR

詳細: [`../04_MVP_SPECIFICATION/09_ai_pipeline.md`](../04_MVP_SPECIFICATION/09_ai_pipeline.md) · [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md)

---

# Technology Stack

Next.js · NestJS · TypeScript · PostgreSQL · Prisma · pnpm · Turborepo · Docker Compose

詳細: [`../05_SYSTEM_ARCHITECTURE/15_technology_stack.md`](../05_SYSTEM_ARCHITECTURE/15_technology_stack.md)

---

# Priority When in Doubt

1. Patient safety → 2. Medical safety → 3. Physician review → 4. No data loss → 5. Don't interrupt consultation → 6. PMF validation → 7. Simplicity

---

# 関連

| 内容 | ファイル |
|------|----------|
| MVP Goal | [`../04_MVP_SPECIFICATION/13_mvp_goal.md`](../04_MVP_SPECIFICATION/13_mvp_goal.md) |
| Development Roadmap | [`../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md`](../05_SYSTEM_ARCHITECTURE/16_development_roadmap.md) |
| Final Checklist | [`../06_CURSOR_RULES/16_final_checklist.md`](../06_CURSOR_RULES/16_final_checklist.md) |
