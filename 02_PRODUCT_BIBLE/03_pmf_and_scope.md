# Product Bible
# Chapter 3
# Product Strategy（プロダクト戦略）

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`02_principles_and_metrics.md`](./02_principles_and_metrics.md)

---

# このドキュメントの目的

Medical OSは思いつきで機能を追加するプロダクトではない。

市場には既に

- 電子カルテ
- AIスクライブ
- 音声入力
- 文書生成AI

が存在する。

その中でMedical OSが勝つためには、**「どこで勝負し、どこで勝負しないか」**を明確に定義する必要がある。

本ドキュメントは、Medical OSの**開発 · 事業 · 営業 · 資金調達**における戦略の基準となる。

---

# Product Strategy

Medical OSは**「一番高性能なAI」**を作ることを目的としない。

**「医療現場で最も使われるAI」**を作ることを目的とする。

そのため、技術ではなく**現場への導入しやすさ**を最優先する。

---

# 戦略① — 電子カルテを作らない

電子カルテ市場は**成熟市場**である。

電子カルテを置き換えるには

- 数年単位の開発
- 数億円規模の投資
- 医療機関の大規模な入れ替え

が必要となる。**Medical OSはそこでは戦わない。**

代わりに**電子カルテの前工程**を支援する。

```
診療
  ↓
Medical OS
  ↓
電子カルテ
```

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md`](../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md)

---

# 戦略② — 補助ツールとして始める

医療機関は**新しいシステム**を嫌う。  
しかし**便利な補助ツール**は導入されやすい。

Medical OSは既存システムを壊さない。  
今ある運用を変えず、**一部だけ改善**する。

これを最初の戦略とする。

---

# 戦略③ — 内科クリニックから始める

Version 0.1 は**内科クリニック専用**。

**理由**

- 患者数が多い
- SOAP文化がある
- 紹介状が多い
- 慢性疾患が多い
- 長期カルテが存在する
- 協力医師がいる

PMF後に歯科 · 薬局 · 看護へ広げる。

---

# 戦略④ — リアルタイム録音

Version 0.1 では**リアルタイム録音**を採用する。

**理由**: 診療終了後ではなく、**診療中から情報整理を始めたい**から。

ただし Version 0.1 では**録音終了後にSOAP生成**でもよい。

重要なのはリアルタイム表示ではなく、**リアルタイム取得**である。

---

# 戦略⑤ — Copy & Paste戦略

最初から**API連携はしない**。

**理由**

- 電子カルテごとにAPIが違う
- 保守コストが高い

まずは

```
コピー
  ↓
電子カルテへ貼り付け
```

だけでPMFを確認する。**APIはPMF後。**

---

# 戦略⑥ — MVPを最小化する

Version 0.1 で作るもの

```
リアルタイム録音
  ↓
文字起こし
  ↓
SOAP生成
  ↓
診療記録生成
  ↓
医師確認
  ↓
コピー
```

**これだけ。**

紹介状 · 診断書 · 長期要約 · API · FHIR などは**作らない**。

詳細: [`../04_MVP_SPECIFICATION/01_scope.md`](../04_MVP_SPECIFICATION/01_scope.md)

---

# 戦略⑦ — 情報を資産化する

普通のAIは**文章を作る**。

Medical OSは**構造化データ**を作る。

**診療情報そのもの**が資産になる。  
この構造化データから様々な文書を生成する。

---

# 戦略⑧ — Human First

AIが主役ではない。**医師が主役。**

AIは医師の思考を補助する。

- 診断はしない
- 処方もしない
- 最終責任も持たない

---

# 戦略⑨ — 現場から作る

Medical OSは机上で作らない。必ず

```
医療現場
  ↓
ヒアリング
  ↓
改善
  ↓
実証
  ↓
改善
```

を繰り返す。

---

# 最初の実証先

- **くしま内科**
- **野島先生（歯科）**

この2つを **Product Development Partner** と位置付ける。

---

# 戦略⑩ — PMFを最優先する

Version 0.1 では**売上よりもPMFを優先**する。

**成功条件**

- 医師が継続利用したいと言う
- カルテ作成時間が**50%以上**短縮
- 重大な誤記**0件**
- 毎日の診療で自然に使われる

PMFが取れるまでは、**機能追加より改善を優先**する。

---

# やらないこと

Version 0.1 では以下は**行わない**。

- 電子カルテ開発
- レセコン
- 会計
- 予約
- 診断AI
- 画像診断AI
- 薬剤提案
- FHIR
- HL7
- 病院対応

---

# Product Growth

```
Version 0.1  SOAP
  ↓
Version 0.2  紹介状
  ↓
Version 0.3  診断書
  ↓
Version 0.5  長期カルテ要約
  ↓
Version 1.0  Medical OS
```

**要確認**: Domain Bible · Roadmap との Version 表記整合

---

# Decision Rule

新しい機能を追加するときは、必ず **「PMFを早めるか？」** を判断基準にする。

**PMFに関係ない機能は追加しない。**

---

# Core Principle

Medical OSは**「大きなシステム」**から始めない。

**「毎日使われる小さな価値」**から始める。

その積み重ねによって、**医療現場のOS**になることを目指す。

---

# 付録: PMF判断基準 · Version 0.1 スコープメモ

## PMF判断基準（背景知見）

- 週3日以上使用
- 修正時間 < 手入力
- 作成時間50%以上減
- 「なくなると困る」

## Constitution — Version 0.1（4 features）

1. Real-time recording
2. Speech-to-text
3. SOAP generation
4. Clinical note generation

## 別ユーザー指示 — Version 0.1（6 features）

1. 音声ファイルアップロード
2. 文字起こし
3. SOAP下書き生成
4. 医師編集
5. コピー
6. 生成前後の履歴

→ **Project Overview v1.0**: [`../04_MVP_SPECIFICATION/01_project_overview.md`](../04_MVP_SPECIFICATION/01_project_overview.md) · [`../07_ROADMAP/02_decision_log.md`](../07_ROADMAP/02_decision_log.md)

---

# 関連章

| 章 | ファイル |
|----|----------|
| Medical OSとは何か | [`01_overview.md`](./01_overview.md) |
| なぜ作るのか | [`02_principles_and_metrics.md`](./02_principles_and_metrics.md) |
| PMF Strategy | [`04_pmf_strategy.md`](./04_pmf_strategy.md) |
| ターゲットユーザー | [`05_target_user.md`](./05_target_user.md) |
| ポジショニング | [`06_positioning.md`](./06_positioning.md) |
| 競合分析 | [`07_competitive_analysis.md`](./07_competitive_analysis.md) |
| プロダクト原則 | [`08_product_principles.md`](./08_product_principles.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| UI · 開発思想 | [`10_ui_ux_principles.md`](./10_ui_ux_principles.md) |
| ロードマップ | [`../07_ROADMAP/01_version_roadmap.md`](../07_ROADMAP/01_version_roadmap.md) |
