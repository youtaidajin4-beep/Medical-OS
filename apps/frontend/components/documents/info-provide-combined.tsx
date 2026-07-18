'use client';

import type { InfoProvideCombinedData } from '@/lib/mock-documents/types';
import { ReferralLetter } from './referral-letter';
import { PrescriptionList } from './prescription-list';

export function InfoProvideCombined({
  data,
  onChange,
}: {
  data: InfoProvideCombinedData;
  onChange: (data: InfoProvideCombinedData) => void;
}) {
  return (
    <div className="doc-page space-y-8">
      <div>
        <h2 className="doc-section-title mb-4 text-center text-lg font-bold">診療情報提供書</h2>
        <ReferralLetter
          data={data.referral}
          onChange={(referral) => onChange({ ...data, referral })}
        />
      </div>
      <div className="doc-page-break" />
      <div>
        <h2 className="doc-section-title mb-4 text-center text-lg font-bold">現在の処方</h2>
        <PrescriptionList
          data={data.prescription}
          onChange={(prescription) => onChange({ ...data, prescription })}
        />
      </div>
    </div>
  );
}
