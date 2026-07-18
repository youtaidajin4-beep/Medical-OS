export type HealthStatus = 'ok' | 'degraded' | 'error' | 'not_configured';

export interface HealthResponse {
  status: HealthStatus;
  version: string;
  timestamp: string;
  service: string;
}

export interface DatabaseHealthResponse extends HealthResponse {
  database: 'connected' | 'disconnected';
}

export interface SubsystemHealthResponse extends HealthResponse {
  subsystem: string;
}

export type ConsultationStatus =
  | 'draft'
  | 'recording'
  | 'processing'
  | 'review'
  | 'approved'
  | 'completed';

export type SpeakerLabel = 'physician' | 'patient' | 'other' | 'unknown';

export interface ClinicalWarning {
  id: string;
  category: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SoapDocument {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface StructuredClinicalData {
  chiefComplaint?: string;
  presentIllness?: string;
  pastHistory?: string;
  medications?: string[];
  allergies?: string[];
  vitals?: string;
  physicalExam?: string;
  assessment?: string;
  plan?: string;
  warnings?: ClinicalWarning[];
}
