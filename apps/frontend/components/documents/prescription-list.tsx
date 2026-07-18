import type { PrescriptionLine, PrescriptionListData } from '@/lib/mock-documents/types';
import { EditableInput } from './editable-field';

type Props = {
  data: PrescriptionListData;
  onChange: (data: PrescriptionListData) => void;
};

export function PrescriptionList({ data, onChange }: Props) {
  function updateItem(index: number, patch: Partial<PrescriptionLine>) {
    onChange({
      items: data.items.map((item) => (item.index === index ? { ...item, ...patch } : item)),
    });
  }

  return (
    <div className="doc-page doc-page-rx">
      <p className="doc-section-title">【現在の処方】</p>
      <div className="doc-rx-list">
        {data.items.map((item) => (
          <div key={item.index} className="doc-rx-item">
            <div>
              <p>
                （{item.index}）
                <EditableInput
                  value={item.name}
                  onChange={(v) => updateItem(item.index, { name: v })}
                />
              </p>
              <p className="doc-small">
                <EditableInput
                  value={item.dailyDose}
                  onChange={(v) => updateItem(item.index, { dailyDose: v })}
                />
              </p>
              <p className="doc-small">
                <EditableInput
                  value={item.frequency}
                  onChange={(v) => updateItem(item.index, { frequency: v })}
                />
              </p>
              {item.note !== undefined && (
                <p className="doc-small">
                  <EditableInput
                    value={item.note ?? ''}
                    onChange={(v) => updateItem(item.index, { note: v })}
                  />
                </p>
              )}
              <p className="doc-small">
                <EditableInput
                  value={item.prescribedDate}
                  onChange={(v) => updateItem(item.index, { prescribedDate: v })}
                />
              </p>
            </div>
            <div className="doc-rx-meta">
              <p>
                <EditableInput
                  value={item.dosePerTake}
                  onChange={(v) => updateItem(item.index, { dosePerTake: v })}
                />
              </p>
              <p>
                <EditableInput
                  value={item.days}
                  onChange={(v) => updateItem(item.index, { days: v })}
                />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
