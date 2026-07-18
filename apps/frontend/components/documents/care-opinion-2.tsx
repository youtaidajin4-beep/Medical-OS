import type { CareOpinion2Data } from '@/lib/mock-documents/types';
import { EditableInput, EditableText } from './editable-field';

type Props = {
  data: CareOpinion2Data;
  onChange: (data: CareOpinion2Data) => void;
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

export function CareOpinion2({ data, onChange }: Props) {
  const patch = (partial: Partial<CareOpinion2Data>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page doc-page-care doc-page-break">
      <div className="doc-row doc-tiny">
        <span>
          市町村コード{' '}
          <EditableInput
            value={data.municipalityCode}
            onChange={(v) => patch({ municipalityCode: v })}
          />
        </span>
        <span>
          記入日{' '}
          <EditableInput value={data.entryDate} onChange={(v) => patch({ entryDate: v })} />
        </span>
      </div>
      <h1 className="doc-title">主治医意見書②</h1>

      <div className="doc-box">
        <p className="doc-section-title">3. 心身の状態（続き）</p>
        <p>（5）身体の状態</p>
        <p>
          利手：
          <Check
            checked={data.dominantHand === 'right'}
            label="右"
            onClick={() => patch({ dominantHand: 'right' })}
          />{' '}
          <Check
            checked={data.dominantHand === 'left'}
            label="左"
            onClick={() => patch({ dominantHand: 'left' })}
          />
          <PrintCheck checked={data.dominantHand === 'right'} label="右" />
          <PrintCheck checked={data.dominantHand === 'left'} label="左" />
        </p>
        <p>
          身長{' '}
          <EditableInput value={data.height} onChange={(v) => patch({ height: v })} /> cm　体重{' '}
          <EditableInput value={data.weight} onChange={(v) => patch({ weight: v })} /> kg
        </p>
        <p>
          過去6か月の体重変化：
          <Check
            checked={data.weightChange === 'increase'}
            label="増加"
            onClick={() => patch({ weightChange: 'increase' })}
          />{' '}
          <Check
            checked={data.weightChange === 'maintain'}
            label="維持"
            onClick={() => patch({ weightChange: 'maintain' })}
          />{' '}
          <Check
            checked={data.weightChange === 'decrease'}
            label="減少"
            onClick={() => patch({ weightChange: 'decrease' })}
          />
          <PrintCheck checked={data.weightChange === 'increase'} label="増加" />
          <PrintCheck checked={data.weightChange === 'maintain'} label="維持" />
          <PrintCheck checked={data.weightChange === 'decrease'} label="減少" />
        </p>
        <p>
          身体機能障害：
          <EditableInput
            value={data.physicalImpairments.join('、') || 'なし'}
            onChange={(v) =>
              patch({
                physicalImpairments: v === 'なし' ? [] : v.split(/[、,]/).map((s) => s.trim()),
              })
            }
          />
        </p>
      </div>

      <div className="doc-box">
        <p className="doc-section-title">4. 生活機能とサービスに関する意見</p>
        <p>
          （1）移動：
          <EditableInput
            value={data.mobility.join(' / ')}
            onChange={(v) => patch({ mobility: v.split('/').map((s) => s.trim()) })}
          />
        </p>
        <p>
          （2）栄養・食生活：
          <EditableInput value={data.nutrition} onChange={(v) => patch({ nutrition: v })} />
        </p>
        <p>
          （3）リスクと対処：
          <EditableInput
            value={data.risks.join('、')}
            onChange={(v) => patch({ risks: v.split(/[、,]/).map((s) => s.trim()) })}
          />
        </p>
        <EditableText value={data.riskPolicy} onChange={(v) => patch({ riskPolicy: v })} rows={2} />
        <p>
          （4）サービス利用による改善見通し：
          <EditableInput
            value={data.serviceOutlook}
            onChange={(v) => patch({ serviceOutlook: v })}
          />
        </p>
        <p>
          （5）医学的管理：
          <EditableInput
            value={data.medicalManagement.join(' / ')}
            onChange={(v) => patch({ medicalManagement: v.split('/').map((s) => s.trim()) })}
          />
        </p>
        <p>
          （6）サービス提供時の留意：
          <EditableInput
            value={data.servicePrecautions}
            onChange={(v) => patch({ servicePrecautions: v })}
          />
        </p>
        <p>
          （7）感染症：
          <EditableInput
            value={data.infectiousDisease}
            onChange={(v) => patch({ infectiousDisease: v })}
          />
        </p>
      </div>

      <div className="doc-box">
        <p className="doc-section-title">5. 特記すべき事項</p>
        <EditableText value={data.specialNotes} onChange={(v) => patch({ specialNotes: v })} rows={3} />
      </div>
    </div>
  );
}
