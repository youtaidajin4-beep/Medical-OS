# Product Bible
# Chapter 10
# UI / UX Principles（UI・UX設計思想）

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`09_ai_principles.md`](./09_ai_principles.md)

---

# このドキュメントの目的

Medical OSは**AIプロダクトではない**。

**医療者が毎日使う仕事道具**である。

最も重要なのは「使いやすいこと」ではない。  
**「存在を意識させないこと」**である。

---

# Medical OSのUI思想

理想のUIとは**目立つUI**ではない。**存在を忘れるUI**である。

先生はMedical OSを操作したいのではない。**患者を診たい**のである。

---

# Principle 01 — Patient First

**画面ではなく患者を見る。**

Medical OSは診療中に先生の視線を画面へ奪ってはいけない。  
**患者との会話を優先**する。

---

# Principle 02 — Zero Friction

**一つの操作でも減らす。**

クリック · 入力 · 確認 · 画面遷移 · スクロール — **すべて最小限**にする。

---

# Principle 03 — AI Should Be Invisible

**AIは目立たない。**

AIを使っていることを意識させない。

理想は**「気づいたら仕事が終わっていた」**である。

---

# Principle 04 — One Screen

診療中は**基本的に一画面**。

画面を切り替えない。**診療フローを止めない。**

---

# Principle 05 — One Action

一つの目的には**一つの操作だけ**。

```
録音開始 → 診療終了 → SOAP生成
```

**これ以上複雑にしない。**

---

# Principle 06 — Show Only What Matters

情報は全部見せない。**今必要な情報だけ**見せる。

| タイミング | 表示 |
|------------|------|
| 診療中 | 文字起こし |
| 診療後 | SOAP |
| 紹介状作成時 | 紹介状 |

**必要な時だけ表示**する。

---

# Principle 07 — AI Never Interrupts

AIは診療中に

- 話しかけない
- 通知しない
- 提案しない

**診療を止めない。**

---

# Principle 08 — Confidence Display

AIは**自信がある文章**と**自信がない文章**を区別して表示する。

分からない内容は必ず**「確認が必要」**と表示する。

---

# Principle 09 — Edit First

AI文章は**編集しやすく**する。

生成がゴールではない。**修正がしやすいこと**を重視する。

---

# Principle 10 — Trust Before Speed

**速さより安心感。**

0.5秒速くなるより、**安心して使える**方が重要。

---

# Principle 11 — Progressive Disclosure

最初から全部見せない。  
**必要なタイミングで必要な情報だけ**開く。

---

# Principle 12 — Copy is a Feature

Version 0.1 では**コピーすることを恥ずかしいと思わない**。

**Copy & Pasteは立派なUX**である。API連携はPMF後。

---

# Principle 13 — Familiar Experience

電子カルテに似せる必要はない。  
しかし**診療フローには合わせる**。**新しい操作を覚えさせない。**

---

# Principle 14 — No Fancy Animation

**派手な演出は禁止。**

医療現場はエンタメではない。**必要最低限の動き**だけ。

---

# Principle 15 — Calm Interface

- 色を使いすぎない
- 音を鳴らさない
- 通知を出しすぎない

Medical OSは**静かな存在**である。

---

# Version 0.1 UI

```
ログイン
  ↓
患者選択
  ↓
録音開始
  ↓
リアルタイム文字起こし
  ↓
診療終了
  ↓
SOAP生成
  ↓
診療記録生成
  ↓
医師修正
  ↓
コピー
  ↓
電子カルテへ貼り付け
```

**これ以上の画面は作らない。**

詳細: [`../04_MVP_SPECIFICATION/02_user_flow.md`](../04_MVP_SPECIFICATION/02_user_flow.md) · [`../04_MVP_SPECIFICATION/14_ui_guideline.md`](../04_MVP_SPECIFICATION/14_ui_guideline.md)

---

# Future UI

| Version | 機能 |
|---------|------|
| 1 | 紹介状 |
| 2 | 長期カルテ要約 |
| 3 | 患者サマリー |
| 4 | Medical Timeline |
| 5 | Medical Dashboard |

**要確認**: Roadmap との整合

---

# UX Goal

先生が**AIを操作する**のではない。

診療を終えたら**必要な情報が整理されている**。

これが理想である。

---

# Design Philosophy

良いUIとは**説明が必要なUI**ではない。

**誰でも初めて使った瞬間に理解できるUI**である。

---

# Core Principle

Medical OSのUIは**先生の仕事を増やさない**。

**先生が患者と向き合う時間を増やす。**  
そのためだけに存在する。

---

# 付録: Development · Technology Philosophy

（旧 Product Bible UI/Development 章 — 実装判断用）

## Development Philosophy

- Build for physicians, not engineers
- 「Does this save physicians time while maintaining safety?」
- If no → do not build

## Technology Philosophy

- AI is a tool; AI is not the product
- The product is the physician experience
- Optimize physician workflow

---

# 関連章

| 章 | ファイル |
|----|----------|
| プロダクト原則 | [`08_product_principles.md`](./08_product_principles.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| MVP UI | [`../04_MVP_SPECIFICATION/14_ui_guideline.md`](../04_MVP_SPECIFICATION/14_ui_guideline.md) |
| Cursor Frontend Rules | [`../06_CURSOR_RULES/05_frontend_rules.md`](../06_CURSOR_RULES/05_frontend_rules.md) |
| Medical OSの哲学 | [`11_medical_os_philosophy.md`](./11_medical_os_philosophy.md) |
