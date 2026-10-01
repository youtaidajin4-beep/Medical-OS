import { SoapTemplateFloor } from './soap-templates';

/**
 * 定型床を、モデルに渡すのをやめて、**空いた欄にこちらで入れる**。
 *
 * 床（`soap-templates.ts`）は谷口先生の「変化がないときの下書き」で、
 *   S: 体調変わりない。
 *   O: 脈拍異常なし。貧血・黄疸なし。心音・呼吸音異常なし。
 *   A: stable  P: 定時薬を継続する。
 * 4つとも**事実の主張**になっている。訴えが無かった、診察して正常だった、
 * 新しい問題は無い、薬を続けた、の4つ。
 *
 * これをプロンプトに入れて「差分があれば上書きして」と頼むやり方は、2026-10-01 に
 * 9/30 の3症例で実測して捨てた。食生活の相談だけで身体診察をしていない症例で
 * 出てきたSOAPがこれだった:
 *
 *   S: 体調変わりない。              ← 麺類と揚げ物の相談をしているのに
 *   O: 脈拍異常なし。…心音・呼吸音異常なし。 ← 聴診していない
 *   A: stable                        ← 生活習慣病リスクの話をしているのに
 *   P: 麺類と揚げ物を避けるように指導。…
 *
 * 転記が乏しいのと、していない所見が載るのは、同じ1つの原因だった。
 * 材料が足りない欄をモデルは必ず床で埋める。床が会話を押しのけていた。
 *
 * 「渡すかどうかを抽出結果で決める」も試して捨てた。抽出が
 * 「変わりなければまた薬を継続する」を guidance に入れるだけで判定がひっくり返り、
 * 訴えの無い再診でSOAPが空になった（3回中2回）。先生の診療はこの型が一番多い。
 *
 * 残ったのが今の形。モデルには会話だけを見せ、**空で返ってきた欄にだけ**、
 * その主張を裏づける会話があるときに限って床を入れる。
 * 判定がモデルの言葉づかいに左右されなくなり、床が会話を押しのけることもなくなる。
 *
 * 健診(CHECKUP)はこの経路を通さない。健診の床は CXR・ECG の2行を含む
 * 「谷口先生の健診カルテの書式」そのもので、会話の内容をその2行へ畳み込む必要があるため、
 * 従来どおりモデルへ渡して組み立てさせる。
 */

export type SoapFields = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

/**
 * 床のOが主張しているのは**聴診と視診**（脈拍・貧血・黄疸・心音・呼吸音）。
 * 口の中を見ただけの診察では、この文は嘘になる。だから聴診の印だけを見る。
 */
const AUSCULTATION_CUES =
  /聴診|胸の音|心音|呼吸音|背中|背部|深呼吸|息を吸|息を吐|脈を|脈拍|血圧を測|お腹を診|腹部を診/;

/** 床のPが主張しているのは「定時薬を続けた」こと */
const CONTINUATION_CUES =
  /継続|続け|そのまま|いつもの(薬|お薬)|同じ(薬|お薬)|(薬|お薬)を?[^。\n]{0,8}出しておき/;

function isBlank(value: string): boolean {
  return value.replace(/[\s。、．，]/g, '').length === 0;
}

export type FloorApplication = {
  soap: SoapFields;
  /** どの欄に床を入れたか。実行ログに残して、あとから割合を見る */
  filled: Array<keyof SoapFields>;
  /** 根拠が無いので入れなかった欄 */
  withheld: Array<keyof SoapFields>;
  /** モデルが勝手に書いた床の文を取り除いた行 */
  removed: string[];
};

/**
 * 通常診察(ROUTINE)のSOAPに、空いた欄だけ床を入れる。
 *
 * S と A は、空であること自体が「訴えが無かった」「新しい問題が無い」の裏づけなので
 * そのまま入れる。O と P は、していない診察・していない処方を主張する文なので、
 * 会話に印があるときだけ入れる。
 */
export function applyRoutineFloor(
  soap: SoapFields,
  floor: SoapTemplateFloor,
  transcript: string,
): FloorApplication {
  const out: SoapFields = { ...soap };
  const filled: Array<keyof SoapFields> = [];
  const withheld: Array<keyof SoapFields> = [];

  const examined = AUSCULTATION_CUES.test(transcript);
  const continued = CONTINUATION_CUES.test(transcript);

  const rules: Array<{ field: keyof SoapFields; allowed: boolean }> = [
    { field: 'subjective', allowed: true },
    { field: 'objective', allowed: examined },
    { field: 'assessment', allowed: true },
    { field: 'plan', allowed: continued },
  ];

  for (const { field, allowed } of rules) {
    if (!isBlank(out[field])) continue;
    if (!allowed) {
      withheld.push(field);
      continue;
    }
    out[field] = floor[field];
    filled.push(field);
  }

  // モデルは過去の修正例や文体ヒントからも床の言い回しを拾ってくる。
  // 聴診していない診察に「脈拍異常なし」が出たら、プロンプトの約束に関係なく落とす
  const removed: string[] = [];
  if (!examined) {
    const lines = out.objective.split('\n');
    const kept: string[] = [];
    for (const line of lines) {
      if (line.includes(floor.objective) || isFloorObjective(line, floor)) {
        removed.push(line.trim());
        continue;
      }
      kept.push(line);
    }
    out.objective = kept.join('\n').trim();
  }

  return { soap: out, filled, withheld, removed };
}

/** 床のOの文だけで出来ている行か。会話から拾った事実が混ざっていれば残す */
function isFloorObjective(line: string, floor: SoapTemplateFloor): boolean {
  if (isBlank(line)) return false;
  const sentences = floor.objective
    .split(/[。\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const rest = sentences.reduce((acc, s) => acc.split(s).join(''), line);
  return isBlank(rest);
}
