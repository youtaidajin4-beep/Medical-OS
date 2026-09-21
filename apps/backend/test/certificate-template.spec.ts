import {
  finalizeCertificate,
  formatReiwaBirthDate,
} from '../src/modules/documents/certificate-template';
import { CLINIC } from '../src/modules/documents/clinic';

/**
 * 診断書は検査の結果そのものを紹介先へ渡す紙。
 * もっともらしい数値が入ると、紹介先の医師がそれを見て判断してしまう。
 */
describe('診断書：様式で固定するところ', () => {
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

  it('住所・氏名・生年月日・年齢は患者情報から入り、AIの出力は使わない', () => {
    const doc = finalizeCertificate(
      { address: '東京都千代田区', patientName: '別人 太郎' },
      患者,
      作成日,
    );
    expect(doc.address).toBe('長崎県大村市東本町12-5');
    expect(doc.patientName).toBe('松本 花子');
    expect(doc.dateOfBirth).toBe('昭和33年3月4日');
    expect(doc.age).toBe(68);
  });

  it('右下の日付は作成した日（和暦）', () => {
    expect(finalizeCertificate({}, 患者, 作成日).issuedDate).toBe('令和8年7月10日');
  });

  it('医療機関はAIの出力ではなく当院の値', () => {
    const doc = finalizeCertificate({ clinicName: '別のクリニック' }, 患者, 作成日);
    expect(doc.clinicName).toBe(CLINIC.legalName);
    expect(doc.clinicAddress).toBe(CLINIC.address);
    expect(doc.physicianName).toBe(CLINIC.physicianName);
    // 様式どおりハイフン無し
    expect(doc.clinicTel).toBe('0957511256');
  });

  it('検査値は書かれたものだけ通し、無いものは空欄のまま', () => {
    const doc = finalizeCertificate(
      {
        height: { value: '158', judgement: 'A' },
        ast: { value: '24', judgement: 'B' },
      },
      患者,
      作成日,
    ) as Record<string, { value: string; judgement: string }>;
    expect(doc.height).toEqual({ value: '158', judgement: 'A' });
    expect(doc.ast).toEqual({ value: '24', judgement: 'B' });
    expect(doc.weight).toEqual({ value: '', judgement: '' });
    expect(doc.hemoglobin).toEqual({ value: '', judgement: '' });
  });

  it('判断基準にない判定は捨てる（紙に出ない記号を持たせない）', () => {
    const doc = finalizeCertificate(
      { height: { value: '158', judgement: '正常' }, overallJudgement: 'H' },
      患者,
      作成日,
    ) as Record<string, unknown>;
    expect((doc.height as { judgement: string }).judgement).toBe('');
    expect(doc.overallJudgement).toBe('');
  });

  it('総合判定はA〜Gだけ通す', () => {
    for (const code of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      expect(finalizeCertificate({ overallJudgement: code }, 患者, 作成日).overallJudgement).toBe(
        code,
      );
    }
  });

  it('健診日は紙の和暦に寄せる（カルテを貼ると西暦で入ってくる）', () => {
    const 貼り付け = finalizeCertificate({ examDate: '2026/09/21' }, 患者, 作成日);
    expect(貼り付け.examDate).toBe('令和8年9月21日');
    expect(finalizeCertificate({ examDate: '2026-09-21' }, 患者, 作成日).examDate).toBe(
      '令和8年9月21日',
    );
  });

  it('日付として読めない健診日は勝手に決めず、そのまま残す', () => {
    expect(finalizeCertificate({ examDate: '先週' }, 患者, 作成日).examDate).toBe('先週');
    expect(finalizeCertificate({ examDate: '令和8年9月1日' }, 患者, 作成日).examDate).toBe(
      '令和8年9月1日',
    );
    expect(finalizeCertificate({}, 患者, 作成日).examDate).toBe('');
  });

  it('生年月日は和暦（サーバーがUTCでも日本時間で数える）', () => {
    // 日本時間 2026-09-20 0:28（＝UTC 2026-09-19 15:28）生まれとして
    expect(formatReiwaBirthDate('2007-01-01T00:00:00.000Z')).toBe('平成19年1月1日');
    expect(formatReiwaBirthDate(undefined)).toBe('');
  });
});
