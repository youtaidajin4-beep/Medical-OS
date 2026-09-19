'use client';

import type { CareOpinion2Data, DegreeRow } from '@/lib/mock-documents/types';
import {
  EATING,
  MEDICAL_MANAGEMENT,
  NUTRITION_STATE,
  OUTDOOR_WALKING,
  RISKS,
  WALKING_AIDS,
  WHEELCHAIR,
} from '@/lib/mock-documents/care-opinion-options';
import { EditableInput, EditableText } from './editable-field';
import { Check, ChoiceGroup, DegreeChoice, MultiCheckGroup } from './form-controls';

/**
 * 主治医意見書②（裏）。3(5)身体の状態・4生活機能とサービスに関する意見・5特記すべき事項。
 * ①と対で1セット。□はクリックで入る。
 */
type Props = {
  data: CareOpinion2Data;
  onChange: (data: CareOpinion2Data) => void;
};

/** 「□項目（部位: ___）（程度: □軽 □中 □重）」の1行 */
function DegreeLine({
  label,
  row,
  onChange,
  siteLabel = '部位:',
}: {
  label: string;
  row: DegreeRow;
  onChange: (next: DegreeRow) => void;
  siteLabel?: string;
}) {
  return (
    <div className="doc-care-kv">
      <span className="doc-care-kv-key">
        <Check
          checked={row.checked}
          label={label}
          onChange={(checked) => onChange({ ...row, checked })}
        />
      </span>
      <span className="doc-check-row">
        （{siteLabel}
        <EditableInput
          value={row.site ?? ''}
          onChange={(site) => onChange({ ...row, site })}
          minSize={14}
        />
        ）
      </span>
      <DegreeChoice value={row.degree} onChange={(degree) => onChange({ ...row, degree })} />
    </div>
  );
}

export function CareOpinion2({ data, onChange }: Props) {
  const patch = (partial: Partial<CareOpinion2Data>) => onChange({ ...data, ...partial });
  const patchPrecaution = (
    key: keyof Omit<CareOpinion2Data['precautions'], 'other'>,
    partial: Partial<{ none: boolean; detail: string }>,
  ) =>
    patch({
      precautions: {
        ...data.precautions,
        [key]: { ...data.precautions[key], ...partial },
      },
    });

  const precautionRows: Array<{
    key: keyof Omit<CareOpinion2Data['precautions'], 'other'>;
    label: string;
  }> = [
    { key: 'bloodPressure', label: '・血圧' },
    { key: 'movement', label: '・移動' },
    { key: 'eating', label: '・摂食' },
    { key: 'exercise', label: '・運動' },
    { key: 'swallowing', label: '・嚥下' },
  ];

  return (
    <div className="doc-page doc-page-care2">
      <h1 className="doc-title doc-care-title">主治医意見書②</h1>

      <div className="doc-care-header doc-care-header-2">
        <p>
          <span className="doc-care-key">市町村コード</span>
          <EditableInput
            value={data.municipalityCode}
            onChange={(v) => patch({ municipalityCode: v })}
          />
        </p>
        <p>
          被保険者番号
          <EditableInput
            value={data.insuredNumber}
            onChange={(v) => patch({ insuredNumber: v })}
            minSize={14}
          />
        </p>
        <p>
          記入日
          <EditableInput value={data.entryDate} onChange={(v) => patch({ entryDate: v })} />
        </p>
      </div>

      <div className="doc-care-section">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">3</span>
          <span className="doc-care-spine-label">心身の状態に関する意見</span>
        </div>
        <div className="doc-care-body">
          <p className="doc-care-lead">(5) 身体の状態</p>
          <div className="doc-care-kv">
            <span className="doc-check-row">
              利き腕（
              <ChoiceGroup
                value={data.dominantHand}
                onChange={(v) => patch({ dominantHand: v })}
                options={[
                  { value: 'right', label: '右' },
                  { value: 'left', label: '左' },
                ]}
              />
              ）
            </span>
            <span className="doc-check-row">
              身長=
              <EditableInput value={data.height} onChange={(v) => patch({ height: v })} minSize={8} />
              cm 体重=
              <EditableInput value={data.weight} onChange={(v) => patch({ weight: v })} minSize={8} />
              kg
            </span>
            <span className="doc-check-row">
              （過去 6 か月の体重の変化
              <ChoiceGroup
                value={data.weightChange}
                onChange={(v) => patch({ weightChange: v })}
                options={[
                  { value: 'increase', label: '増加' },
                  { value: 'maintain', label: '維持' },
                  { value: 'decrease', label: '減少' },
                ]}
              />
              ）
            </span>
          </div>

          <div className="doc-care-kv">
            <span className="doc-care-kv-key">
              <Check
                checked={data.limbLoss.checked}
                label="四肢欠損"
                onChange={(checked) => patch({ limbLoss: { ...data.limbLoss, checked } })}
              />
            </span>
            <span className="doc-check-row">
              （部位:
              <EditableInput
                value={data.limbLoss.site}
                onChange={(site) => patch({ limbLoss: { ...data.limbLoss, site } })}
                minSize={20}
              />
              ）
            </span>
          </div>

          <div className="doc-care-kv doc-care-kv-top">
            <span className="doc-care-kv-key">
              <Check
                checked={data.paralysis.checked}
                label="麻痺"
                onChange={(checked) => patch({ paralysis: { ...data.paralysis, checked } })}
              />
            </span>
            <div className="doc-care-paralysis">
              {(
                [
                  ['rightUpper', '右上肢', 'leftUpper', '左上肢'],
                  ['rightLower', '右下肢', 'leftLower', '左下肢'],
                ] as const
              ).map(([leftKey, leftLabel, rightKey, rightLabel]) => (
                <div key={leftKey} className="doc-care-paralysis-row">
                  {(
                    [
                      [leftKey, leftLabel],
                      [rightKey, rightLabel],
                    ] as const
                  ).map(([key, label]) => {
                    const row = data.paralysis[key];
                    return (
                      <span key={key} className="doc-check-row">
                        <Check
                          checked={row.checked}
                          label={label}
                          onChange={(checked) =>
                            patch({
                              paralysis: { ...data.paralysis, [key]: { ...row, checked } },
                            })
                          }
                        />
                        （
                        <DegreeChoice
                          value={row.degree}
                          onChange={(degree) =>
                            patch({
                              paralysis: { ...data.paralysis, [key]: { ...row, degree } },
                            })
                          }
                        />
                        ）
                      </span>
                    );
                  })}
                </div>
              ))}
              <div className="doc-care-paralysis-row">
                <span className="doc-check-row">
                  <Check
                    checked={data.paralysis.other.checked}
                    label="その他"
                    onChange={(checked) =>
                      patch({
                        paralysis: {
                          ...data.paralysis,
                          other: { ...data.paralysis.other, checked },
                        },
                      })
                    }
                  />
                  （
                  <DegreeChoice
                    value={data.paralysis.other.degree}
                    onChange={(degree) =>
                      patch({
                        paralysis: {
                          ...data.paralysis,
                          other: { ...data.paralysis.other, degree },
                        },
                      })
                    }
                  />
                  ）
                </span>
              </div>
            </div>
          </div>

          <DegreeLine
            label="筋力の低下"
            row={data.muscleWeakness}
            onChange={(v) => patch({ muscleWeakness: v })}
          />
          <DegreeLine
            label="関節の拘縮"
            row={data.jointContracture}
            onChange={(v) => patch({ jointContracture: v })}
          />
          <DegreeLine
            label="関節の痛み"
            row={data.jointPain}
            onChange={(v) => patch({ jointPain: v })}
          />

          <div className="doc-care-kv">
            <span className="doc-care-kv-key">
              <Check
                checked={data.ataxia.checked}
                label="失調・不随意運動"
                onChange={(checked) => patch({ ataxia: { ...data.ataxia, checked } })}
              />
            </span>
            {(
              [
                ['upper', '・上肢'],
                ['lower', '・下肢'],
                ['trunk', '・体幹'],
              ] as const
            ).map(([key, label]) => (
              <span key={key} className="doc-check-row">
                <span className="doc-inline-label">{label}</span>
                <MultiCheckGroup
                  values={data.ataxia[key]}
                  options={['右', '左']}
                  onChange={(v) => patch({ ataxia: { ...data.ataxia, [key]: v } })}
                />
              </span>
            ))}
          </div>

          <DegreeLine
            label="褥瘡"
            row={data.pressureUlcer}
            onChange={(v) => patch({ pressureUlcer: v })}
          />
          <DegreeLine
            label="その他の皮膚疾患"
            row={data.otherSkinDisease}
            onChange={(v) => patch({ otherSkinDisease: v })}
          />
        </div>
      </div>

      <div className="doc-care-section">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">4</span>
          <span className="doc-care-spine-label">生活機能とサービスに関する意見</span>
        </div>
        <div className="doc-care-body">
          <div className="doc-care-block">
            <p className="doc-care-lead">(1) 移動</p>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">屋外歩行</span>
              <ChoiceGroup
                value={data.outdoorWalking}
                onChange={(v) => patch({ outdoorWalking: v })}
                options={OUTDOOR_WALKING}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">車いすの使用</span>
              <ChoiceGroup
                value={data.wheelchair}
                onChange={(v) => patch({ wheelchair: v })}
                options={WHEELCHAIR}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">歩行補助具・装具の使用（複数選択可）</span>
              <MultiCheckGroup
                values={data.walkingAids}
                options={WALKING_AIDS}
                onChange={(v) => patch({ walkingAids: v })}
              />
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">(2) 栄養・食生活</p>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">食事行為</span>
              <ChoiceGroup
                value={data.eating}
                onChange={(v) => patch({ eating: v })}
                options={EATING}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">現在の栄養状態</span>
              <ChoiceGroup
                value={data.nutritionState}
                onChange={(v) => patch({ nutritionState: v })}
                options={NUTRITION_STATE}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">→栄養・食生活上の留意点</span>
              （
              <EditableInput
                value={data.nutritionNote}
                onChange={(v) => patch({ nutritionNote: v })}
                minSize={40}
              />
              ）
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">
              (3) 現在あるかまたは今後発生の可能性の高い状態とその対処方針
            </p>
            <MultiCheckGroup
              values={data.risks}
              options={RISKS}
              onChange={(v) => patch({ risks: v })}
            />
            <span className="doc-check-row">
              <Check
                checked={data.riskOther.trim() !== ''}
                label="その他"
                onChange={(next) => patch({ riskOther: next ? ' ' : '' })}
              />
              （
              <EditableInput
                value={data.riskOther}
                onChange={(v) => patch({ riskOther: v })}
                minSize={12}
              />
              ）
            </span>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">→対処方針</span>
              （
              <EditableInput
                value={data.riskPolicy}
                onChange={(v) => patch({ riskPolicy: v })}
                minSize={40}
              />
              ）
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-check-row">
              <span className="doc-care-lead">
                (4) サービス利用による生活機能の維持・改善の見通し
              </span>
              <ChoiceGroup
                value={data.serviceOutlook}
                onChange={(v) => patch({ serviceOutlook: v })}
                options={[
                  { value: 'expected', label: '期待できる' },
                  { value: 'notExpected', label: '期待できない' },
                  { value: 'unknown', label: '不明' },
                ]}
              />
            </p>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">
              (5)
              医学的管理の必要性（特に必要性の高いものには下線を引いてください、予防給付により提供されるサービスを含みます。）
            </p>
            <MultiCheckGroup
              values={data.medicalManagement}
              options={MEDICAL_MANAGEMENT}
              onChange={(v) => patch({ medicalManagement: v })}
            />
            <span className="doc-check-row">
              <Check
                checked={data.medicalManagementOther.trim() !== ''}
                label="その他の医療系サービス"
                onChange={(next) => patch({ medicalManagementOther: next ? ' ' : '' })}
              />
              （
              <EditableInput
                value={data.medicalManagementOther}
                onChange={(v) => patch({ medicalManagementOther: v })}
                minSize={20}
              />
              ）
            </span>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">(6) サービス提供時における医学的観点からの留意事項</p>
            <div className="doc-care-precautions">
              {precautionRows.map(({ key, label }) => (
                <span key={key} className="doc-check-row">
                  <span className="doc-inline-label">{label}</span>
                  <Check
                    checked={data.precautions[key].none}
                    label="特になし"
                    onChange={(none) => patchPrecaution(key, { none })}
                  />
                  <Check
                    checked={!data.precautions[key].none && data.precautions[key].detail !== ''}
                    label="あり"
                    onChange={(next) =>
                      patchPrecaution(key, { none: false, detail: next ? ' ' : '' })
                    }
                  />
                  （
                  <EditableInput
                    value={data.precautions[key].detail}
                    onChange={(detail) => patchPrecaution(key, { detail })}
                    minSize={16}
                  />
                  ）
                </span>
              ))}
              <span className="doc-check-row">
                <span className="doc-inline-label">・その他</span>（
                <EditableInput
                  value={data.precautions.other}
                  onChange={(other) => patch({ precautions: { ...data.precautions, other } })}
                  minSize={20}
                />
                ）
              </span>
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">(7) 感染症の有無（有の場合は具体的に記入してください）</p>
            <div className="doc-care-kv">
              <ChoiceGroup
                value={data.infection.state}
                onChange={(state) => patch({ infection: { ...data.infection, state } })}
                options={[
                  { value: 'none', label: '無' },
                  { value: 'present', label: '有' },
                ]}
              />
              （
              <EditableInput
                value={data.infection.detail}
                onChange={(detail) => patch({ infection: { ...data.infection, detail } })}
                minSize={30}
              />
              ）
              <ChoiceGroup
                value={data.infection.state === 'unknown' ? 'unknown' : ''}
                onChange={(v) =>
                  patch({
                    infection: { ...data.infection, state: v === 'unknown' ? 'unknown' : '' },
                  })
                }
                options={[{ value: 'unknown', label: '不明' }]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="doc-care-section doc-care-section-grow">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">5</span>
          <span className="doc-care-spine-label">特記すべき事項</span>
        </div>
        <div className="doc-care-body doc-care-body-grow">
          <p className="doc-care-note">
            要介護認定及び介護サービス計画作成時に必要な医学的な意見等を記載してください。なお、専門医等に別途意見を求めた場合はその内容、結果も記載してください（情報提供書は身体障害者申請診断書の写し等を添付していただいても結構です。）
          </p>
          <EditableText
            value={data.specialNotes}
            onChange={(v) => patch({ specialNotes: v })}
            rows={8}
            className="doc-screen-only-block"
          />
          <div className="doc-print-block doc-field-line">{data.specialNotes}</div>
        </div>
      </div>

      <div className="doc-care-footer">
        <span className="doc-check-row">
          ケアプランの内容を通知する
          <ChoiceGroup
            value={data.notifyCarePlan}
            onChange={(v) => patch({ notifyCarePlan: v })}
            options={[
              { value: 'yes', label: '有' },
              { value: 'no', label: '無' },
            ]}
          />
        </span>
        <span className="doc-check-row">
          認定結果の通知を希望する
          <ChoiceGroup
            value={data.notifyResult}
            onChange={(v) => patch({ notifyResult: v })}
            options={[
              { value: 'yes', label: '有' },
              { value: 'no', label: '無' },
            ]}
          />
        </span>
      </div>
    </div>
  );
}
