import { GeneratedDocumentType } from '@prisma/client';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { PrismaService } from '../src/database/prisma.service';
import { ConsultationAccessService } from '../src/common/services/consultation-access.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';
import { LlmProvider } from '../src/providers/ai/llm.provider';
import {
  finalizeCareOpinion1,
  finalizeCareOpinion2,
  formatReiwaDate,
} from '../src/modules/documents/care-opinion-template';
import { CLINIC } from '../src/modules/documents/clinic';

/**
 * 主治医意見書は介護認定の判断材料になる紙。
 *
 * 様式に印字されていない選択肢を書かれると、そのチェックは紙に出ない（=黙って消える）。
 * 消えるより、様式の語だけを通して空欄で出すほうが、先生が気づいて手で足せる。
 */
describe('主治医意見書①：様式で固定するところ', () => {
  const 患者 = {
    patientName: '松本 花子',
    patientNameKana: 'マツモト ハナコ',
    sex: '女',
    dateOfBirth: '1958-03-04T00:00:00.000Z',
    age: null,
    postalCode: '856-0831',
    address: '長崎県大村市東本町12-5',
    phone: '0957-52-3344',
    occupation: '主婦',
  };
  const 作成日 = new Date('2026-07-10T09:00:00+09:00');

  it('コード・医師番号・医療機関はAIの出力ではなく当院の値が入る', () => {
    const doc = finalizeCareOpinion1(
      {
        municipalityCode: '999999',
        doctorNumber: '00000',
        clinicName: '別のクリニック',
        physicianName: '別の医師',
      },
      患者,
      作成日,
    );
    expect(doc.municipalityCode).toBe(CLINIC.municipalityCode);
    expect(doc.supervisorMunicipalityCode).toBe(CLINIC.municipalityCode);
    expect(doc.doctorNumber).toBe(CLINIC.doctorNumber);
    expect(doc.clinicName).toBe(CLINIC.legalName);
    expect(doc.physicianName).toBe(CLINIC.physicianName);
    expect(doc.clinicTel).toBe(CLINIC.tel);
  });

  it('申請日・記入日・最終診察日は作成した日（和暦）', () => {
    const doc = finalizeCareOpinion1({}, 患者, 作成日);
    expect(doc.applicationDate).toBe('令和8年7月10日');
    expect(doc.entryDate).toBe('令和8年7月10日');
    expect(doc.lastExamDate).toBe('令和8年7月10日');
  });

  it('最終診察日の指定があればそれを使う', () => {
    const doc = finalizeCareOpinion1({ lastExamDate: '令和8年6月20日' }, 患者, 作成日);
    expect(doc.lastExamDate).toBe('令和8年6月20日');
  });

  it('申請者欄は患者情報から入り、AIの出力は使わない', () => {
    const doc = finalizeCareOpinion1({ patientName: '別人 太郎' }, 患者, 作成日);
    expect(doc.patientName).toBe('松本 花子');
    expect(doc.patientNameKana).toBe('マツモト ハナコ');
    expect(doc.dateOfBirth).toBe('1958年03月04日');
    expect(doc.age).toBe(68);
    expect(doc.contact).toBe('0957-52-3344');
  });

  it('被保険者番号と調査回数は空欄のまま（先生へのヒアリング待ち）', () => {
    const doc = finalizeCareOpinion1({ insuredNumber: '1234567890', surveyCount: '2' }, 患者, 作成日);
    expect(doc.insuredNumber).toBe('');
    expect(doc.surveyCount).toBe('');
  });

  it('診断名は3行に揃える', () => {
    const doc = finalizeCareOpinion1(
      { diagnoses: [{ name: '変形性膝関節症', onsetDate: '平成30年頃' }] },
      患者,
      作成日,
    );
    expect(doc.diagnoses).toEqual([
      { name: '変形性膝関節症', onsetDate: '平成30年頃' },
      { name: '', onsetDate: '' },
      { name: '', onsetDate: '' },
    ]);
  });

  it('症状を挙げられないなら「有」を立てない', () => {
    const 中身なし = finalizeCareOpinion1(
      { peripheralPresence: 'present', peripheralSymptoms: [], psychSymptomPresence: 'present' },
      患者,
      作成日,
    );
    expect(中身なし.peripheralPresence).toBe('');
    expect(中身なし.psychSymptomPresence).toBe('');

    const 中身あり = finalizeCareOpinion1(
      { peripheralPresence: 'present', peripheralSymptoms: ['徘徊'] },
      患者,
      作成日,
    );
    expect(中身あり.peripheralPresence).toBe('present');
    expect(中身あり.peripheralSymptoms).toEqual(['徘徊']);

    // 「無」はそのまま通す
    expect(finalizeCareOpinion1({ peripheralPresence: 'none' }, 患者, 作成日).peripheralPresence).toBe(
      'none',
    );
  });

  it('様式に無い選択肢は捨てる（紙に出ないチェックを持たせない）', () => {
    const doc = finalizeCareOpinion1(
      {
        procedures: ['点滴の管理', 'インスリン注射', '透析'],
        adlLevel: 'ほぼ自立',
        dementiaLevel: 'Ⅱa',
        stability: 'とても安定',
      },
      患者,
      作成日,
    );
    expect(doc.procedures).toEqual(['点滴の管理', '透析']);
    expect(doc.adlLevel).toBe('');
    expect(doc.dementiaLevel).toBe('Ⅱa');
    expect(doc.stability).toBe('');
  });
});

describe('主治医意見書②：様式で固定するところ', () => {
  const 作成日 = new Date('2026-07-10T09:00:00+09:00');

  it('市町村コードと記入日が入り、被保険者番号は空欄', () => {
    const doc = finalizeCareOpinion2({}, 作成日);
    expect(doc.municipalityCode).toBe(CLINIC.municipalityCode);
    expect(doc.entryDate).toBe('令和8年7月10日');
    expect(doc.insuredNumber).toBe('');
  });

  it('麻痺の部位と程度を様式の形に揃える', () => {
    const doc = finalizeCareOpinion2(
      {
        paralysis: {
          checked: true,
          rightUpper: { checked: true, degree: 'moderate' },
          leftUpper: { checked: false, degree: 'とても重い' },
        },
      },
      作成日,
    ) as { paralysis: Record<string, { checked: boolean; degree: string }> };
    expect(doc.paralysis.checked).toBe(true);
    expect(doc.paralysis.rightUpper).toEqual({ checked: true, degree: 'moderate' });
    // 様式に無い程度は空にする（軽/中/重のどれでもない）
    expect(doc.paralysis.leftUpper).toEqual({ checked: false, degree: '' });
  });

  it('留意事項は「特になし」と具体的な内容を分けて持つ', () => {
    const doc = finalizeCareOpinion2(
      {
        precautions: {
          bloodPressure: { none: false, detail: '降圧薬服用中。起立時のふらつきに注意' },
          movement: { none: true, detail: '' },
        },
      },
      作成日,
    ) as { precautions: Record<string, { none: boolean; detail: string }> };
    expect(doc.precautions.bloodPressure).toEqual({
      none: false,
      detail: '降圧薬服用中。起立時のふらつきに注意',
    });
    expect(doc.precautions.movement).toEqual({ none: true, detail: '' });
    expect(doc.precautions.swallowing).toEqual({ none: false, detail: '' });
  });

  it('日本時間で日付を数える（サーバーがUTCでも前日にならない）', () => {
    // 日本時間 2026-09-20 0:28（＝UTC 2026-09-19 15:28）
    expect(formatReiwaDate(new Date('2026-09-19T15:28:00.000Z'))).toBe('令和8年9月20日');
  });
});

describe('主治医意見書：生成された書類にも様式が当たる', () => {
  function makeService(llmContent: Record<string, unknown>) {
    const saved: Array<Record<string, unknown>> = [];
    const prisma = {
      aIExecution: { create: jest.fn() },
      clinicalEntity: { findMany: jest.fn().mockResolvedValue([]) },
      transcriptCorrection: { findMany: jest.fn().mockResolvedValue([]) },
      revisionHistory: { findMany: jest.fn().mockResolvedValue([]) },
      consultationChatMessage: { findMany: jest.fn().mockResolvedValue([]) },
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
          saved.push(data.content as Record<string, unknown>);
          return Promise.resolve({
            id: 'doc-1',
            type: data.type,
            content: data.content,
            version: 1,
            isAiGenerated: true,
            approved: false,
            updatedAt: new Date(),
          });
        }),
      },
      consultation: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          physicianId: 'dr1',
          patientId: 'p1',
          patient: {
            patientCode: 'P-002',
            name: '松本 花子',
            nameKana: 'マツモト ハナコ',
            sex: 'F',
            dateOfBirth: new Date('1958-03-04T00:00:00.000Z'),
            postalCode: '856-0831',
            address: '長崎県大村市東本町12-5',
            phone: '0957-52-3344',
            occupation: '主婦',
            memo: null,
          },
          anonymousCase: null,
          structuredData: { data: {} },
          soapDocuments: [{ subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }],
          transcriptSegments: [],
          attachments: [],
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    const service = new DocumentsService(
      prisma,
      {
        assertPhysicianOwns: jest.fn().mockResolvedValue(undefined),
      } as unknown as ConsultationAccessService,
      {
        getPhysicianRules: jest.fn().mockResolvedValue(DEFAULT_PHYSICIAN_RULES),
      } as unknown as SettingsService,
      {
        name: 'mock',
        generateDocument: jest.fn().mockResolvedValue(llmContent),
      } as unknown as LlmProvider,
    );
    return { service, saved };
  }

  it('①はAIが書いたコードや患者名を当院の値と患者情報で上書きする', async () => {
    const { service, saved } = makeService({
      municipalityCode: '111111',
      patientName: '別人 太郎',
      diagnoses: [{ name: '変形性膝関節症', onsetDate: '平成30年頃' }],
      stability: 'stable',
      courseAndTreatment: '膝痛が続き歩行が不安定。',
    });

    await service.generateOne('c1', GeneratedDocumentType.CARE_OPINION_1);

    const doc = saved[0] as Record<string, unknown>;
    expect(doc.municipalityCode).toBe(CLINIC.municipalityCode);
    expect(doc.patientName).toBe('松本 花子');
    expect(doc.stability).toBe('stable');
    expect(doc.courseAndTreatment).toBe('膝痛が続き歩行が不安定。');
  });
});
