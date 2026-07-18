# Product Bible
# Chapter 2
# なぜMedical OSを作るのか

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`01_overview.md`](./01_overview.md)

---

# このドキュメントの目的

Medical OSは「AIを使ったカルテ作成ツール」を作るプロジェクトではない。

世界中でAIスクライブが急速に普及している現在、  
単に音声からSOAPを生成するだけでは**競争優位性は生まれない**。

このドキュメントでは、

- なぜMedical OSを作るのか
- なぜ今なのか
- なぜ既存サービスでは十分ではないのか
- 私たちが本当に解決したい課題は何か

を定義する。

---

# 私たちが最初に考えていたこと

最初は

「カルテ入力が大変だから、音声からSOAPを作れば良い。」

と思っていた。

しかし、実際に医療現場へ入り、先生方へヒアリングを行うと、**課題は全く違っていた**。

---

# 現場で分かった本当の課題

先生は「カルテを書くこと」では困っていなかった。

本当に時間を使っているのは

- 過去カルテを探す
- 数年前の経過を思い出す
- 薬の変更履歴を確認する
- 紹介状を書く
- 診断書を書く
- 患者説明を書く
- 同じ内容を何度も書く

ことであった。

つまり、**タイピングではなく情報整理**が本当の仕事だった。

---

# AIスクライブの限界

現在のAIスクライブは

```
診療音声
  ↓
文字起こし
  ↓
SOAP生成
  ↓
（ここで終わる）
```

ものが多い。

しかし、医師の仕事は**SOAPを書いたあとから始まる**。

- 紹介状
- 診断書
- 患者説明
- 介護意見書
- 返書
- 健康診断書

など、多くの書類が残っている。

---

# 私たちが目指す世界

診療は**一度しかない**。

しかし、その診療情報は**何十回も書き直されている**。

これは医療者の時間だけでなく、**患者と向き合う時間**も奪っている。

Medical OSは、一度整理した情報を**必要な文書へ何度でも変換**する。

---

# Medical OSの考え方

**診療情報は資産**である。

現在は SOAP · 紹介状 · 診断書 · 患者説明 がそれぞれ独立して作られている。

Medical OSでは、診療情報を**一つの構造化データ**として保持する。  
そこから必要な文書を生成する。

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/04_documentation.md`](../01_MEDICAL_DOMAIN_BIBLE/04_documentation.md)

---

# くしま内科で学んだこと

実際のヒアリングでは、音声入力よりも

- 検索
- 整理
- 理解

の方が**大きな課題**だった。

先生は「カルテを書く」のではなく、**「患者を理解する」**ことに時間を使っていた。

この発見はMedical OSの方向性を大きく変えた。

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/06_internal_medicine.md`](../01_MEDICAL_DOMAIN_BIBLE/06_internal_medicine.md)

---

# 私たちが解決したいこと

**Before**

```
患者 → 診療 → カルテ → 紹介状 → 診断書 → 患者説明 → 介護書類
（すべて別々に作る）
```

**After**

```
患者 → 診療 → Medical OS → 診療情報整理 → 必要な文書を生成
（同じ情報を二度入力しない）
```

---

# Product Philosophy

Medical OSは**「カルテを書くAI」**ではない。  
**「診療情報を理解するAI」**である。

理解した結果として、SOAP · 診療録 · 紹介状 · 診断書 などが生成される。

---

# 私たちが勝負する場所

私たちは

- 音声認識では勝負しない
- 文字起こしでも勝負しない
- LLMでも勝負しない

**勝負するのは「診療情報の構造化」**である。

診療情報をどれだけ正しく整理し、どれだけ再利用できるか。  
ここがMedical OS最大の競争力になる。

---

# 長期的なゴール

Medical OSは、診療情報を中心とした **Information Platform** になる。

最終的には

```
医師 → 看護師 → 薬剤師 → 歯科 → 介護 → 地域医療
```

まで、**一つの診療情報でつながる**世界を目指す。

---

# Core Principle

私たちは書類を減らしたいのではない。

**情報整理という医療者の見えない負担**をなくしたい。

Medical OSはそのための **Healthcare Information Platform** である。

---

# 付録: 原則 · 成功指標 · Data Policy

（旧 Product Bible 02 — Constitution 参照用）

## Core Principles（確定）

1. Physician always makes final decision
2. AI never invents facts
3. Uncertainty must be explicit
4. Every document editable
5. Every document physician-approved before use
6. Patient safety > convenience

## Success Metrics（Constitution）

| 指標 | 現状 | 目標 |
|------|------|------|
| 文書作成時間 | ≈ 5 min | ≤ 2 min |
| 時間削減 | — | ≥ 50% |
| 重大幻覚 | — | 0 |
| 薬剤/日付/数値/否定の誤り | — | 0 |
| 医師満足度 | — | ≥ 80% |
| 再利用意向 | — | ≥ 80% |

## Data Policy

| データ | 方針 |
|--------|------|
| Audio | 一時保存、処理後自動削除 |
| Transcript | 検証用保存可 |
| SOAP / Edited SOAP | 保存 |
| AI出力と医師編集の差分 | 品質改善のため保存 |
| Patient ID | 匿名内部IDのみ |

**要確認**: 0.1も匿名 · 模擬データのみか

## 判断基準

- 医療者の時間を減らすか
- 患者と向き合う時間を増やすか
- 業務フローを壊さないか
- 医療安全を損なわないか
- 医師が最終確認できるか

---

# 関連章

| 章 | ファイル |
|----|----------|
| Medical OSとは何か | [`01_overview.md`](./01_overview.md) |
| PMF · プロダクト戦略 | [`03_pmf_and_scope.md`](./03_pmf_and_scope.md) |
| Domain Bible Ch6 | [`../01_MEDICAL_DOMAIN_BIBLE/06_internal_medicine.md`](../01_MEDICAL_DOMAIN_BIBLE/06_internal_medicine.md) |
