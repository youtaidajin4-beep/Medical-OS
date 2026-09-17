import { GeneratedDocumentType } from '@prisma/client';
import { buildDocumentPrompt } from '../src/modules/documents/document-prompts';
import { DocumentGenerationContext } from '../src/modules/documents/document-types';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';

/**
 * 紹介状も主治医意見書も「経過」を書く書類。書類生成の材料は今回の診療1回分しか
 * 見ておらず、何回目の受診でも初診のような書類しか作れなかった。
 * 患者ごとに溜まったSOAPを材料に入れる。
 */
const baseCtx: DocumentGenerationContext = {
  consultationId: 'c1',
  caseCode: 'P-001',
  patientName: '桑原',
  sex: '男',
  age: 68,
  soap: {
    subjective: '息切れが少し楽になった。',
    objective: '血圧 132/78。心音異常なし。',
    assessment: 'stable',
    plan: '定時薬を継続する。',
  },
  structured: {},
  physicianRules: DEFAULT_PHYSICIAN_RULES,
  revisionExamples: '',
  physicianSubkarte: '',
  todayJa: '令和8年9月17日',
};

describe('書類の材料に、その患者の過去の診療が入る', () => {
  it('過去の診療があれば、日付つきで経過の材料として渡る', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, {
      ...baseCtx,
      pastVisits: [
        {
          dateJa: '令和8年8月20日',
          visitType: 'ROUTINE',
          soap: {
            subjective: '階段で息切れ。',
            objective: '血圧 148/90。下腿浮腫あり。',
            assessment: '心不全の増悪疑い',
            plan: '利尿薬を追加。',
          },
        },
      ],
    });

    expect(user).toContain('これまでの診療');
    expect(user).toContain('令和8年8月20日');
    expect(user).toContain('心不全の増悪疑い');
    expect(user).toContain('利尿薬を追加。');
    // 材料の範囲を超えて経過を作文させない
    expect(user).toContain('ここに無い出来事を書かない');
  });

  it('改行を含むSOAPでも、1行ずつの箇条書きとして崩れない', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.CARE_OPINION_1, {
      ...baseCtx,
      pastVisits: [
        {
          dateJa: '令和8年7月3日',
          visitType: 'CHECKUP',
          soap: {
            subjective: '健診で受診。',
            objective: '脈拍異常なし。\nCXR：有意な異常なし。\nECG：有意な異常なし。',
            assessment: '',
            plan: '',
          },
        },
      ],
    });
    const line = user.split('\n').find((l) => l.startsWith('- 令和8年7月3日'));
    expect(line).toBeDefined();
    expect(line).toContain('CXR：有意な異常なし。');
    expect(line).toContain('（健診）');
  });

  it('過去の診療が無いときは、前回からの変化に触れさせない', () => {
    const { user } = buildDocumentPrompt(GeneratedDocumentType.REFERRAL, baseCtx);
    expect(user).toContain('記録なし');
    expect(user).toContain('前回からの変化には触れない');
  });
});
