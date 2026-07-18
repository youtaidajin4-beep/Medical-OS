# Product Bible
# Chapter 1
# Medical OSとは何か

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md)

---

# このドキュメントの目的

Medical OSはAIを使ったカルテ作成ツールではない。

また、

- 電子カルテでもない
- 音声入力ソフトでもない
- 文字起こしアプリでもない

Medical OSとは、**医療現場の「情報整理」を支援するAIプラットフォーム**である。

このドキュメントでは、Medical OSが

- 何を目指し
- 何を作り
- 何を作らないのか

を定義する。

**この考え方は、すべての設計 · 開発 · 意思決定より優先される。**

---

# Vision

医療従事者が、**"患者と向き合う時間"**を最大化する。

医療現場から**「情報整理」という見えない負担**をなくす。

---

# Mission

診療情報を一度だけ整理し、  
あらゆる医療文書へ変換できる世界を作る。

```
One Consultation
  ↓
One Structured Dataset
  ↓
Many Medical Documents
```

これがMedical OSの核となる思想である。

---

# 私たちが解決したい問題

多くの人は「医師はカルテ入力が大変」だと思っている。

しかし、実際に現場でヒアリングすると違った。

先生が本当に時間を使っているのは

- 過去カルテを探す
- 患者の長い経過を理解する
- 情報を整理する
- 紹介状を書く
- 診断書を書く
- 患者説明を書く

ことである。

つまり、問題は**タイピングではない。情報整理**である。

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/03_medical_workflow.md`](../01_MEDICAL_DOMAIN_BIBLE/03_medical_workflow.md)

---

# Product Definition

Medical OSとは**診療情報整理AI**である。

- AIスクライブでもない
- 電子カルテでもない
- 文章生成AIでもない

Medical OSは、診療情報を構造化し、  
必要なタイミングで必要な医療文書へ変換する **Information Platform** である。

---

# 私たちが作らないもの

Medical OSは

- 電子カルテを作らない
- レセコンを作らない
- 診断AIを作らない
- 薬を決めるAIを作らない
- 医療判断をするAIを作らない

**これは今後も変わらない。**

---

# 私たちが作るもの

Medical OSは**診療情報を整理する**。

その情報から

- SOAP
- 診療録
- 紹介状
- 診断書
- 患者説明
- 主治医意見書

などを生成する。

**「書類を作るAI」**ではなく、**「情報を再利用できるAI」**である。

---

# Product Philosophy

患者との会話は**一度しかない**。

その一度の診療から何十枚もの書類を書き直すのは、医療者の時間を奪っている。

Medical OSは、その一度の診療を**一つの構造化データ**として保存する。  
そのデータから**何枚でも書類を生成**する。

これがMedical OS最大の価値である。

---

# なぜ今なのか

日本では

- 医師の働き方改革
- 高齢化
- 医療DX
- 人材不足

が同時に進んでいる。

今後、医療現場は人を増やすことではなく、**一人当たりの生産性を高める**ことが必要になる。

Medical OSはそのためのAIである。

---

# Product Scope

## Version 0.1

| 項目 | 内容 |
|------|------|
| **対象** | 内科クリニック |
| **入力** | リアルタイム診療音声 |
| **出力** | SOAP · 診療記録 |
| **対象外** | 紹介状 · 診断書 · API連携 · レセコン · 病院向け機能 |

詳細: [`../04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md)

---

# Product Position

```
電子カルテ
  ↓
Medical OS
  ↓
医師
```

**ではない。**

正しくは

```
患者
  ↓
医師
  ↓
Medical OS
  ↓
電子カルテ
```

Medical OSは診療の後ろではなく、**診療と思考の間**に存在する。

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md`](../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md)

---

# Long Vision

```
Version 0.1  診療記録
  ↓
Version 1    紹介状
  ↓
Version 2    診断書
  ↓
Version 3    患者説明
  ↓
Version 4    長期経過要約
  ↓
Version 5    Medical OS（医療情報OS）
```

**要確認**: Domain Bible · Roadmap との Version 表記整合

詳細: [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md)

---

# Core Principle

Medical OSは**文章を書くAI**ではない。  
**診療情報を整理するAI**である。

文章はその結果として生まれる。

私たちは **"医療文書"** を作るのではない。  
**"医療情報"** を整理するのである。

---

# 補足: プロダクト名

公式名称（Constitution）: **AI Medical Scribe OS**  
ドキュメント上の呼称: **Medical OS**  
リポジトリ名: **Medical-OS**

第一次ターゲット: 外来内科クリニック（楠見内科類似） · 第一EHR: **MEDLEY AI CLOUD**（**要確認**: CLINICS表記）

---

# 関連章

| 章 | ファイル |
|----|----------|
| なぜ Medical OS を作るのか | [`02_principles_and_metrics.md`](./02_principles_and_metrics.md) |
| PMF · プロダクト戦略 | [`03_pmf_and_scope.md`](./03_pmf_and_scope.md) |
| PMF Strategy | [`04_pmf_strategy.md`](./04_pmf_strategy.md) |
| ターゲットユーザー | [`05_target_user.md`](./05_target_user.md) |
| ポジショニング | [`06_positioning.md`](./06_positioning.md) |
| 競合分析 | [`07_competitive_analysis.md`](./07_competitive_analysis.md) |
| プロダクト原則 | [`08_product_principles.md`](./08_product_principles.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| UI · UX | [`10_ui_ux_principles.md`](./10_ui_ux_principles.md) |
| Medical OSの哲学 | [`11_medical_os_philosophy.md`](./11_medical_os_philosophy.md) |
| 長期ビジョン | [`12_long_term_vision.md`](./12_long_term_vision.md) |
