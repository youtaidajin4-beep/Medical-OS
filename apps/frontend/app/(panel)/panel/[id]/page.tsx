'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ConsultationWorkflow } from '@/components/consultation/consultation-workflow';
import { useUiMode } from '@/components/layout/ui-mode-provider';

export default function PanelConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const { setMode } = useUiMode();

  useEffect(() => {
    setMode('compact');
  }, [setMode]);

  return <ConsultationWorkflow id={id} density="compact" backHref="/panel" />;
}
