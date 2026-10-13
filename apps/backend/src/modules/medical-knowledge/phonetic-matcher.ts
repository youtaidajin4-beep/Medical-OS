/**
 * 音の近い語への補正（カタカナの薬名・検査名・病名）。
 *
 * 音声認識は、知らない薬の名前を「近い音の別の語」に崩して書く。実測の例：
 *   ジャディアンス → ジャリアンス / タミフル → カミフル / ジスロマック → キスロマック /
 *   ミラペックス → ミラテックス / イリボー → ユリボー / ボノプラザン → モノプラザン
 * 崩れた形は辞書に無いので、完全一致の照合には当たらない。**辞書の語と音を比べ**、
 * 十分に近く、しかも近い語が1つに絞れるときだけ直す。
 *
 * 薬の取り違えは患者の安全に直結するので、直す基準は厳しくしてある：
 *   - 自動で直す（high）… 音の距離が小さく、近い語が1つだけ。語が長いほど緩め
 *   - 候補にとどめる（candidate）… 少し離れている／近い語が複数ある。書き換えず、確認に回す
 *   - 触らない … すでに辞書にある語、よくある外来語、人名（「〜さん」）
 * カルテに載っている薬（preferred）は、同じ距離なら優先し、少しだけ緩める。
 */

export type PhoneticTerm = {
  /** 辞書の表記（そのまま本文に書き戻す形） */
  surface: string;
  /** 正規の名前。商品名のときは一般名 */
  canonical: string;
};

export type PhoneticMatch = {
  /** 本文中の位置 */
  start: number;
  end: number;
  /** 本文に書かれていた形 */
  original: string;
  /** 近いと判断した辞書の表記 */
  surface: string;
  canonical: string;
  distance: number;
  /** high … 自動で直してよい／candidate … 直さず確認に回す */
  confidence: 'high' | 'candidate';
};

const KATAKANA_RUN = /[ァ-ヺー]{4,}/g;

/** 診察の会話によく出る外来語。薬の名前に似ていても触らない */
const COMMON_KATAKANA = new Set(
  [
    'ストレス', 'アルコール', 'タバコ', 'コーヒー', 'カロリー', 'サプリメント', 'スマホ', 'パソコン',
    'トイレ', 'リハビリ', 'マスク', 'ワクチン', 'ウイルス', 'アレルギー', 'ダイエット', 'バランス',
    'エネルギー', 'タンパク', 'ミルク', 'ジュース', 'スポーツ', 'ウォーキング', 'マッサージ', 'リラックス',
    'コントロール', 'スケジュール', 'アドバイス', 'スタッフ', 'クリニック', 'ベッド', 'タオル', 'テレビ',
    'ゴルフ', 'ジョギング', 'ストレッチ', 'パターン', 'ポイント', 'ペース', 'タイミング', 'カレンダー',
    'レベル', 'リスク', 'メモ', 'ノート', 'スムーズ', 'ゆっくり', 'しっかり', 'カフェイン', 'ヨーグルト',
    'ドライブ', 'マンション', 'アパート', 'ヘルパー', 'デイサービス', 'ケアマネ', 'ショートステイ',
    'インターネット', 'メール', 'アプリ', 'カード', 'タクシー', 'エレベーター', 'エスカレーター',
    'ストーブ', 'エアコン', 'シャワー', 'お風呂', 'シャンプー', 'ティッシュ', 'ビール', 'ワイン', 'ウイスキー',
    'チョコレート', 'ケーキ', 'パン', 'ラーメン', 'カレー', 'サラダ', 'フルーツ', 'ジム',
  ].map((s) => s.normalize('NFKC')),
);

/** 語のあとに付くと人名・呼びかけになる語。「ヤマダさん」を薬と取り違えない */
const PERSON_SUFFIX = /^(さん|様|くん|君|ちゃん|先生|氏)/;

const SMALL_VOWELS = /[ァィゥェォ]/g;

/** ひらがなをカタカナへ。比較の前にそろえる */
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/**
 * 音の比較に使う形。
 * 長音・促音・小さい母音（ディ→デ）の有無は、音声認識の揺れで入れ替わるので落とす。
 */
export function phoneticSkeleton(s: string): string {
  return toKatakana(s.normalize('NFKC'))
    .replace(/ヴ/g, 'ブ')
    .replace(/[ー・ッ]/g, '')
    .replace(SMALL_VOWELS, '');
}

/** 音声認識が取り違えやすい仮名の組。置き換えの重みを小さくする */
const CONFUSABLE_GROUPS: string[][] = [
  ['カ', 'ガ'], ['キ', 'ギ'], ['ク', 'グ'], ['ケ', 'ゲ'], ['コ', 'ゴ'],
  ['サ', 'ザ'], ['シ', 'ジ'], ['ス', 'ズ'], ['セ', 'ゼ'], ['ソ', 'ゾ'],
  ['タ', 'ダ'], ['チ', 'ヂ', 'ジ'], ['ツ', 'ヅ', 'ズ'], ['テ', 'デ'], ['ト', 'ド'],
  ['ハ', 'バ', 'パ'], ['ヒ', 'ビ', 'ピ'], ['フ', 'ブ', 'プ'], ['ヘ', 'ベ', 'ペ'], ['ホ', 'ボ', 'ポ'],
  // ダ行とラ行は日本語の音声認識で最もよく入れ替わる
  ['ダ', 'ラ'], ['デ', 'レ'], ['ド', 'ロ'], ['ヂ', 'リ'], ['ヅ', 'ル'],
  ['ミ', 'ニ'], ['マ', 'ナ'], ['ム', 'ヌ'], ['メ', 'ネ'], ['モ', 'ノ'],
  ['ビ', 'ミ'], ['バ', 'マ'], ['ブ', 'ム'], ['ベ', 'メ'], ['ボ', 'モ'],
  ['シ', 'ヒ'], ['ユ', 'イ'], ['ア', 'ワ'], ['ジャ', 'ヤ'],
];
const NEAR = new Map<string, number>();
for (const group of CONFUSABLE_GROUPS) {
  for (const a of group) for (const b of group) if (a !== b) NEAR.set(a + b, 0.5);
}

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  return NEAR.get(a + b) ?? 1;
}

/** 重み付きの編集距離（隣り合う文字の入れ替えは1） */
export function phoneticDistance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i]![0] = i;
  for (let j = 0; j <= m; j++) d[0]![j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let best = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + subCost(a[i - 1]!, b[j - 1]!),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = best;
    }
  }
  return d[n]![m]!;
}

type Entry = { term: PhoneticTerm; skeleton: string };

export type PhoneticMatcherOptions = {
  /** 辞書に無い語を、他の辞書の語として扱わないための既知語（任意の分類の表記） */
  knownSurfaces?: Iterable<string>;
};

export class PhoneticMatcher {
  private readonly entries: Entry[] = [];
  private readonly known = new Set<string>();

  constructor(terms: PhoneticTerm[], options: PhoneticMatcherOptions = {}) {
    const seen = new Set<string>();
    for (const term of terms) {
      const surface = term.surface.normalize('NFKC');
      // カタカナだけの語に絞る（漢字・英字の語は音で比べられない）
      if (!/^[ァ-ヺー]{4,}$/.test(surface)) continue;
      if (seen.has(surface)) continue;
      seen.add(surface);
      this.known.add(surface);
      this.entries.push({ term: { ...term, surface }, skeleton: phoneticSkeleton(surface) });
    }
    for (const s of options.knownSurfaces ?? []) this.known.add(s.normalize('NFKC'));
  }

  get size(): number {
    return this.entries.length;
  }

  /**
   * 本文の中のカタカナの連なりを辞書の語と比べる。
   * preferred … このカルテで使われている薬（優先して、少し緩く当てる）
   */
  findMatches(text: string, preferred: string[] = []): PhoneticMatch[] {
    const preferredKeys = new Set(preferred.map((p) => phoneticSkeleton(p)));
    const matches: PhoneticMatch[] = [];

    for (const m of text.matchAll(KATAKANA_RUN)) {
      const run = m[0];
      const start = m.index ?? 0;
      const end = start + run.length;
      const normalizedRun = run.normalize('NFKC');
      if (this.known.has(normalizedRun) || COMMON_KATAKANA.has(normalizedRun)) continue;
      if (PERSON_SUFFIX.test(text.slice(end, end + 3))) continue;

      const runSkeleton = phoneticSkeleton(run);
      if (runSkeleton.length < 3) continue;

      const ranked: Array<{ entry: Entry; distance: number }> = [];
      for (const entry of this.entries) {
        if (Math.abs(entry.skeleton.length - runSkeleton.length) > 2) continue;
        let distance = phoneticDistance(runSkeleton, entry.skeleton);
        // カルテにある薬は、同じ距離なら優先する
        if (preferredKeys.has(entry.skeleton)) distance -= 0.5;
        ranked.push({ entry, distance });
      }
      if (!ranked.length) continue;
      ranked.sort((a, b) => a.distance - b.distance);
      const best = ranked[0]!;
      const target = best.entry.skeleton.length;
      const isPreferred = preferredKeys.has(best.entry.skeleton);

      // 2番手が同じ名前（商品名と一般名など）なら、競合とみなさない
      const rival = ranked.find((r) => r.entry.term.canonical !== best.entry.term.canonical);
      const unique = !rival || rival.distance - best.distance >= 0.75;

      const strict = target >= 6 ? 1.5 : target >= 5 ? 1.0 : 0.75;
      const loose = target >= 6 ? 2.5 : target >= 5 ? 2.0 : 1.5;
      const bonus = isPreferred ? 0.5 : 0;

      let confidence: PhoneticMatch['confidence'] | null = null;
      if (best.distance <= strict + bonus && unique && target >= 4) confidence = 'high';
      else if (best.distance <= loose + bonus) confidence = 'candidate';
      if (!confidence) continue;

      matches.push({
        start,
        end,
        original: run,
        surface: best.entry.term.surface,
        canonical: best.entry.term.canonical,
        distance: Math.max(0, best.distance),
        confidence,
      });
    }
    return matches;
  }

  /** 自動で直してよいもの（high）だけを本文に反映する */
  correct(text: string, preferred: string[] = []): { text: string; applied: PhoneticMatch[]; candidates: PhoneticMatch[] } {
    const all = this.findMatches(text, preferred);
    const applied = all.filter((m) => m.confidence === 'high');
    const candidates = all.filter((m) => m.confidence === 'candidate');
    let out = '';
    let cursor = 0;
    for (const m of applied) {
      out += text.slice(cursor, m.start) + m.surface;
      cursor = m.end;
    }
    out += text.slice(cursor);
    return { text: out, applied, candidates };
  }
}
