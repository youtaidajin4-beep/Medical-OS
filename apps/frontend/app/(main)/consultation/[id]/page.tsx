'use client';

import { useParams } from 'next/navigation';
import { ConsultationWorkflow } from '@/components/consultation/consultation-workflow';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  return <ConsultationWorkflow id={id} density="full" backHref="/home" />;
}
