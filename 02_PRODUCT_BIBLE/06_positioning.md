# Product Bible
# Chapter 6
# Positioning（ポジショニング）

Version: 1.0

最上位前提: [`00_PRODUCT_CONSTITUTION.md`](../00_PRODUCT_CONSTITUTION.md)  
索引: [`README.md`](./README.md) · 前章: [`05_target_user.md`](./05_target_user.md)

---

# このドキュメントの目的

Medical OSは**AIスクライブ市場へ参入する**。

しかし、AIスクライブを作ることが目的ではない。

市場には既に優れた製品が存在する。  
Medical OSは**「違う場所」で勝つ**。

本ドキュメントでは、

- 競争する市場
- 競争しない市場
- Medical OSの立ち位置

を定義する。

---

# 結論

Medical OSは

- AIスクライブではない
- 電子カルテでもない

**Medical OSは Healthcare Information Platform である。**

---

# 現在の市場

市場には以下が存在する。

1. **電子カルテ**
2. **AIスクライブ**
3. **文書生成AI**

---

## 電子カルテ

**例**

- CLINICS
- M3デジカル
- WEMEX
- HOPE
- MegaOak

**役割**: 診療情報を保存する。

| | |
|---|---|
| **強み** | 完成された市場 · 診療の基盤 |
| **弱み** | 入力が多い · 情報整理は医師任せ · 検索が弱い · 長期経過理解が難しい |

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md`](../01_MEDICAL_DOMAIN_BIBLE/11_ehr_and_receipt.md)

---

## AIスクライブ

**例**

- Abridge
- Nabla
- Suki
- Nuance
- medimo
- コエカル

**役割**

```
診療音声 → SOAP生成
```

| | |
|---|---|
| **強み** | カルテ入力時間削減 |
| **弱み** | SOAP生成で終わるものが多い |

詳細: [`../01_MEDICAL_DOMAIN_BIBLE/12_medical_dx.md`](../01_MEDICAL_DOMAIN_BIBLE/12_medical_dx.md)

---

## 文書生成AI

**例**

- ChatGPT
- Claude
- Gemini

**役割**: 文章を書く。

**弱み**

- 医療情報を保持しない
- 患者情報を理解しない
- 長期経過を理解しない

---

# Medical OS

Medical OSはこれらの**中間**に位置する。

```
患者
  ↓
診療
  ↓
Medical OS
  ↓
情報整理
  ↓
電子カルテ
  ↓
医療文書
```

**Information Layer** である。

---

# 私たちが勝負しない場所

- 音声認識精度
- LLM性能
- 電子カルテ
- OCR
- 画像診断

**ここでは勝負しない。**

---

# 私たちが勝負する場所

- 診療情報整理
- 長期カルテ理解
- 文書再利用
- 医療ワークフロー理解
- 現場への導入しやすさ

**ここで勝つ。**

---

# Competitive Advantage

Medical OSの強み

**①** 診療情報を**構造化データ**として保存する。

**②** SOAPで終わらない — 紹介状 · 診断書 · 患者説明 まで生成する。

**③** **長期カルテ理解** — 数年分の診療履歴を要約できる。

**④** 電子カルテを変えない — **補助ツール**。

**⑤** **地方クリニックから育てる** — 共同開発。

---

# Position

```
電子カルテ → Medical OS → AIスクライブ
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
  ↓
医療文書
```

---

# Product Category

私たちは**新しいカテゴリー**を作る。

その名前は **Medical Operating System** — 略して **Medical OS**。

---

# Why We Win

**他社**

```
文字起こし → SOAP → 終了
```

**Medical OS**

```
診療理解
  ↓
情報整理
  ↓
SOAP
  ↓
診療記録
  ↓
紹介状
  ↓
診断書
  ↓
患者説明
  ↓
長期要約
  ↓
未来の診療支援
```

---

# Long Vision

Medical OSは電子カルテを置き換えない。

しかし10年後、先生は**電子カルテを見る前にMedical OSを見る**。

それが理想である。

---

# Market Expansion

```
Phase 1  地方内科
  ↓
Phase 2  地方歯科
  ↓
Phase 3  薬局
  ↓
Phase 4  病院
  ↓
Phase 5  地域医療
  ↓
Phase 6  日本全国
  ↓
Phase 7  世界
```

**要確認**: Chapter 5 · Roadmap との整合

---

# Core Principle

私たちは**AIスクライブ市場で一番になる**ことを目指さない。

**「医療情報整理」という新しい市場を作る。**  
そして**その市場の最初の会社**になる。

---

# 関連章

| 章 | ファイル |
|----|----------|
| Medical OSとは何か | [`01_overview.md`](./01_overview.md) |
| なぜ作るのか | [`02_principles_and_metrics.md`](./02_principles_and_metrics.md) |
| Product Strategy | [`03_pmf_and_scope.md`](./03_pmf_and_scope.md) |
| ターゲットユーザー | [`05_target_user.md`](./05_target_user.md) |
| 競合分析 | [`07_competitive_analysis.md`](./07_competitive_analysis.md) |
| プロダクト原則 | [`08_product_principles.md`](./08_product_principles.md) |
| AI原則 | [`09_ai_principles.md`](./09_ai_principles.md) |
| UI · 開発思想 | [`10_ui_ux_principles.md`](./10_ui_ux_principles.md) |
