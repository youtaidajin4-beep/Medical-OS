import { GeneratedDocumentType } from '@prisma/client';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { PrismaService } from '../src/database/prisma.service';
import { ConsultationAccessService } from '../src/common/services/consultation-access.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';
import { LlmProvider } from '../src/providers/ai/llm.provider';
import {
  calcAge,
  finalizeReferralContent,
  formatBirthDate,
  formatGregorianDate,
  normalizeDepartment,
  normalizeDoctor,
  normalizeHospital,
  REFERRAL_FIXED_TEXT,
  ReferralContent,
} from '../src/modules/documents/referral-template';

/**
 * 診療情報提供書は、くしま内科で一番多く作られる書類。
 *
 * 紙の雛形のうち「毎回同じ文」と「患者欄」と「発行日」をAIに書かせると、作るたびに
 * 言い回しが変わり、先生が毎回直すことになる（直し忘れたまま病院へ出る）。
 * ここで固定し、AIに残すのは宛先と先生がチャットで話した5項目だけにする。
 */
describe('診療情報提供書：雛形で固定するところ', () => {
  const 患者 = {
    patientName: 'テスト 次郎',
    patientNameKana: 'テスト ジロウ',
    sex: '男',
    dateOfBirth: '2007-01-01T00:00:00.000Z',
    age: null,
    postalCode: '856-0832',
    address: '長崎県大村市本町 436-16',
    phone: '0957-51-1256',
    occupation: '会社員',
  };

  /** AIが雛形を無視して全部埋めてきた、いちばん困るケース */
  const AIの出力 = {
    issuedDate: '令和8年7月10日',
    recipientHospital: '長崎医療センター 御中',
    recipientDepartment: '循環器内',
    recipientDoctor: '田中 先生 御机下',
    patientName: '別人 太郎',
    patientNameKana: 'ベツジン タロウ',
    sex: '女',
    address: '東京都千代田区',
    phone: '03-0000-0000',
    dateOfBirth: '1980年1月1日',
    age: 46,
    occupation: '無職',
    diagnosis: '高血圧症',
    purpose: '精査をお願いします。',
    pastHistory: '2018年 虫垂炎手術',
    currentPrescription: 'アムロジピン錠5mg　1回1錠　1日1回　朝食後',
    remarks: '紹介状は本人へ手渡し',
  };

  const 作成日 = new Date('2026-07-10T09:00:00+09:00');

  it('発行日は作成した瞬間の日付（西暦）になる', () => {
    const doc = finalizeReferralContent(AIの出力, 患者, 作成日);
    expect(doc.issuedDate).toBe('2026年7月10日');
  });

  it('【検査結果】【治療経過】は雛形の固定文で上書きされる', () => {
    const doc = finalizeReferralContent(
      {
        ...AIの出力,
        examResults: 'HbA1c 7.2%',
        clinicalCourse: '経過を要約しました',
      },
      患者,
      作成日,
    );
    expect(doc.examResults).toBe(REFERRAL_FIXED_TEXT.examResults);
    expect(doc.clinicalCourse).toBe(REFERRAL_FIXED_TEXT.clinicalCourse);
  });

  it('患者欄はAIの出力ではなく診療データから入る（別人の住所を印刷しない）', () => {
    const doc = finalizeReferralContent(AIの出力, 患者, 作成日);
    expect(doc.patientName).toBe('テスト 次郎');
    expect(doc.patientNameKana).toBe('テスト ジロウ');
    expect(doc.sex).toBe('男');
    expect(doc.postalCode).toBe('856-0832');
    expect(doc.address).toBe('長崎県大村市本町 436-16');
    expect(doc.phone).toBe('0957-51-1256');
    expect(doc.occupation).toBe('会社員');
    expect(doc.dateOfBirth).toBe('2007年01月01日');
    // 発行日時点の満年齢（誕生日は過ぎている）
    expect(doc.age).toBe(19);
  });

  it('先生がチャットで話した5項目はそのまま通す', () => {
    const doc = finalizeReferralContent(AIの出力, 患者, 作成日);
    expect(doc.diagnosis).toBe('高血圧症');
    expect(doc.purpose).toBe('精査をお願いします。');
    expect(doc.pastHistory).toBe('2018年 虫垂炎手術');
    expect(doc.currentPrescription).toBe('アムロジピン錠5mg　1回1錠　1日1回　朝食後');
    expect(doc.remarks).toBe('紹介状は本人へ手渡し');
  });

  it('宛先は敬称・御中を落とし、診療科は「科」で終わる形に揃える', () => {
    const doc = finalizeReferralContent(AIの出力, 患者, 作成日);
    expect(doc.recipientHospital).toBe('長崎医療センター');
    expect(doc.recipientDepartment).toBe('循環器内科');
    expect(doc.recipientDoctor).toBe('田中');
  });

  it('紹介目的を先生が言わなかったときは既定文が入る', () => {
    for (const 空 of ['', '   ', '要確認', null, undefined]) {
      const doc = finalizeReferralContent({ ...AIの出力, purpose: 空 }, 患者, 作成日);
      expect(doc.purpose).toBe(REFERRAL_FIXED_TEXT.defaultPurpose);
    }
  });

  it('言っていない項目は空欄のまま（「要確認」を紙に出さない）', () => {
    const doc = finalizeReferralContent(
      {
        ...AIの出力,
        pastHistory: '要確認',
        currentPrescription: 'なし',
        remarks: '特記事項なし',
      },
      患者,
      作成日,
    );
    expect(doc.pastHistory).toBe('');
    expect(doc.currentPrescription).toBe('');
    expect(doc.remarks).toBe('');
  });

  it('傷病名が配列で返っても1つの文字列にする', () => {
    const doc = finalizeReferralContent(
      { ...AIの出力, diagnosis: ['高血圧症', '2型糖尿病'] },
      患者,
      作成日,
    );
    expect(doc.diagnosis).toBe('高血圧症\n2型糖尿病');
  });

  it('誕生日前なら年齢は1つ下がる', () => {
    expect(calcAge('2007-12-31', new Date('2026-07-10T00:00:00+09:00'))).toBe(18);
    expect(calcAge('2007-07-10', new Date('2026-07-10T00:00:00+09:00'))).toBe(19);
    expect(calcAge(null, new Date())).toBeNull();
  });

  it('日付の表記は雛形どおり（発行日はゼロ詰めなし、生年月日はゼロ詰め）', () => {
    expect(formatGregorianDate(new Date('2026-07-05T00:00:00+09:00'))).toBe('2026年7月5日');
    expect(formatBirthDate('2007-01-01T00:00:00.000Z')).toBe('2007年01月01日');
    expect(formatBirthDate(undefined)).toBe('');
  });

  it('宛先の表記ゆれを吸収する', () => {
    expect(normalizeHospital('市立中央病院様')).toBe('市立中央病院');
    expect(normalizeHospital('市立中央病院 御中')).toBe('市立中央病院');
    expect(normalizeDepartment('消化器内科')).toBe('消化器内科');
    expect(normalizeDepartment('脳神経外')).toBe('脳神経外科');
    expect(normalizeDepartment('')).toBe('');
    expect(normalizeDoctor('山田 太郎先生')).toBe('山田 太郎');
    expect(normalizeDoctor('山田先生 御机下')).toBe('山田');
    expect(normalizeDoctor('山田 太郎')).toBe('山田 太郎');
  });
});

describe('診療情報提供書：生成された書類にも雛形が当たる', () => {
  function makeService(
    llmContent: Record<string, unknown>,
    consultationOverride?: Record<string, unknown>,
  ) {
    const saved: Array<Record<string, unknown>> = [];
    const prisma = {
      aIExecution: { create: jest.fn() },
      clinicalEntity: { findMany: jest.fn().mockResolvedValue([]) },
      transcriptCorrection: { findMany: jest.fn().mockResolvedValue([]) },
      revisionHistory: { findMany: jest.fn().mockResolvedValue([]) },
      consultationChatMessage: {
        findMany: jest.fn().mockResolvedValue([
          {
            content: '長崎医療センターの循環器内科、田中先生宛てで紹介状を作って',
          },
        ]),
      },
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
          ...{
            id: 'c1',
            physicianId: 'dr1',
            patientId: 'p1',
            patient: {
              patientCode: 'P-001',
              name: 'テスト 次郎',
              nameKana: 'テスト ジロウ',
              sex: 'M',
              dateOfBirth: new Date('2007-01-01T00:00:00.000Z'),
              postalCode: '856-0832',
              address: '長崎県大村市本町 436-16',
              phone: '0957-51-1256',
              occupation: '会社員',
              memo: null,
            },
            anonymousCase: null,
            structuredData: { data: {} },
            soapDocuments: [{ subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }],
            transcriptSegments: [],
            attachments: [],
          },
          ...consultationOverride,
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

  it('AIが患者欄や固定文を書いてきても、保存されるのは雛形の値', async () => {
    const { service, saved } = makeService({
      issuedDate: '令和8年1月1日',
      recipientHospital: '長崎医療センター',
      recipientDepartment: '循環器内科',
      recipientDoctor: '田中先生',
      patientName: '別人 太郎',
      address: '東京都千代田区',
      examResults: 'HbA1c 7.2%',
      clinicalCourse: '経過の要約',
      diagnosis: '高血圧症',
      purpose: '',
      pastHistory: '',
      currentPrescription: 'アムロジピン錠5mg　1回1錠　1日1回　朝食後',
      remarks: '',
    });

    await service.generateOne('c1', GeneratedDocumentType.REFERRAL);

    const doc = saved[0] as unknown as ReferralContent;
    expect(doc.patientName).toBe('テスト 次郎');
    expect(doc.address).toBe('長崎県大村市本町 436-16');
    expect(doc.examResults).toBe(REFERRAL_FIXED_TEXT.examResults);
    expect(doc.clinicalCourse).toBe(REFERRAL_FIXED_TEXT.clinicalCourse);
    expect(doc.purpose).toBe(REFERRAL_FIXED_TEXT.defaultPurpose);
    expect(doc.recipientDoctor).toBe('田中');
    expect(doc.currentPrescription).toBe('アムロジピン錠5mg　1回1錠　1日1回　朝食後');
    expect(doc.issuedDate).toBe(formatGregorianDate(new Date()));
  });

  it('患者情報が無くても、問診票から読んだ患者欄が入る', async () => {
    const { service, saved } = makeService(
      { recipientHospital: '市立中央病院', diagnosis: '高血圧症' },
      {
        patientId: null,
        patient: null,
        anonymousCase: { displayName: 'テスト 次郎', sex: 'M', age: 19 },
        attachments: [
          {
            ocrText: '【問診票】…',
            structuredData: {
              nameKana: 'テスト ジロウ',
              postalCode: '856-0832',
              address: '長崎県大村市本町 436-16',
              phone: '0957-51-1256',
              occupation: '会社員',
              dateOfBirth: '2007-01-01',
            },
          },
        ],
      },
    );

    await service.generateOne('c1', GeneratedDocumentType.REFERRAL);

    const doc = saved[0] as unknown as ReferralContent;
    expect(doc.patientName).toBe('テスト 次郎');
    expect(doc.patientNameKana).toBe('テスト ジロウ');
    expect(doc.postalCode).toBe('856-0832');
    expect(doc.address).toBe('長崎県大村市本町 436-16');
    expect(doc.phone).toBe('0957-51-1256');
    expect(doc.occupation).toBe('会社員');
    expect(doc.dateOfBirth).toBe('2007年01月01日');
  });

  it('情報提供書＋処方でも、中の紹介状に同じ雛形が当たる', async () => {
    const { service, saved } = makeService({
      referral: {
        recipientHospital: '市立中央病院様',
        diagnosis: '2型糖尿病',
        examResults: '勝手に書いた検査結果',
      },
      prescription: { items: [] },
      combinedNote: '',
    });

    await service.generateOne('c1', GeneratedDocumentType.INFO_PROVIDE_COMBINED);

    const doc = saved[0] as { referral: ReferralContent };
    expect(doc.referral.recipientHospital).toBe('市立中央病院');
    expect(doc.referral.examResults).toBe(REFERRAL_FIXED_TEXT.examResults);
    expect(doc.referral.patientName).toBe('テスト 次郎');
  });
});
