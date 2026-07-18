# Product Bible
# Chapter 8
# Product Principles（プロダクト原則）

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`07_competitive_analysis.md`](./07_competitive_analysis.md)

---

# このドキュメントの目的

Medical OSには、実装ルールよりも重要なものがある。

それは**「判断基準」**である。

- どんな機能を追加するか
- どんなUIにするか
- どんなAIを作るか

**すべてこの原則に従う。**

---

# Principle 01 — Solve Reality

**現場を解決する。**

アイデアを実装するのではない。**現場の課題を解決する。**

医療者が困っていないものは作らない。

---

# Principle 02 — Understand Before Building

**作る前に理解する。**

私たちはAIを説明しに行かない。**医療現場を理解しに行く。**

> 「今日は答えを持っていかない。答えを持って帰る。」

この姿勢を忘れない。

---

# Principle 03 — Information First

**文章ではなく情報を作る。**

Medical OSが扱うのは文章ではない。**診療情報**である。

文章は**情報から生成される**。

---

# Principle 04 — Never Type Twice

**同じ情報を二度入力しない。**

診療は一回。入力も一回。  
そこから**何枚でも文書を生成**する。

---

# Principle 05 — Human First

**AIは主役ではない。医師が主役。**

AIは思考を補助する。**判断は人間が行う。**

---

# Principle 06 — Safe by Design

**便利さより安全性。**

AIは

- 推測しない
- 創作しない
- 診断しない

迷ったら**「分からない」**と答える。

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md`](../01_MEDICAL_DOMAIN_BIBLE/13_security_and_law.md)

---

# Principle 07 — Start Small

**最初から全部作らない。**

Version 0.1 — **SOAPだけ**。

PMF後 → 紹介状 · 診断書 · 患者説明 へ広げる。

---

# Principle 08 — Iterate Weekly

**毎週改善する。**

```
ヒアリング → 改善 → 実装 → 診療 → 改善
```

**このサイクルを止めない。**

---

# Principle 09 — Build With Doctors

**医師のために作る**ではない。**医師と一緒に作る。**

共同開発を**最も重要な文化**とする。

---

# Principle 10 — Long-Term Thinking

目先の機能を追わない。

Medical OSは**10年後も使われる基盤**を作る。  
だから**設計を優先**する。

---

# Principle 11 — Simplicity Wins

**機能は少なく。価値は大きく。**

ボタンを増やすより**考える時間を減らす**。

---

# Principle 12 — Workflow Before AI

**AIから考えない。診療フローから考える。**

AIはワークフローの一部である。  
**AIのために診療フローを変えない。**

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/03_medical_workflow.md`](../01_MEDICAL_DOMAIN_BIBLE/03_medical_workflow.md)

---

# Principle 13 — Learn From Reality

一番価値がある情報は**ネットにはない。現場にある。**

- 先生の一言
- 看護師の一言
- 受付の一言
- 患者の一言

**これが次のプロダクトになる。**

---

# Principle 14 — Product Before Technology

Whisper · GPT · Claude · Gemini — **どれを使うかは重要ではない。**

一番重要なのは**医療現場で使われること**。

**技術は手段**である。

---

# Principle 15 — Build an Operating System

Medical OSは**アプリではない**。

将来、**診療情報が流れる基盤**になる。  
すべての設計は**そこへ向かう**。

---

# Decision Rule

迷ったら、必ずこの質問をする。

> **「この機能は、先生が毎日使う理由になるか？」**

- **YES** → 作る
- **NO** → 作らない

---

# Core Principle

私たちは**AIを作る会社ではない**。

**医療現場を理解する会社**である。

理解した結果として、Medical OSが生まれる。

---

# 関連章

| 章 | ファイル |
|----|----------|
| Product Constitution | [`../00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md) |
| なぜ作るのか | [`02_principles_and_metrics.md`](./02_principles_and_metrics.md) |
| PMF Strategy | [`04_pmf_strategy.md`](./04_pmf_strategy.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| UI · 開発思想 | [`10_ui_ux_principles.md`](./10_ui_ux_principles.md) |
| Cursor Rules | [`../06_CURSOR_RULES/01_global_rules.md`](../06_CURSOR_RULES/01_global_rules.md) · [`../06_CURSOR_RULES/02_code_generation_rules.md`](../06_CURSOR_RULES/02_code_generation_rules.md) · [`../06_CURSOR_RULES/03_architecture_rules.md`](../06_CURSOR_RULES/03_architecture_rules.md) · [`../06_CURSOR_RULES/04_ai_development_rules.md`](../06_CURSOR_RULES/04_ai_development_rules.md) · [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) · [`../06_CURSOR_RULES/06_backend_rules.md`](../06_CURSOR_RULES/06_backend_rules.md) · [`../06_CURSOR_RULES/07_database_rules.md`](../06_CURSOR_RULES/07_database_rules.md) · [`../06_CURSOR_RULES/08_ai_prompt_rules.md`](../06_CURSOR_RULES/08_ai_prompt_rules.md) · [`../06_CURSOR_RULES/09_testing_rules.md`](../06_CURSOR_RULES/09_testing_rules.md) · [`../06_CURSOR_RULES/10_git_workflow_rules.md`](../06_CURSOR_RULES/10_git_workflow_rules.md) · [`../06_CURSOR_RULES/11_documentation_rules.md`](../06_CURSOR_RULES/11_documentation_rules.md) · [`../06_CURSOR_RULES/12_code_review_rules.md`](../06_CURSOR_RULES/12_code_review_rules.md) · [`../06_CURSOR_RULES/13_security_rules.md`](../06_CURSOR_RULES/13_security_rules.md) · [`../06_CURSOR_RULES/14_performance_rules.md`](../06_CURSOR_RULES/14_performance_rules.md) · [`../06_CURSOR_RULES/15_deployment_rules.md`](../06_CURSOR_RULES/15_deployment_rules.md) · [`../06_CURSOR_RULES/16_final_checklist.md`](../06_CURSOR_RULES/16_final_checklist.md) · [`../06_CURSOR_RULES/README.md`](../06_CURSOR_RULES/README.md) |

**付録**: 成功指標 · Data Policy → [`02_principles_and_metrics.md`](./02_principles_and_metrics.md) 付録
