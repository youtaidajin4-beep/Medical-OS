# MVP Specification
# 14 — UI Guideline

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`13_mvp_goal.md`](./13_mvp_goal.md)  
実装: [`../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md`](../05_SYSTEM_ARCHITECTURE/02_frontend_architecture.md)  
Kickoff: [`../07_ROADMAP/04_implementation_kickoff.md`](../07_ROADMAP/04_implementation_kickoff.md)

---

# Philosophy

- Interface should disappear
- Minimum clicks
- Clear purpose per screen
- Physicians should not stare at the screen during consultation

---

# Design Principles (v0.1)

- PC browser first; tablet must not break
- Light/white background, large readable text
- Large record button; clear recording/paused states
- No unnecessary color or animation
- Primary actions in predictable locations
- Minimize screen transitions
- Quiet, clinical appearance — usability over aesthetics

---

# Consultation Screen — During Recording

| Area | Content |
|------|---------|
| Top | Patient / anonymous case info |
| Center | Recording state + elapsed time |
| Bottom | Latest 1–2 lines of RT transcript (preview) |
| Actions | Pause · Stop |

Physician should **not** need continuous screen interaction.

---

# Consultation Screen — After Recording

| Area | Content |
|------|---------|
| Left | Full transcript (editable, speaker labels) |
| Right | SOAP / Clinical Note tabs |
| Top/Right | Clinical warnings (要確認) |
| Bottom | Approve · Copy (disabled until approved) |

---

# Approval & Copy Gate

- All AI output is **draft** until physician approves
- **Copy buttons disabled** until「確認済み」
- After approval, copy remains editable; edits create new revision

---

# Flow

```
Stop Recording → Final STT → AI Processing → Review Screen
→ Check Warnings → Edit SOAP/Note → Approve → Copy
```

---

# 関連

| 内容 | ファイル |
|------|----------|
| Screen Specification | [`05_screen_specification.md`](./05_screen_specification.md) |
| UI/UX Principles | [`../02_PRODUCT_BIBLE/10_ui_ux_principles.md`](../02_PRODUCT_BIBLE/10_ui_ux_principles.md) |
