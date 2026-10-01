import { GeneratedDocumentType } from '@prisma/client';
import { buildDocumentPrompt } from '../src/modules/documents/document-prompts';
import { DocumentGenerationContext } from '../src/modules/documents/document-types';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';
import { CLINIC } from '../src/modules/documents/clinic';

/**
 * 紹介状の宛先は、これまでチャットで言うしかなかった。
 *
 * 書類を作るのに「確認済みにする → 書類を全部作る → カードで選ぶ → 生成」で4手かかり、
 * そのうえ病院名・診療科・医師名をチャットに毎回打っていた。
 * 画面で過去の紹介先を選べば1タップで紙になるようにしたので、
 * 選んだ宛先がプロンプトまで届いていることをここで固定する。
 */
const baseCtx: DocumentGenerationContext = {
  consultationId: 'c1',
  caseCode: 'P-001',
  patientName: '林',
  sex: '女',
  age: 41,
  soap: {
    subjective: '倦怠感と関節痛。',
    objective: '咽頭を診察。',
    assessment: 'コロナ後遺症を考慮。',
    plan: '採血を実施。',
  },
  structured: {},
  physicianRules: DEFAULT_PHYSICIAN_RULES,
  clinic: CLINIC,
  revisionExamples: '',
  physicianSubkarte: '',
  todayJa: '令和8年10月1日',
};

describe('画面で選んだ紹介先が、書類のプロンプトまで届く', () => {
  it('病院・診療科・医師を選ぶと、そのまま渡る', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, {
      ...baseCtx,
      referralRecipient: {
        hospital: '長崎医療センター',
        department: '循環器内科',
        doctor: '田中',
      },
    });
    expect(user).toContain('【画面で選ばれた紹介先】');
    expect(user).toContain('長崎医療センター');
    expect(user).toContain('循環器内科');
    expect(user).toContain('田中');
  });

  it('病院だけ選んだときも渡る', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, {
      ...baseCtx,
      referralRecipient: { hospital: '市立中央病院' },
    });
    expect(user).toContain('市立中央病院');
    expect(user).not.toContain('診療科:');
  });

  it('選んでいなければ、その行を出さない（チャットの宛先だけで書かせる）', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, baseCtx);
    expect(user).not.toContain('【画面で選ばれた紹介先】');
  });

  it('宛先の指定が無いときは空欄にする、という規約は残っている', () => {
    const { system } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, baseCtx);
    expect(system).toContain('指定が無い項目は空文字');
  });
});
