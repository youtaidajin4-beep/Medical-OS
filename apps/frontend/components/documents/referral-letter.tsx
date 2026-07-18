import { CLINIC_CONFIG } from '@/lib/clinic-config';
import type { ReferralLetterData } from '@/lib/mock-documents/types';
import { EditableInput, EditableText } from './editable-field';

type Props = {
  data: ReferralLetterData;
  onChange: (data: ReferralLetterData) => void;
};

function Section({
  title,
  value,
  onChange,
  rows = 2,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="doc-section-compact">
      <p className="doc-section-title">【{title}】</p>
      <EditableText value={value} onChange={onChange} rows={rows} />
    </div>
  );
}

export function ReferralLetter({ data, onChange }: Props) {
  const patch = (partial: Partial<ReferralLetterData>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page">
      <p className="doc-right doc-small">
        <EditableInput value={data.issuedDate} onChange={(v) => patch({ issuedDate: v })} />
      </p>
      <h1 className="doc-title">診療情報提供書</h1>

      <div className="doc-row doc-small">
        <div>
          <p>
            紹介先医療機関名：
            <EditableInput
              value={data.recipientHospital}
              onChange={(v) => patch({ recipientHospital: v })}
            />
          </p>
          <p>
            <EditableInput
              value={data.recipientDepartment}
              onChange={(v) => patch({ recipientDepartment: v })}
            />{' '}
            <EditableInput
              value={data.recipientDoctor}
              onChange={(v) => patch({ recipientDoctor: v })}
            />
          </p>
        </div>
        <div className="doc-right">
          <p>紹介元医療機関の所在地：{CLINIC_CONFIG.address}</p>
          <p>名称：{CLINIC_CONFIG.legalName}</p>
          <p>
            電話番号：{CLINIC_CONFIG.tel}　FAX：{CLINIC_CONFIG.fax}
          </p>
          <p>診療科名：{CLINIC_CONFIG.department}</p>
          <p>医師氏名：{CLINIC_CONFIG.physicianName}　印</p>
        </div>
      </div>

      <div className="doc-box doc-patient-grid">
        <p>
          患者氏名：
          <EditableInput value={data.patientName} onChange={(v) => patch({ patientName: v })} />（
          <EditableInput
            value={data.patientNameKana}
            onChange={(v) => patch({ patientNameKana: v })}
          />
          ）　様
        </p>
        <p>
          性別：<EditableInput value={data.sex} onChange={(v) => patch({ sex: v })} />
        </p>
        <p>
          患者住所：
          <EditableInput value={data.address} onChange={(v) => patch({ address: v })} />
        </p>
        <p>
          電話番号：
          <EditableInput value={data.phone} onChange={(v) => patch({ phone: v })} />
        </p>
        <p>
          生年月日：
          <EditableInput value={data.dateOfBirth} onChange={(v) => patch({ dateOfBirth: v })} />（
          {data.age ?? '—'} 歳）
        </p>
        <p>
          職業：
          <EditableInput value={data.occupation} onChange={(v) => patch({ occupation: v })} />
        </p>
      </div>

      <div className="doc-referral-body">
        <Section title="傷病名" value={data.diagnosis} onChange={(v) => patch({ diagnosis: v })} rows={2} />
        <Section title="紹介目的" value={data.purpose} onChange={(v) => patch({ purpose: v })} rows={2} />
        <Section
          title="既往歴及び家族歴"
          value={data.pastHistory}
          onChange={(v) => patch({ pastHistory: v })}
          rows={2}
        />
        <Section
          title="検査結果"
          value={data.examResults}
          onChange={(v) => patch({ examResults: v })}
          rows={2}
        />
        <Section
          title="治療経過"
          value={data.clinicalCourse}
          onChange={(v) => patch({ clinicalCourse: v })}
          rows={2}
        />
        <div className="doc-section-compact">
          <p className="doc-section-title">【現在の処方】</p>
          <p>別紙「現在の処方」参照</p>
        </div>
        <Section title="備考" value={data.remarks} onChange={(v) => patch({ remarks: v })} rows={2} />
      </div>
    </div>
  );
}
