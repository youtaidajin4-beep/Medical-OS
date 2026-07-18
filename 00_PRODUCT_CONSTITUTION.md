# AI Medical Scribe OS — Product Constitution

Version: 1.0  
Status: **最上位ドキュメント**（すべての設計・開発判断の前提）

関連: [`README.md`](./README.md) · [`02_PRODUCT_BIBLE/README.md`](./02_PRODUCT_BIBLE/README.md) · [`07_ROADMAP/02_decision_log.md`](./07_ROADMAP/02_decision_log.md)

---

# Project Name

AI Medical Scribe OS

---

# Purpose

This product is an AI-powered medical documentation assistant.

It is NOT an Electronic Health Record (EHR).

It is NOT a replacement for existing EHR systems.

Its purpose is to reduce documentation burden for physicians while allowing them to continue using their existing EHR.

The first target EHR is **MEDLEY CLINICS** (Version 0.1 pilot). Constitution originally referenced MEDLEY AI CLOUD — unified per Implementation Kickoff v1.0.

---

# Vision

Return physicians' time to patient care.

Doctors should spend more time looking at patients and less time looking at computers.

The AI exists to assist physicians, not replace them.

---

# Mission

Create an AI assistant that listens during consultations, understands the medical context, and generates high-quality medical documentation.

The AI should reduce administrative burden while maintaining physician control over every document.

---

# Product Position

This product is an extension layer.

It is not an EHR.

It sits on top of an EHR.

Workflow:

Patient

↓

Consultation

↓

AI Medical Scribe

↓

Generated SOAP / Clinical Note

↓

Physician Review

↓

Copy to EHR (MEDLEY)

Future:

Direct API integration with EHR when available.

---

# First Target User

Internal medicine physicians in outpatient clinics.

The initial pilot is designed specifically for physicians similar to Kushima Internal Medicine Clinic.

Dentistry will be supported later.

---

# PMF Strategy

Do one thing extremely well.

Version 0.1 focuses on only four features.

1. Real-time recording

2. Speech-to-text

3. SOAP generation

4. Clinical note generation

Everything else is postponed.

---

# What We Will NOT Build Yet

No diagnosis support.

No prescription recommendation.

No medical decision making.

No automatic EHR writing.

No referral letter generation.

No medical certificate generation.

No insurance documentation.

No care plan documentation.

These features will be added only after Product Market Fit.

---

# Core Principles

1.

The physician always makes the final decision.

AI never replaces physician judgment.

2.

AI never invents facts.

No hallucination is acceptable.

3.

If information is uncertain, the AI must explicitly indicate uncertainty.

4.

Every generated document must be editable.

5.

Every generated document must be approved by the physician before use.

6.

Patient safety is always more important than convenience.

---

# Success Metrics

Current documentation time

≈ 5 minutes

Target

≤ 2 minutes

Time reduction

≥ 50%

Critical hallucinations

0

Medication errors

0

Date errors

0

Numeric errors

0

Negation errors

0

Physician satisfaction

≥ 80%

Reuse intention

≥ 80%

---

# Data Policy

Audio

Stored temporarily.

Automatically deleted after processing.

Transcript

Can be stored for verification.

SOAP

Stored.

Edited SOAP

Stored.

Difference between AI output and physician edits

Stored for quality improvement.

Patient ID

Anonymous internal identifier only.

---

# AI Responsibilities

The AI is responsible for:

Speech recognition

Medical terminology correction

Conversation understanding

SOAP generation

Clinical note generation

Structured information extraction

Nothing more.

---

# Physician Responsibilities

The physician is responsible for:

Diagnosis

Treatment

Prescription

Medical judgment

Final approval

Legal responsibility

---

# UI Philosophy

The interface should disappear.

Doctors should spend their time talking to patients, not operating software.

The UI must require as few clicks as possible.

Every screen should have a clear purpose.

---

# Security Philosophy

Security is prioritized over convenience.

Patient data must be protected.

Audio should never be retained unnecessarily.

Every access should be logged.

---

# Long-term Vision

Version 0.1

SOAP

Clinical Note

↓

Version 0.2

Referral Letter

↓

Version 0.3

Medical Certificate

↓

Version 0.4

Long-term Care Opinion Letter

↓

Version 0.5

Custom Templates

↓

Version 1.0

Medical Document Platform

↓

Version 2.0

Direct MEDLEY Integration

↓

Version 3.0

Multi-EHR Platform

---

# Development Philosophy

Build for physicians.

Not for engineers.

Every feature must answer one question:

"Does this save physicians time while maintaining safety?"

If the answer is no,

do not build it.

---

# Technology Philosophy

AI is a tool.

AI is not the product.

The product is the physician experience.

Everything should optimize physician workflow.

---

# Future Expansion

Future supported documents include:

SOAP

Clinical Note

Referral Letter

Medical Certificate

Long-term Care Opinion Letter

Health Check Report

Patient Explanation

Insurance Documents

Custom Templates

All documents should be generated from the same structured clinical information.

One consultation.

Multiple outputs.

---

# Final Statement

The goal is not to build another AI.

The goal is to create the best documentation assistant for physicians.

Every design decision should reduce cognitive load, improve physician workflow, and increase patient interaction time.
