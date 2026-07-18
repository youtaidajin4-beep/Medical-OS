# Product Bible
# Chapter 4
# PMF Strategy（Product Market Fit）

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`03_pmf_and_scope.md`](./03_pmf_and_scope.md)

---

# このドキュメントの目的

Medical OSの最初の目標は、**「高性能なAIを作ること」**ではない。

**「医療現場で毎日使われるプロダクトを作ること」**である。

そのため、本ドキュメントでは

- PMFとは何か
- Medical OSにおけるPMF
- PMFを達成するまでの戦略
- PMF前に絶対やってはいけないこと

を定義する。

---

# PMFとは

PMF（Product Market Fit）とは、市場が**「これが欲しかった」**と言う状態である。

営業で売るのではなく、**現場が自然に使い続ける状態**を指す。

---

# Medical OSにおけるPMF

私たちが目指すPMFは、AIが高性能になることではない。

医師が**「これがないと困る」**と言う状態になることである。

---

# PMFの判断基準

Version 0.1 では、以下を満たしたとき**PMFに近づいた**と判断する。

- 毎日の診療で自然に使われる
- 医師が自ら起動する
- 診療終了後にAIを開くことが習慣になる
- AIなしのカルテ作成に戻りたくない
- 他の先生にも紹介したいと言われる

---

# 最初の顧客

Version 0.1 では**市場全体を狙わない**。

最初の顧客は**くしま内科のみ**。

**一人の先生が毎日使う。** これを成功させる。

---

# Product Development Partner

```
くしま内科  → Version 0.1
野島先生    → Version 1.0（歯科）
```

この二人は単なる顧客ではない。**共同開発パートナー**である。

---

# Product Development Loop

Medical OSは以下を**毎週**繰り返す。

```
ヒアリング
  ↓
改善
  ↓
実装
  ↓
診療
  ↓
フィードバック
  ↓
改善
```

**このサイクルを最速で回す。**

---

# PMF前にやらないこと

絶対に以下を行わない。

- 全国展開
- 営業拡大
- 広告
- 大量販売

まず**一人の先生が本当に毎日使う状態**を作る。

---

# Version 0.1のゴール

```
リアルタイム録音
  ↓
文字起こし
  ↓
SOAP生成
  ↓
診療記録生成
  ↓
医師修正
  ↓
コピー
```

**これだけ。** 紹介状も診断書もまだ作らない。

---

# 成功条件（KPI）

| 指標 | 目標 |
|------|------|
| カルテ作成時間 | 5分 → **2分以内** |
| 時間削減率 | **50%以上** |
| 重大な事実誤認 | **0件** |
| 薬剤誤り | **0件** |
| 日付誤り | **0件** |
| 否定表現誤り | **0件** |

---

# 定性評価

先生に以下を聞く。

- 毎日使いたいか
- 何が一番良かったか
- 何が一番ストレスだったか
- AIが邪魔になった場面はあったか
- どのタイミングで使いたいか
- このAIが無くなると困るか

---

# PMF前の開発ルール

新しい機能を思いついても**追加しない**。

必ず **「今の先生がもっと使うようになるか？」** だけで判断する。

---

# Feature Creepを防ぐ

Version 0.1 では**絶対に追加しない**。

- 紹介状
- 診断書
- 患者説明
- 薬歴
- FHIR
- API
- 電子カルテ連携
- 画像解析
- 予約
- 会計

**理由**: PMFが遠くなるから。

---

# PMF後の流れ

```
Version 0.2  紹介状
  ↓
Version 0.3  診断書
  ↓
Version 0.5  長期カルテ要約
  ↓
Version 1.0  歯科対応
  ↓
Version 2.0  薬局
  ↓
Version 3.0  病院
```

**要確認**: Chapter 3 · Domain Bible · Roadmap との整合

---

# PMFとは（再定義）

PMFとは**機能が多い状態**ではない。

**医師の生活にMedical OSが自然に入り込んだ状態**である。

---

# PMFの本当のゴール

先生が診療を始めるときパソコンを開く。  
その次に**Medical OSを開く**。

この状態になれば、PMFは近い。

---

# Core Principle

私たちは**100人の先生に一回**使ってもらうことを目指さない。

**一人の先生が100回使うプロダクト**を作る。

それがMedical OSのPMFである。

---

# 関連章

| 章 | ファイル |
|----|----------|
| Product Strategy | [`03_pmf_and_scope.md`](./03_pmf_and_scope.md) |
| ターゲットユーザー | [`05_target_user.md`](./05_target_user.md) |
| ポジショニング | [`06_positioning.md`](./06_positioning.md) |
| 競合分析 | [`07_competitive_analysis.md`](./07_competitive_analysis.md) |
| プロダクト原則 | [`08_product_principles.md`](./08_product_principles.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| UI · 開発思想 | [`10_ui_ux_principles.md`](./10_ui_ux_principles.md) |
| MVP スコープ | [`../04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md) |
| 決定ログ | [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md) |
