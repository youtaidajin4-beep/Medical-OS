import { CLINIC_CONFIG } from '@/lib/clinic-config';
import type { CareOpinion1Data } from '@/lib/mock-documents/types';
import { EditableInput, EditableText } from './editable-field';

type Props = {
  data: CareOpinion1Data;
  onChange: (data: CareOpinion1Data) => void;
};

function Check({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="doc-screen-only inline-flex items-center gap-0.5 border-0 bg-transparent p-0 font-inherit text-inherit"
      onClick={onClick}
    >
      <span className={`doc-checkbox${checked ? ' checked' : ''}`} />
      {label}
    </button>
  );
}

function PrintCheck({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="doc-print-only">
      <span className={`doc-checkbox${checked ? ' checked' : ''}`} />
      {label}{' '}
    </span>
  );
}

export function CareOpinion1({ data, onChange }: Props) {
  const patch = (partial: Partial<CareOpinion1Data>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page doc-page-care">
      <div className="doc-row doc-tiny">
        <span>
          市町村コード{' '}
          <EditableInput
            value={data.municipalityCode}
            onChange={(v) => patch({ municipalityCode: v })}
          />
        </span>
        <span>
          医師番号{' '}
          <EditableInput value={data.doctorNumber} onChange={(v) => patch({ doctorNumber: v })} />
        </span>
        <span>
          記入日{' '}
          <EditableInput value={data.entryDate} onChange={(v) => patch({ entryDate: v })} />
        </span>
      </div>
      <h1 className="doc-title">主治医意見書①</h1>

      <div className="doc-box">
        <p>
          申請者氏名：
          <EditableInput value={data.patientName} onChange={(v) => patch({ patientName: v })} />（
          <EditableInput
            value={data.patientNameKana}
            onChange={(v) => patch({ patientNameKana: v })}
          />
          ）
        </p>
        <p>
          生年月日：
          <EditableInput value={data.dateOfBirth} onChange={(v) => patch({ dateOfBirth: v })} />（
          {data.age ?? '—'} 歳）
        </p>
        <p>
          連絡先：
          <EditableInput value={data.contact} onChange={(v) => patch({ contact: v })} />
        </p>
        <p>医療機関：{CLINIC_CONFIG.legalName}</p>
        <p>
          所在地：{CLINIC_CONFIG.address}　TEL {CLINIC_CONFIG.tel}
        </p>
      </div>

      <div className="doc-box">
        <p className="doc-section-title">1. 傷病に関する意見</p>
        <p>（1）診断名</p>
        {data.diagnoses.map((d, i) => (
          <p key={i}>
            {i + 1}.{' '}
            <EditableInput
              value={d.name}
              onChange={(v) => {
                const diagnoses = [...data.diagnoses];
                diagnoses[i] = { ...d, name: v };
                patch({ diagnoses });
              }}
            />　発症年月日：
            <EditableInput
              value={d.onsetDate}
              onChange={(v) => {
                const diagnoses = [...data.diagnoses];
                diagnoses[i] = { ...d, onsetDate: v };
                patch({ diagnoses });
              }}
            />
          </p>
        ))}
        <p style={{ marginTop: '1mm' }}>（2）症状としての安定性</p>
        <p>
          <Check
            checked={data.stability === 'stable'}
            label="安定"
            onClick={() => patch({ stability: 'stable' })}
          />{' '}
          <Check
            checked={data.stability === 'unstable'}
            label="不安定"
            onClick={() => patch({ stability: 'unstable' })}
          />{' '}
          <Check
            checked={data.stability === 'unknown'}
            label="不明"
            onClick={() => patch({ stability: 'unknown' })}
          />
          <PrintCheck checked={data.stability === 'stable'} label="安定" />
          <PrintCheck checked={data.stability === 'unstable'} label="不安定" />
          <PrintCheck checked={data.stability === 'unknown'} label="不明" />
        </p>
        <p style={{ marginTop: '1mm' }}>（3）治療内容・経過</p>
        <EditableText
          value={data.treatmentCourse}
          onChange={(v) => patch({ treatmentCourse: v })}
          rows={3}
        />
      </div>

      <div className="doc-box">
        <p className="doc-section-title">2. 特別な医療（直近14日以内）</p>
        <EditableInput
          value={data.specialMedicalCare.join('、') || 'なし'}
          onChange={(v) =>
            patch({
              specialMedicalCare: v === 'なし' ? [] : v.split(/[、,]/).map((s) => s.trim()),
            })
          }
        />
      </div>

      <div className="doc-box">
        <p className="doc-section-title">3. 心身の状態に関する意見</p>
        <p>
          （1）自立度：障害高齢者{' '}
          <EditableInput
            value={data.independencePhysical}
            onChange={(v) => patch({ independencePhysical: v })}
          />{' '}
          / 認知症高齢者{' '}
          <EditableInput
            value={data.independenceCognitive}
            onChange={(v) => patch({ independenceCognitive: v })}
          />
        </p>
        <p>
          （2）認知症の中核症状：短期記憶{' '}
          <EditableInput
            value={data.coreSymptoms.shortTermMemory ?? ''}
            onChange={(v) =>
              patch({ coreSymptoms: { ...data.coreSymptoms, shortTermMemory: v } })
            }
          />
          、意思決定{' '}
          <EditableInput
            value={data.coreSymptoms.decisionMaking ?? ''}
            onChange={(v) =>
              patch({ coreSymptoms: { ...data.coreSymptoms, decisionMaking: v } })
            }
          />
          、伝達{' '}
          <EditableInput
            value={data.coreSymptoms.communication ?? ''}
            onChange={(v) =>
              patch({ coreSymptoms: { ...data.coreSymptoms, communication: v } })
            }
          />
        </p>
        <p>
          （3）その他の精神・神経症状：
          <EditableInput
            value={data.otherPsychSymptoms}
            onChange={(v) => patch({ otherPsychSymptoms: v })}
          />
        </p>
      </div>
    </div>
  );
}
