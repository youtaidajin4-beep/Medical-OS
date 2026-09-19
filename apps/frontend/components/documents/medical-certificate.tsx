'use client';

import type {
  ExamJudgement,
  ExamValue,
  MedicalCertificateData,
} from '@/lib/mock-documents/types';
import { BLOOD_TESTS, JUDGEMENT_CRITERIA } from '@/lib/mock-documents/certificate-options';
import { EditableInput, EditableText } from './editable-field';
import { ChoiceGroup } from './form-controls';

/**
 * 診断書（検査結果）。紹介状に同封して紹介先へ渡す紙。
 * 紙の様式をそのまま写している（04_MVP_SPECIFICATION/assets/certificate.png）。
 *
 * 出どころ:
 * - 住所・氏名・生年月日・年齢、問診(既往歴)・喫煙歴/服薬歴・自覚他覚症状 … 問診票と患者情報
 * - 健診日 … SOAP と先生のチャット
 * - 検査の数値 … 先生がチャットへ貼った検査結果（AIは数値を作らない）
 * - 備考・医師の診断・総合判定 … 先生のチャット
 * - 下の医療機関と左下の判断基準 … 毎回同じ
 */
type Props = {
  data: MedicalCertificateData;
  onChange: (data: MedicalCertificateData) => void;
};

/** 判定欄。押すと A〜G から選べる（打ち込ませない） */
function Judgement({
  value,
  onChange,
}: {
  value: ExamJudgement;
  onChange: (next: ExamJudgement) => void;
}) {
  // 紙にはA〜Gの記号だけが載る。選ぶときだけ意味（異常なし 等）を出す
  return (
    <span className="doc-judgement-cell">
      <span className="doc-judgement-code">{value || '　'}</span>
      <select
        className="doc-judgement"
        value={value}
        onChange={(e) => onChange(e.target.value as ExamJudgement)}
        aria-label="判定"
      >
        <option value="">（未選択）</option>
        {JUDGEMENT_CRITERIA.map(({ code, label }) => (
          <option key={code} value={code}>
            {code}　{label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** 正 / 異 の1行（聴力） */
function NormalAbnormal({
  value,
  onChange,
}: {
  value: '' | 'normal' | 'abnormal';
  onChange: (next: '' | 'normal' | 'abnormal') => void;
}) {
  return (
    <ChoiceGroup
      value={value}
      onChange={onChange}
      options={[
        { value: 'normal', label: '正' },
        { value: 'abnormal', label: '異' },
      ]}
    />
  );
}

export function MedicalCertificate({ data, onChange }: Props) {
  const patch = (partial: Partial<MedicalCertificateData>) => onChange({ ...data, ...partial });

  /** 値＋判定の行（身長・体重・血液検査など） */
  const valueRow = (key: keyof MedicalCertificateData, unit: string) => {
    const row = data[key] as ExamValue;
    const set = (next: Partial<ExamValue>) =>
      patch({ [key]: { ...row, ...next } } as Partial<MedicalCertificateData>);
    return {
      cell: (
        <>
          <EditableInput value={row.value} onChange={(value) => set({ value })} minSize={8} />
          <span className="doc-cert-unit">{unit}</span>
        </>
      ),
      judgement: (
        <Judgement value={row.judgement} onChange={(judgement) => set({ judgement })} />
      ),
    };
  };

  const height = valueRow('height', 'cm');
  const weight = valueRow('weight', 'kg');
  const waist = valueRow('waist', 'cm');
  const bmi = valueRow('bmi', '');

  return (
    <div className="doc-page doc-page-cert">
      <h1 className="doc-title doc-cert-title">診 断 書</h1>

      <div className="doc-cert-head">
        <p>
          <span className="doc-cert-key">住所</span>
          <EditableInput
            value={data.address}
            onChange={(v) => patch({ address: v })}
            minSize={34}
          />
        </p>
        <p>
          <span className="doc-cert-key">氏名</span>
          <EditableInput
            value={data.patientName}
            onChange={(v) => patch({ patientName: v })}
            minSize={20}
          />
          <span className="doc-cert-dono">殿</span>
        </p>
        <p className="doc-cert-birth">
          <EditableInput
            value={data.dateOfBirth}
            onChange={(v) => patch({ dateOfBirth: v })}
            minSize={18}
          />
          （{data.age ?? '　'} 歳）
        </p>
        <p className="doc-cert-examdate">
          健診日
          <EditableInput
            value={data.examDate}
            onChange={(v) => patch({ examDate: v })}
            minSize={18}
            placeholder="日付を選択してください"
          />
        </p>
      </div>

      <table className="doc-cert-table doc-cert-top">
        <tbody>
          <tr>
            <th className="doc-cert-th">問診（既往歴）</th>
            <td>
              <EditableInput
                value={data.interview}
                onChange={(v) => patch({ interview: v })}
                minSize={70}
                className="doc-cert-wide"
              />
            </td>
          </tr>
          <tr>
            <th className="doc-cert-th">喫煙歴・服薬歴</th>
            <td>
              <EditableInput
                value={data.smokingMedication}
                onChange={(v) => patch({ smokingMedication: v })}
                minSize={70}
                className="doc-cert-wide"
              />
            </td>
          </tr>
          <tr>
            <th className="doc-cert-th">自覚・他覚症状</th>
            <td>
              <EditableInput
                value={data.symptoms}
                onChange={(v) => patch({ symptoms: v })}
                minSize={70}
                className="doc-cert-wide"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 紙と同じく、左右のブロックは行数が違う（左9行・右11行）ので別の表にする */}
      <div className="doc-cert-body">
        <table className="doc-cert-table doc-cert-left">
          <tbody>
            <tr className="doc-cert-colhead">
              <th className="doc-cert-th">検査内容</th>
              <th className="doc-cert-th">検査</th>
              <th className="doc-cert-th doc-cert-th-j">判定</th>
            </tr>
            <tr>
              <th className="doc-cert-th">身長</th>
              <td className="doc-cert-num">{height.cell}</td>
              <td className="doc-cert-j">{height.judgement}</td>
            </tr>
            <tr>
              <th className="doc-cert-th">体重</th>
              <td className="doc-cert-num">{weight.cell}</td>
              <td className="doc-cert-j">{weight.judgement}</td>
            </tr>
            <tr>
              <th className="doc-cert-th">
                腹囲
                <span className="doc-cert-range">（男性 85cm 未満／女性 90cm 未満）</span>
              </th>
              <td className="doc-cert-num">{waist.cell}</td>
              <td className="doc-cert-j">{waist.judgement}</td>
            </tr>
            <tr>
              <th className="doc-cert-th">BMI（18.6-24.9）</th>
              <td className="doc-cert-num">{bmi.cell}</td>
              <td className="doc-cert-j">{bmi.judgement}</td>
            </tr>
            <tr>
              <th className="doc-cert-th">聴力</th>
              <td className="doc-cert-hearing">
                <span className="doc-cert-ear">
                  <span className="doc-cert-side">右</span>
                  <span className="doc-cert-hz">
                    <span>
                      1000Hz
                      <NormalAbnormal
                        value={data.hearing.right1000}
                        onChange={(right1000) => patch({ hearing: { ...data.hearing, right1000 } })}
                      />
                    </span>
                    <span>
                      4000Hz
                      <NormalAbnormal
                        value={data.hearing.right4000}
                        onChange={(right4000) => patch({ hearing: { ...data.hearing, right4000 } })}
                      />
                    </span>
                  </span>
                </span>
                <span className="doc-cert-ear">
                  <span className="doc-cert-side">左</span>
                  <span className="doc-cert-hz">
                    <span>
                      1000Hz
                      <NormalAbnormal
                        value={data.hearing.left1000}
                        onChange={(left1000) => patch({ hearing: { ...data.hearing, left1000 } })}
                      />
                    </span>
                    <span>
                      4000Hz
                      <NormalAbnormal
                        value={data.hearing.left4000}
                        onChange={(left4000) => patch({ hearing: { ...data.hearing, left4000 } })}
                      />
                    </span>
                  </span>
                </span>
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.hearing.judgement}
                  onChange={(judgement) => patch({ hearing: { ...data.hearing, judgement } })}
                />
              </td>
            </tr>
            <tr>
              <th className="doc-cert-th">視力</th>
              <td className="doc-cert-vision">
                <span>
                  <span className="doc-cert-side">右</span>
                  <EditableInput
                    value={data.vision.right}
                    onChange={(right) => patch({ vision: { ...data.vision, right } })}
                    minSize={5}
                  />
                  <span className="doc-cert-corrected">矯正</span>（
                  <EditableInput
                    value={data.vision.rightCorrected}
                    onChange={(rightCorrected) =>
                      patch({ vision: { ...data.vision, rightCorrected } })
                    }
                    minSize={5}
                  />
                  ）
                </span>
                <span>
                  <span className="doc-cert-side">左</span>
                  <EditableInput
                    value={data.vision.left}
                    onChange={(left) => patch({ vision: { ...data.vision, left } })}
                    minSize={5}
                  />
                  <span className="doc-cert-corrected">矯正</span>（
                  <EditableInput
                    value={data.vision.leftCorrected}
                    onChange={(leftCorrected) =>
                      patch({ vision: { ...data.vision, leftCorrected } })
                    }
                    minSize={5}
                  />
                  ）
                </span>
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.vision.judgement}
                  onChange={(judgement) => patch({ vision: { ...data.vision, judgement } })}
                />
              </td>
            </tr>
            <tr>
              <th className="doc-cert-th">血圧</th>
              <td className="doc-cert-num">
                <EditableInput
                  value={data.bloodPressure.systolic}
                  onChange={(systolic) =>
                    patch({ bloodPressure: { ...data.bloodPressure, systolic } })
                  }
                  minSize={5}
                />
                ／
                <EditableInput
                  value={data.bloodPressure.diastolic}
                  onChange={(diastolic) =>
                    patch({ bloodPressure: { ...data.bloodPressure, diastolic } })
                  }
                  minSize={5}
                />
                <span className="doc-cert-unit">mmHg</span>
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.bloodPressure.judgement}
                  onChange={(judgement) =>
                    patch({ bloodPressure: { ...data.bloodPressure, judgement } })
                  }
                />
              </td>
            </tr>
            <tr>
              <th className="doc-cert-th">脈拍</th>
              <td className="doc-cert-num">
                <EditableInput
                  value={data.pulse.rate}
                  onChange={(rate) => patch({ pulse: { ...data.pulse, rate } })}
                  minSize={5}
                />
                <span className="doc-cert-unit">回/分</span>
                <ChoiceGroup
                  value={data.pulse.rhythm}
                  onChange={(rhythm) => patch({ pulse: { ...data.pulse, rhythm } })}
                  options={[
                    { value: 'regular', label: '整' },
                    { value: 'irregular', label: '不整' },
                  ]}
                />
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.pulse.judgement}
                  onChange={(judgement) => patch({ pulse: { ...data.pulse, judgement } })}
                />
              </td>
            </tr>
            <tr>
              <th className="doc-cert-th">検尿</th>
              <td className="doc-cert-num">
                糖（
                <EditableInput
                  value={data.urinalysis.glucose}
                  onChange={(glucose) => patch({ urinalysis: { ...data.urinalysis, glucose } })}
                  minSize={5}
                />
                ）　蛋白（
                <EditableInput
                  value={data.urinalysis.protein}
                  onChange={(protein) => patch({ urinalysis: { ...data.urinalysis, protein } })}
                  minSize={5}
                />
                ）
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.urinalysis.judgement}
                  onChange={(judgement) => patch({ urinalysis: { ...data.urinalysis, judgement } })}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <table className="doc-cert-table doc-cert-right">
          <tbody>
            <tr className="doc-cert-colhead">
              <th className="doc-cert-th">検査内容</th>
              <th className="doc-cert-th">結果</th>
              <th className="doc-cert-th doc-cert-th-j">判定</th>
            </tr>
            <tr>
              <th className="doc-cert-th" rowSpan={2}>
                胸部
                <br />
                レントゲン
              </th>
              <td>
                <span className="doc-check-row">
                  <ChoiceGroup
                    value={data.chestXray.abnormality}
                    onChange={(abnormality) =>
                      patch({ chestXray: { ...data.chestXray, abnormality } })
                    }
                    options={[
                      { value: 'none', label: '異常なし' },
                      { value: 'present', label: 'あり' },
                    ]}
                  />
                  （
                  <EditableInput
                    value={data.chestXray.abnormalityDetail}
                    onChange={(abnormalityDetail) =>
                      patch({ chestXray: { ...data.chestXray, abnormalityDetail } })
                    }
                    minSize={12}
                  />
                  ）
                </span>
              </td>
              <td className="doc-cert-j" rowSpan={2}>
                <Judgement
                  value={data.chestXray.judgement}
                  onChange={(judgement) => patch({ chestXray: { ...data.chestXray, judgement } })}
                />
              </td>
            </tr>
            <tr>
              <td>
                <span className="doc-check-row">
                  <ChoiceGroup
                    value={data.chestXray.tuberculosis}
                    onChange={(tuberculosis) =>
                      patch({ chestXray: { ...data.chestXray, tuberculosis } })
                    }
                    options={[
                      { value: 'none', label: '結核なし' },
                      { value: 'present', label: 'あり' },
                    ]}
                  />
                  （
                  <EditableInput
                    value={data.chestXray.tuberculosisDetail}
                    onChange={(tuberculosisDetail) =>
                      patch({ chestXray: { ...data.chestXray, tuberculosisDetail } })
                    }
                    minSize={12}
                  />
                  ）
                </span>
              </td>
            </tr>
            <tr>
              <th className="doc-cert-th">心電図</th>
              <td>
                <span className="doc-check-row">
                  <ChoiceGroup
                    value={data.ecg.abnormality}
                    onChange={(abnormality) => patch({ ecg: { ...data.ecg, abnormality } })}
                    options={[
                      { value: 'none', label: '異常なし' },
                      { value: 'present', label: 'あり' },
                    ]}
                  />
                  （
                  <EditableInput
                    value={data.ecg.abnormalityDetail}
                    onChange={(abnormalityDetail) =>
                      patch({ ecg: { ...data.ecg, abnormalityDetail } })
                    }
                    minSize={12}
                  />
                  ）
                </span>
              </td>
              <td className="doc-cert-j">
                <Judgement
                  value={data.ecg.judgement}
                  onChange={(judgement) => patch({ ecg: { ...data.ecg, judgement } })}
                />
              </td>
            </tr>
            {BLOOD_TESTS.map((test, i) => {
              const key = test.key as keyof MedicalCertificateData;
              const row = data[key] as ExamValue;
              const set = (next: Partial<ExamValue>) =>
                patch({ [key]: { ...row, ...next } } as Partial<MedicalCertificateData>);
              return (
                <tr key={test.key}>
                  {i === 0 && (
                    <th className="doc-cert-th" rowSpan={BLOOD_TESTS.length}>
                      血液検査
                      <br />
                      （空腹時）
                    </th>
                  )}
                  <td className="doc-cert-blood">
                    <span className="doc-cert-blood-name">
                      {test.label}
                      <br />
                      <span className="doc-cert-range">（{test.range}）</span>
                    </span>
                    <span className="doc-cert-blood-value">
                      <EditableInput
                        value={row.value}
                        onChange={(value) => set({ value })}
                        minSize={6}
                      />
                      <span className="doc-cert-unit">{test.unit}</span>
                    </span>
                  </td>
                  <td className="doc-cert-j">
                    <Judgement value={row.judgement} onChange={(judgement) => set({ judgement })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <table className="doc-cert-table doc-cert-bottom">
        {/* 1行目が colSpan なので、列幅は colgroup で決める（総合判定の枠が広がってしまう） */}
        <colgroup>
          <col className="doc-cert-col-label" />
          <col />
          <col className="doc-cert-col-overall" />
        </colgroup>
        <tbody>
          <tr>
            <th className="doc-cert-th">備考</th>
            <td colSpan={2}>
              <EditableText
                value={data.remarks}
                onChange={(v) => patch({ remarks: v })}
                rows={2}
                className="doc-screen-only-block"
              />
              <div className="doc-print-block doc-field-line">{data.remarks}</div>
            </td>
          </tr>
          <tr>
            <th className="doc-cert-th">医師の診断</th>
            <td className="doc-cert-diagnosis">
              <EditableText
                value={data.doctorDiagnosis}
                onChange={(v) => patch({ doctorDiagnosis: v })}
                rows={3}
                className="doc-screen-only-block"
              />
              <div className="doc-print-block doc-field-line">{data.doctorDiagnosis}</div>
            </td>
            <td className="doc-cert-overall">
              <span className="doc-cert-overall-label">総合判定</span>
              <Judgement
                value={data.overallJudgement}
                onChange={(overallJudgement) => patch({ overallJudgement })}
              />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="doc-cert-issued">
        【
        <EditableInput
          value={data.issuedDate}
          onChange={(v) => patch({ issuedDate: v })}
          minSize={16}
        />
        】
      </p>

      <div className="doc-cert-foot">
        <table className="doc-cert-criteria">
          <tbody>
            <tr>
              <th colSpan={2}>判断基準</th>
            </tr>
            {JUDGEMENT_CRITERIA.map(({ code, label }) => (
              <tr key={code}>
                <td className="doc-cert-criteria-code">{code}</td>
                <td>{label}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-cert-clinic">
          <p>{data.clinicAddress}</p>
          <p>{data.clinicName}</p>
          <p>{data.clinicTel}</p>
          <p className="doc-cert-sign">
            <span className="doc-cert-sign-label">医師</span>
            {data.physicianName}
            <span className="doc-cert-seal">印</span>
          </p>
        </div>
      </div>
    </div>
  );

}
