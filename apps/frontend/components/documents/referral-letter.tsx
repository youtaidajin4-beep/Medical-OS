'use client';

import { CLINIC_CONFIG } from '@/lib/clinic-config';
import type { ReferralLetterData } from '@/lib/mock-documents/types';
import { EditableInput, EditableText } from './editable-field';

type Props = {
  data: ReferralLetterData;
  onChange: (data: ReferralLetterData) => void;
};

/**
 * 診療情報提供書。紙の雛形（谷口先生から 2026-09-19 に受領した現物）の並びをそのまま写している。
 *
 * 欄の出どころは3つ:
 * - 紹介元・【検査結果】・【治療経過】… 毎回同じ（バックエンドの referral-template.ts が固定文を入れる）
 * - 発行日・患者欄 … 診療データと問診票から自動で埋まる
 * - 宛先・【傷病名】【紹介目的】【既往歴及び家族歴】【現在の処方】【備考】… 先生のチャットの内容
 *
 * どの欄も画面ではそのまま直せる（印刷前の最後の手直し）。
 */

function Section({
  title,
  value,
  onChange,
  rows = 2,
  className,
  placeholder,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={`doc-referral-section ${className ?? ''}`}>
      <p className="doc-section-title">【{title}】</p>
      {/* 画面では直せる欄。印刷は textarea だと高さで切れるので、下のテキストへ差し替える */}
      <EditableText
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="doc-screen-only-block"
      />
      <div className="doc-print-block doc-field-line">{value}</div>
    </div>
  );
}

export function ReferralLetter({ data, onChange }: Props) {
  const patch = (partial: Partial<ReferralLetterData>) => onChange({ ...data, ...partial });

  return (
    <div className="doc-page doc-page-referral">
      <p className="doc-right doc-referral-date">
        <EditableInput value={data.issuedDate} onChange={(v) => patch({ issuedDate: v })} />
      </p>
      <h1 className="doc-title">診療情報提供書</h1>

      <div className="doc-referral-head">
        <div className="doc-referral-to">
          <p>
            紹介先医療機関名：
            <EditableInput
              value={data.recipientHospital}
              onChange={(v) => patch({ recipientHospital: v })}
              placeholder="◯◯病院"
              className="doc-edit-wide"
            />
          </p>
          <p className="doc-referral-to-doctor">
            <EditableInput
              value={data.recipientDepartment}
              onChange={(v) => patch({ recipientDepartment: v })}
              placeholder="◯◯科"
            />
            　
            <EditableInput
              value={data.recipientDoctor}
              onChange={(v) => patch({ recipientDoctor: v })}
              placeholder="◯◯"
            />
            　先生　御机下
          </p>
        </div>
        <div className="doc-referral-from doc-right">
          <p>紹介元医療機関の所在地：{CLINIC_CONFIG.address}</p>
          <p>名称：{CLINIC_CONFIG.legalName}</p>
          <p>
            電話番号：{CLINIC_CONFIG.telPlain}　FAX：{CLINIC_CONFIG.faxPlain}
          </p>
          <p>診療科名：{CLINIC_CONFIG.department}</p>
          <p>医師氏名：{CLINIC_CONFIG.physicianName}　　印</p>
        </div>
      </div>

      <div className="doc-referral-patient">
        <p className="doc-referral-patient-row">
          <span>
            患者氏名：
            <EditableInput value={data.patientName} onChange={(v) => patch({ patientName: v })} />
            （
            <EditableInput
              value={data.patientNameKana}
              onChange={(v) => patch({ patientNameKana: v })}
            />
            ）様
          </span>
          <span>
            性別：<EditableInput value={data.sex} onChange={(v) => patch({ sex: v })} />
          </span>
        </p>
        <p>
          患者住所：〒
          <EditableInput value={data.postalCode} onChange={(v) => patch({ postalCode: v })} />
          　
          <EditableInput
            value={data.address}
            onChange={(v) => patch({ address: v })}
            className="doc-edit-wide"
          />
        </p>
        <p>
          電話番号：
          <EditableInput value={data.phone} onChange={(v) => patch({ phone: v })} />
        </p>
        <p className="doc-referral-patient-row">
          <span>
            生年月日：
            <EditableInput value={data.dateOfBirth} onChange={(v) => patch({ dateOfBirth: v })} />
            （{data.age ?? '　'} 歳）
          </span>
          <span>
            職業：
            <EditableInput value={data.occupation} onChange={(v) => patch({ occupation: v })} />
          </span>
        </p>
      </div>

      <div className="doc-referral-body">
        <Section
          title="傷病名"
          value={data.diagnosis}
          onChange={(v) => patch({ diagnosis: v })}
          rows={2}
          placeholder="正式な病名（先生のチャットから入ります）"
        />
        <Section
          title="紹介目的"
          value={data.purpose}
          onChange={(v) => patch({ purpose: v })}
          rows={2}
        />
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
          rows={1}
        />
        <Section
          title="治療経過"
          value={data.clinicalCourse}
          onChange={(v) => patch({ clinicalCourse: v })}
          rows={2}
        />
        <Section
          title="現在の処方"
          value={data.currentPrescription}
          onChange={(v) => patch({ currentPrescription: v })}
          rows={8}
          className="doc-referral-section-grow"
          placeholder="1行1剤（先生のチャットから入ります）"
        />
        <Section title="備考" value={data.remarks} onChange={(v) => patch({ remarks: v })} rows={1} />
      </div>
    </div>
  );
}
