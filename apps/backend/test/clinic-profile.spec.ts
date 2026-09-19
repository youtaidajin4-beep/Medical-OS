import { CLINIC, resolveClinicProfile } from '../src/modules/documents/clinic';
import {
  finalizeReferralContent,
  REFERRAL_FIXED_TEXT,
} from '../src/modules/documents/referral-template';

/**
 * 書類に印刷する医療機関の情報は院ごとに違う。
 * コードの定数に持たせていると、2院目を入れるのにデプロイが要る。
 */
describe('クリニックの設定', () => {
  it('DBの値が書類へ流れる', () => {
    const profile = resolveClinicProfile(
      {
        legalName: '医療法人 検証会　テスト内科クリニック',
        address: '長崎県大村市検証町 1-2-3',
        tel: '0957-00-1111',
        fax: '0957-00-2222',
        department: '内科',
        municipalityCode: '99999',
      },
      { name: '検証 太郎', doctorNumber: '1234567890' },
    );
    expect(profile.legalName).toBe('医療法人 検証会　テスト内科クリニック');
    expect(profile.municipalityCode).toBe('99999');
    expect(profile.doctorNumber).toBe('1234567890');
    expect(profile.physicianName).toBe('検証 太郎');
  });

  it('医師番号は医師ごと。同じクリニックでも医師が変われば変わる', () => {
    const clinic = { legalName: 'A医院', municipalityCode: '11111' };
    const a = resolveClinicProfile(clinic, { name: 'A 先生', doctorNumber: '1111111111' });
    const b = resolveClinicProfile(clinic, { name: 'B 先生', doctorNumber: '2222222222' });
    expect(a.doctorNumber).not.toBe(b.doctorNumber);
    expect(a.legalName).toBe(b.legalName);
  });

  it('設定が空の項目は既定値のまま（紙が空欄で出ないように）', () => {
    const profile = resolveClinicProfile({ legalName: 'A医院', address: '   ' }, null);
    expect(profile.legalName).toBe('A医院');
    expect(profile.address).toBe(CLINIC.address);
    expect(profile.physicianName).toBe(CLINIC.physicianName);
  });

  it('設定がまるごと無くても落ちない', () => {
    expect(resolveClinicProfile(null, null)).toEqual(CLINIC);
  });
});

describe('紹介状の固定文', () => {
  it('医師の設定で差し替えられる（院ごとに文が違うため）', () => {
    const doc = finalizeReferralContent(
      { diagnosis: '高血圧症' },
      { patientName: 'テスト 次郎', sex: '男', age: 19 },
      new Date('2026-07-10T09:00:00+09:00'),
      undefined,
      {
        examResults: '検査結果は別紙のとおりです。',
        clinicalCourse: 'いつもお世話になっております。',
        defaultPurpose: 'ご高診をお願いいたします。',
      },
    );
    expect(doc.examResults).toBe('検査結果は別紙のとおりです。');
    expect(doc.clinicalCourse).toBe('いつもお世話になっております。');
    // 医師が紹介目的を言わなかったので既定文
    expect(doc.purpose).toBe('ご高診をお願いいたします。');
  });

  it('設定が無ければ、いまの文（くしま内科の様式）のまま', () => {
    const doc = finalizeReferralContent(
      {},
      { patientName: 'テスト 次郎', sex: '男', age: 19 },
      new Date('2026-07-10T09:00:00+09:00'),
    );
    expect(doc.examResults).toBe(REFERRAL_FIXED_TEXT.examResults);
    expect(doc.clinicalCourse).toBe(REFERRAL_FIXED_TEXT.clinicalCourse);
  });
});
