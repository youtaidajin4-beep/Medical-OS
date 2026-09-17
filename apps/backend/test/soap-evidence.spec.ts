import { WarningSeverity } from '@prisma/client';
import {
  assessSoapEvidence,
  buildMissingEvidenceWarning,
  hasClinicalFacts,
  requiredTranscriptChars,
  usableTranscriptLength,
} from '../src/providers/ai/soap-evidence';

/**
 * 2026-09-05、谷口先生の画面では文字起こしが「読み 読み 読み…」で話者は全員「不明」
 * だったのに、SOAPには「S：体調変わりない。O：脈拍異常なし…A：stable」が出ていた。
 * 診察で確認していない身体所見がカルテに載る、という一番まずい壊れ方。
 * ここでは「材料が無いときは定型床を使わない」を固定する。
 */
describe('SOAPの材料があるかを判定する', () => {
  const 実際の診療 = [
    '医師: 今日はどうされましたか。',
    '患者: 三日前から咳が続いていて、夜に熱が出ます。',
    '医師: 熱は何度くらいでしたか。',
    '患者: 昨日は三十八度二分ありました。',
    '医師: 胸の音を聴きますね。右の下のほうで少しゼーゼーしています。',
  ].join('\n');

  it('話者ラベルと要確認フラグは、本文の長さに数えない', () => {
    const text = ['医師: あー', '患者: はい', '[要確認:DRUG:ムコダイン→ムコダイン錠]'].join('\n');
    // 残るのは「あー」＋「はい」の4文字だけ。
    // ラベルとフラグまで数えると、中身が無いのに「十分ある」と判定してしまう
    expect(usableTranscriptLength(text)).toBe(4);
  });

  it('診療の中身があれば、定型床を使ってよい', () => {
    const evidence = assessSoapEvidence({
      transcriptText: 実際の診療,
      structured: { chiefComplaint: '咳3日', vitals: '体温38.2℃' },
      recordingDurationSec: 5 * 60,
    });
    expect(evidence.usable).toBe(true);
    expect(evidence.reason).toBeUndefined();
  });

  it('必要な文字数は録音の長さで決まる（15〜20分の診察を基準にする）', () => {
    // 日本語の診察会話は実測で250〜400文字/分。12文字/分はその3〜5%で、
    // ぽつぽつとしか喋らない再診でも割り込まない水準
    expect(requiredTranscriptChars(20 * 60)).toBe(240);
    expect(requiredTranscriptChars(15 * 60)).toBe(180);
    expect(requiredTranscriptChars(5 * 60)).toBe(60);
    // 録音時間が取れない古いデータは固定の下限で見る
    expect(requiredTranscriptChars(null)).toBe(60);
    // 極端に短い録音でもしきい値が0にならない
    expect(requiredTranscriptChars(10)).toBe(20);
  });

  it('20分録って数十文字しか残らなければ、SOAPは作らない', () => {
    // 2026-09-05の壊れ方。ハルシネーション除去で「読み 読み 読み…」が落ちた後の状態
    const evidence = assessSoapEvidence({
      transcriptText: `不明: はい\n不明: えー\n不明: ${'あ'.repeat(100)}`,
      structured: {},
      recordingDurationSec: 20 * 60,
    });
    expect(evidence.usable).toBe(false);
    expect(evidence.measuredChars).toBe(104);
    expect(evidence.requiredChars).toBe(240);
    expect(evidence.reason).toContain('20分の録音に対して');
    expect(evidence.reason).toContain('マイクに声が届いていない');
  });

  it('同じ文字数でも、短い録音なら通す（追加で1分だけ録ったケース）', () => {
    const evidence = assessSoapEvidence({
      transcriptText: `医師: ${'血圧は変わりないですね。'.repeat(8)}`,
      structured: { assessment: 'stable' },
      recordingDurationSec: 60,
    });
    expect(evidence.usable).toBe(true);
  });

  it('15〜20分の普通の診察は、当然そのまま通る', () => {
    // 20分で3000文字（実測の想定レンジの下寄り）
    const evidence = assessSoapEvidence({
      transcriptText: `医師: ${'今日は血圧の話をしますね。'.repeat(230)}`,
      structured: { chiefComplaint: '高血圧フォロー' },
      recordingDurationSec: 20 * 60,
    });
    expect(evidence.usable).toBe(true);
    expect(evidence.measuredChars).toBeGreaterThan(2000);
  });

  it('文字起こしはあっても、診療の事実が1つも取れなければSOAPは作らない', () => {
    const evidence = assessSoapEvidence({
      transcriptText: 実際の診療,
      structured: {},
      recordingDurationSec: 5 * 60,
    });
    expect(evidence.usable).toBe(false);
    // ここで床を使うと、診察していない所見が定型文で入る
    expect(evidence.reason).toContain('診察で確認していない所見');
  });

  it('事実の判定は、薬やアレルギーの配列だけでも成り立つ', () => {
    expect(hasClinicalFacts({})).toBe(false);
    expect(hasClinicalFacts({ chiefComplaint: '   ' })).toBe(false);
    expect(hasClinicalFacts({ medications: [] })).toBe(false);
    expect(hasClinicalFacts({ medications: ['ムコダイン錠500mg'] })).toBe(true);
    expect(hasClinicalFacts({ physicalExam: '右下肺 wheeze' })).toBe(true);
  });

  it('空欄にした理由は、医師の画面へCRITICALで出す', () => {
    const warnings = buildMissingEvidenceWarning({
      usable: false,
      reason: 'マイクが遠かった',
      measuredChars: 3,
      requiredChars: 240,
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.severity).toBe(WarningSeverity.CRITICAL);
    expect(warnings[0]!.message).toContain('マイクが遠かった');
  });

  it('作れたときは、よけいな警告を足さない', () => {
    expect(
      buildMissingEvidenceWarning({ usable: true, measuredChars: 3000, requiredChars: 240 }),
    ).toHaveLength(0);
  });
});
