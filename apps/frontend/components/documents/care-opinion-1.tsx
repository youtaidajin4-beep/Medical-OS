'use client';

import type { CareOpinion1Data } from '@/lib/mock-documents/types';
import {
  ADL_LEVELS,
  COMMUNICATION_ABILITY,
  DECISION_CAPACITY,
  DEMENTIA_LEVELS,
  INCONTINENCE_RESPONSES,
  OTHER_DEPARTMENTS,
  PERIPHERAL_SYMPTOMS,
  PROCEDURES,
  SHORT_TERM_MEMORY,
  SPECIAL_RESPONSES,
} from '@/lib/mock-documents/care-opinion-options';
import { EditableInput, EditableText } from './editable-field';
import { Check, ChoiceGroup, MultiCheckGroup } from './form-controls';

/**
 * 主治医意見書①（表）。紙の様式をそのまま写している。
 *
 * 左の縦帯（1 傷病に関する意見 / 2 特別な医療 / 3 心身の状態に関する意見）と
 * 見出しのグレー、枠線の太さまで様式に合わせてある。□はクリックで入る。
 *
 * 出どころ:
 * - 市町村コード・医師番号・医療機関の情報 … 毎回同じ（clinic-config）
 * - 申請日・記入日・最終診察日 … 作成日
 * - 申請者欄 … 患者情報と問診票
 * - 1(1)(2)(3)・2・3 … SOAP と先生のチャット、問診票
 */
type Props = {
  data: CareOpinion1Data;
  onChange: (data: CareOpinion1Data) => void;
};

export function CareOpinion1({ data, onChange }: Props) {
  const patch = (partial: Partial<CareOpinion1Data>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page doc-page-care1">
      <h1 className="doc-title doc-care-title">主治医意見書①</h1>

      <div className="doc-care-header">
        <div className="doc-care-header-left">
          <p>
            <span className="doc-care-key">市町村コード</span>
            <EditableInput
              value={data.municipalityCode}
              onChange={(v) => patch({ municipalityCode: v })}
            />
          </p>
          <p>
            <span className="doc-care-key">管理市町村コード</span>
            <EditableInput
              value={data.supervisorMunicipalityCode}
              onChange={(v) => patch({ supervisorMunicipalityCode: v })}
            />
          </p>
          <p>
            <span className="doc-care-key">申請日</span>
            <EditableInput
              value={data.applicationDate}
              onChange={(v) => patch({ applicationDate: v })}
            />
          </p>
        </div>
        <div className="doc-care-header-mid">
          <p>
            被保険者番号
            <EditableInput
              value={data.insuredNumber}
              onChange={(v) => patch({ insuredNumber: v })}
              minSize={14}
            />
          </p>
        </div>
        <div className="doc-care-header-right">
          <p>
            調査回数
            <EditableInput
              value={data.surveyCount}
              onChange={(v) => patch({ surveyCount: v })}
              minSize={4}
            />
            回
          </p>
          <p>
            医師番号
            <EditableInput
              value={data.doctorNumber}
              onChange={(v) => patch({ doctorNumber: v })}
              minSize={12}
            />
          </p>
          <p>
            記入日
            <EditableInput value={data.entryDate} onChange={(v) => patch({ entryDate: v })} />
          </p>
        </div>
      </div>

      <table className="doc-care-table">
        <tbody>
          <tr>
            <th className="doc-care-th doc-care-th-wide" rowSpan={3}>
              申請者
            </th>
            <td className="doc-care-kana">
              <span className="doc-inline-label">(フリガナ)</span>
              <EditableInput
                value={data.patientNameKana}
                onChange={(v) => patch({ patientNameKana: v })}
                minSize={20}
              />
            </td>
            <td rowSpan={2} className="doc-care-blank" />
            <td rowSpan={3} className="doc-care-contact">
              連絡先
              <EditableInput value={data.contact} onChange={(v) => patch({ contact: v })} />
            </td>
          </tr>
          <tr>
            <td>
              <EditableInput
                value={data.patientName}
                onChange={(v) => patch({ patientName: v })}
                minSize={20}
              />
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <EditableInput
                value={data.dateOfBirth}
                onChange={(v) => patch({ dateOfBirth: v })}
                minSize={18}
              />
              <span className="doc-care-age">（{data.age ?? '　'} 歳）</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="doc-care-consent">
        <p>上記申請に関する意見は以下の通りです。</p>
        <p className="doc-check-row">
          主治医として、本意見書が介護サービス計画作成に利用されることに
          <ChoiceGroup
            value={data.consent}
            onChange={(v) => patch({ consent: v })}
            options={[
              { value: 'agree', label: '同意する' },
              { value: 'disagree', label: '同意しない' },
            ]}
          />
        </p>
        <div className="doc-care-clinic">
          <p>
            <span className="doc-care-key">医師氏名</span>
            <EditableInput
              value={data.physicianName}
              onChange={(v) => patch({ physicianName: v })}
              minSize={16}
            />
          </p>
          <p>
            <span className="doc-care-key">医療機関名</span>
            <EditableInput
              value={data.clinicName}
              onChange={(v) => patch({ clinicName: v })}
              minSize={30}
            />
            <span className="doc-care-tel">
              電話
              <EditableInput value={data.clinicTel} onChange={(v) => patch({ clinicTel: v })} />
            </span>
          </p>
          <p>
            <span className="doc-care-key">医療機関所在地</span>
            <EditableInput
              value={data.clinicAddress}
              onChange={(v) => patch({ clinicAddress: v })}
              minSize={30}
            />
            <span className="doc-care-tel">
              FAX
              <EditableInput value={data.clinicFax} onChange={(v) => patch({ clinicFax: v })} />
            </span>
          </p>
        </div>
      </div>

      <table className="doc-care-table">
        <tbody>
          <tr>
            <th className="doc-care-th">(1) 最終診察日</th>
            <td>
              <EditableInput
                value={data.lastExamDate}
                onChange={(v) => patch({ lastExamDate: v })}
                minSize={18}
              />
            </td>
            <th className="doc-care-th">(2) 意見書作成回数</th>
            <td>
              <ChoiceGroup
                value={data.opinionCount}
                onChange={(v) => patch({ opinionCount: v })}
                options={[
                  { value: 'first', label: '初回' },
                  { value: 'repeat', label: '2回目以上' },
                ]}
              />
            </td>
          </tr>
          <tr>
            <th className="doc-care-th">
              (3) 他科受診
              <br />
              の有無
            </th>
            <td className="doc-care-narrow">
              <ChoiceGroup
                value={data.otherDepartmentVisit}
                onChange={(v) => patch({ otherDepartmentVisit: v })}
                options={[
                  { value: 'yes', label: '有' },
                  { value: 'no', label: '無' },
                ]}
                className="doc-check-col"
              />
            </td>
            <td colSpan={2}>
              <span className="doc-inline-label">有の場合</span>
              <MultiCheckGroup
                values={data.otherDepartments}
                options={OTHER_DEPARTMENTS}
                onChange={(v) => patch({ otherDepartments: v })}
              />
              <span className="doc-check-row">
                <Check
                  checked={data.otherDepartmentOther.trim() !== ''}
                  label="その他"
                  onChange={(next) => patch({ otherDepartmentOther: next ? ' ' : '' })}
                />
                （
                <EditableInput
                  value={data.otherDepartmentOther}
                  onChange={(v) => patch({ otherDepartmentOther: v })}
                  minSize={10}
                />
                ）
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 紙では(3)の欄が一番大きい。余った高さはここが吸う */}
      <div className="doc-care-section doc-care-section-grow">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">1</span>
          <span className="doc-care-spine-label">傷病に関する意見</span>
        </div>
        <div className="doc-care-body">
          <div className="doc-care-block">
            <p className="doc-care-lead">
              (1) 診断名（特定疾病または生活機能低下の直接の原因となっている傷病名については 1.
              に記入）及び発症年月日
            </p>
            {data.diagnoses.map((d, i) => (
              <p key={i} className="doc-care-dx">
                <span className="doc-care-dx-no">{i + 1}.</span>
                <EditableInput
                  value={d.name}
                  onChange={(v) =>
                    patch({
                      diagnoses: data.diagnoses.map((x, xi) =>
                        xi === i ? { ...x, name: v } : x,
                      ),
                    })
                  }
                  minSize={28}
                />
                <span className="doc-care-onset">
                  発症年月日（
                  <EditableInput
                    value={d.onsetDate}
                    onChange={(v) =>
                      patch({
                        diagnoses: data.diagnoses.map((x, xi) =>
                          xi === i ? { ...x, onsetDate: v } : x,
                        ),
                      })
                    }
                    minSize={16}
                  />
                  　頃）
                </span>
              </p>
            ))}
          </div>

          <div className="doc-care-block">
            <p className="doc-check-row">
              <span className="doc-care-lead">(2) 症状としての安定性</span>
              <ChoiceGroup
                value={data.stability}
                onChange={(v) => patch({ stability: v })}
                options={[
                  { value: 'stable', label: '安定' },
                  { value: 'unstable', label: '不安定' },
                  { value: 'unknown', label: '不明' },
                ]}
              />
            </p>
            <p className="doc-care-note">（「不安定」とした場合、具体的な状況を記入）</p>
            <EditableText
              value={data.instabilityDetail}
              onChange={(v) => patch({ instabilityDetail: v })}
              rows={2}
              className="doc-screen-only-block"
            />
            <div className="doc-print-block doc-field-line">{data.instabilityDetail}</div>
          </div>

          <div className="doc-care-block doc-care-block-grow">
            <p className="doc-care-lead">
              (3)
              生活機能低下の直接の原因となっている傷病または特定疾病の経過及び投薬内容を含む治療内容
            </p>
            <p className="doc-care-note">
              ［最近（概ね 6 ヶ月以内）介護に影響のあったもの及び特定疾病についてはその診断の根拠について記入］
            </p>
            <EditableText
              value={data.courseAndTreatment}
              onChange={(v) => patch({ courseAndTreatment: v })}
              rows={6}
              className="doc-screen-only-block"
            />
            <div className="doc-print-block doc-field-line">{data.courseAndTreatment}</div>
          </div>
        </div>
      </div>

      <div className="doc-care-section">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">2</span>
          <span className="doc-care-spine-label">特別な医療</span>
        </div>
        <div className="doc-care-body">
          <p className="doc-care-lead">（過去 14 日間以内に受けた医療のすべてにチェック）</p>
          <div className="doc-care-kv">
            <span className="doc-care-kv-key">処置内容</span>
            <MultiCheckGroup
              values={data.procedures}
              options={PROCEDURES}
              onChange={(v) => patch({ procedures: v })}
            />
          </div>
          <div className="doc-care-kv">
            <span className="doc-care-kv-key">特別な対応</span>
            <MultiCheckGroup
              values={data.specialResponses}
              options={SPECIAL_RESPONSES}
              onChange={(v) => patch({ specialResponses: v })}
            />
          </div>
          <div className="doc-care-kv">
            <span className="doc-care-kv-key">失禁への対応</span>
            <MultiCheckGroup
              values={data.incontinenceResponses}
              options={INCONTINENCE_RESPONSES}
              onChange={(v) => patch({ incontinenceResponses: v })}
            />
          </div>
        </div>
      </div>

      <div className="doc-care-section">
        <div className="doc-care-spine">
          <span className="doc-care-spine-num">3</span>
          <span className="doc-care-spine-label">心身の状態に関する意見</span>
        </div>
        <div className="doc-care-body">
          <div className="doc-care-block">
            <p className="doc-care-lead">(1) 日常生活の自立度等について</p>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">
                ・障害高齢者の日常生活自立度
                <br />
                　（寝たきり度）
              </span>
              <ChoiceGroup
                value={data.adlLevel}
                onChange={(v) => patch({ adlLevel: v })}
                options={ADL_LEVELS}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">・認知症高齢者の日常生活自立度</span>
              <ChoiceGroup
                value={data.dementiaLevel}
                onChange={(v) => patch({ dementiaLevel: v })}
                options={DEMENTIA_LEVELS}
              />
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">
              (2) 認知症の中核症状（認知症以外の疾病で同様の症状を認める場合を含む）
            </p>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">・短期記憶</span>
              <ChoiceGroup
                value={data.shortTermMemory}
                onChange={(v) => patch({ shortTermMemory: v })}
                options={SHORT_TERM_MEMORY}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">
                ・日常の意思決定を
                <br />
                　行うための認知能力
              </span>
              <ChoiceGroup
                value={data.decisionCapacity}
                onChange={(v) => patch({ decisionCapacity: v })}
                options={DECISION_CAPACITY}
              />
            </div>
            <div className="doc-care-kv">
              <span className="doc-care-kv-key">・自分の意志の伝達能力</span>
              <ChoiceGroup
                value={data.communicationAbility}
                onChange={(v) => patch({ communicationAbility: v })}
                options={COMMUNICATION_ABILITY}
              />
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">
              (3)
              認知症の周辺症状（該当する項目全てチェック：認知症以外の疾患で同様の症状を認める場合を含む）
            </p>
            <div className="doc-care-kv">
              <ChoiceGroup
                value={data.peripheralPresence}
                onChange={(v) => patch({ peripheralPresence: v })}
                options={[
                  { value: 'none', label: '無' },
                  { value: 'present', label: '有' },
                ]}
              />
              <span className="doc-care-arrow">→</span>
              <MultiCheckGroup
                values={data.peripheralSymptoms}
                options={PERIPHERAL_SYMPTOMS}
                onChange={(v) => patch({ peripheralSymptoms: v })}
              />
              <span className="doc-check-row">
                <Check
                  checked={data.peripheralOther.trim() !== ''}
                  label="その他"
                  onChange={(next) => patch({ peripheralOther: next ? ' ' : '' })}
                />
                （
                <EditableInput
                  value={data.peripheralOther}
                  onChange={(v) => patch({ peripheralOther: v })}
                  minSize={10}
                />
                ）
              </span>
            </div>
          </div>

          <div className="doc-care-block">
            <p className="doc-care-lead">(4) その他の精神・神経症状</p>
            <div className="doc-care-kv">
              <ChoiceGroup
                value={data.psychSymptomPresence}
                onChange={(v) => patch({ psychSymptomPresence: v })}
                options={[
                  { value: 'none', label: '無' },
                  { value: 'present', label: '有' },
                ]}
              />
              <span className="doc-inline-label">〔症状名:</span>
              <EditableInput
                value={data.psychSymptomName}
                onChange={(v) => patch({ psychSymptomName: v })}
                minSize={16}
              />
              <span className="doc-inline-label">専門医受診の有無</span>
              <ChoiceGroup
                value={data.specialistVisit}
                onChange={(v) => patch({ specialistVisit: v })}
                options={[
                  { value: 'yes', label: '有' },
                  { value: 'no', label: '無' },
                ]}
              />
              （
              <EditableInput
                value={data.specialistDetail}
                onChange={(v) => patch({ specialistDetail: v })}
                minSize={12}
              />
              ）〕
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
