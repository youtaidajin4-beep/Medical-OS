import { CLINIC_CONFIG } from '@/lib/clinic-config';
import type { MedicalCertificateData } from '@/lib/mock-documents/types';
import { EditableInput, EditableText } from './editable-field';

type Props = {
  data: MedicalCertificateData;
  onChange: (data: MedicalCertificateData) => void;
};

function TableRow({
  label,
  value,
  onChange,
  colSpan = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colSpan?: number;
}) {
  return (
    <>
      <tr>
        <th colSpan={colSpan}>{label}</th>
      </tr>
      <tr>
        <td colSpan={colSpan}>
          <EditableText value={value} onChange={onChange} rows={1} className="doc-tiny" />
        </td>
      </tr>
    </>
  );
}

export function MedicalCertificate({ data, onChange }: Props) {
  const patch = (partial: Partial<MedicalCertificateData>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page doc-page-cert">
      <h1 className="doc-title">診断書</h1>
      <p>
        住所：
        <EditableInput value={data.patientName} onChange={(v) => patch({ patientName: v })} />　殿
      </p>
      <p>
        氏名：
        <EditableInput value={data.patientName} onChange={(v) => patch({ patientName: v })} />　　生年月日：
        <EditableInput value={data.dateOfBirth} onChange={(v) => patch({ dateOfBirth: v })} />（
        {data.age ?? '—'} 歳）
      </p>
      <p>
        健診日：
        <EditableInput value={data.examDate} onChange={(v) => patch({ examDate: v })} />
      </p>

      <table className="doc-table" style={{ marginTop: '2mm', flex: 1 }}>
        <tbody>
          <TableRow label="問診（既往歴）" value={data.interview} onChange={(v) => patch({ interview: v })} />
          <TableRow
            label="喫煙歴・服薬歴"
            value={data.smokingMeds}
            onChange={(v) => patch({ smokingMeds: v })}
          />
          <TableRow label="自覚・他覚症状" value={data.symptoms} onChange={(v) => patch({ symptoms: v })} />
          <tr>
            <th>
              身長{' '}
              <EditableInput value={data.height} onChange={(v) => patch({ height: v })} /> cm
            </th>
            <th>
              体重{' '}
              <EditableInput value={data.weight} onChange={(v) => patch({ weight: v })} /> kg
            </th>
            <th>
              腹囲{' '}
              <EditableInput value={data.waist} onChange={(v) => patch({ waist: v })} /> cm
            </th>
          </tr>
          <tr>
            <td colSpan={3}>
              BMI{' '}
              <EditableInput value={data.bmi} onChange={(v) => patch({ bmi: v })} />
            </td>
          </tr>
          <TableRow label="聴力" value={data.hearing} onChange={(v) => patch({ hearing: v })} />
          <TableRow label="視力" value={data.vision} onChange={(v) => patch({ vision: v })} />
          <tr>
            <th colSpan={3}>
              血圧{' '}
              <EditableInput
                value={data.bloodPressure}
                onChange={(v) => patch({ bloodPressure: v })}
              />{' '}
              mmHg
            </th>
          </tr>
          <tr>
            <th colSpan={3}>
              脈拍{' '}
              <EditableInput value={data.pulse} onChange={(v) => patch({ pulse: v })} />
            </th>
          </tr>
          <TableRow label="検尿" value={data.urinalysis} onChange={(v) => patch({ urinalysis: v })} />
          <TableRow label="胸部レントゲン" value={data.chestXray} onChange={(v) => patch({ chestXray: v })} />
          <TableRow label="心電図" value={data.ecg} onChange={(v) => patch({ ecg: v })} />
          <TableRow
            label="血液検査（空腹時）"
            value={data.bloodTests}
            onChange={(v) => patch({ bloodTests: v })}
          />
          <TableRow label="備考" value={data.remarks} onChange={(v) => patch({ remarks: v })} />
        </tbody>
      </table>

      <div className="doc-box" style={{ marginTop: '2mm' }}>
        <p className="doc-section-title">医師の診断</p>
        <EditableText value={data.doctorDiagnosis} onChange={(v) => patch({ doctorDiagnosis: v })} rows={2} />
        <p className="doc-right" style={{ marginTop: '1mm' }}>
          総合判定：
          <EditableInput value={data.overallGrade} onChange={(v) => patch({ overallGrade: v })} />
        </p>
      </div>

      <div className="doc-row doc-tiny" style={{ marginTop: '2mm' }}>
        <div>
          <p>A: 異常なし / B: 軽度異常 / C: 要経過観察</p>
          <p>D: 要受診 / E: 要治療 / F: 要精密検査</p>
        </div>
        <div className="doc-right">
          <p>
            <EditableInput value={data.issuedDate} onChange={(v) => patch({ issuedDate: v })} />
          </p>
          <p>{CLINIC_CONFIG.address}</p>
          <p>{CLINIC_CONFIG.legalName}</p>
          <p>電話 {CLINIC_CONFIG.tel}</p>
          <p>医師　{CLINIC_CONFIG.physicianName}　印</p>
        </div>
      </div>
    </div>
  );
}
