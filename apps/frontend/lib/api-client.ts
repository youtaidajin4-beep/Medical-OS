const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export const SINGLE_CLINIC_MODE =
  process.env.NEXT_PUBLIC_SINGLE_CLINIC_MODE === 'true';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function getToken(): string | null {
  if (SINGLE_CLINIC_MODE) return 'single-clinic';
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setToken(token: string) {
  localStorage.setItem('accessToken', token);
}

export function clearToken() {
  localStorage.removeItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const hadToken = !!token;
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401 && hadToken) {
      clearToken();
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const message =
      res.status === 401
        ? hadToken
          ? 'セッションの有効期限が切れました。再度ログインしてください。'
          : 'メールアドレスまたはパスワードが正しくありません'
        : (err.message ?? `Request failed (${res.status})`);
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

async function requestWithNetworkCheck<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await request<T>(path, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'バックエンドに接続できません。ターミナルで `pnpm db:push && pnpm db:seed` の後 `pnpm --filter @medical-os/backend dev` を実行してください。',
      );
    }
    throw error;
  }
}

export const api = {
  health: () => requestWithNetworkCheck<{ status: string; version: string }>('/health'),
  healthAi: () =>
    requestWithNetworkCheck<{
      status: string;
      sttProvider: string;
      llmProvider: string;
      apiKeyConfigured: boolean;
      ffmpegAvailable: boolean;
      whisperModel?: string;
      llmModel?: string;
      warning?: string;
    }>('/health/ai'),
  login: (email: string, password: string) =>
    requestWithNetworkCheck<{
      accessToken: string;
      user: {
        id: string;
        name: string;
        email: string;
        mustChangePassword?: boolean;
      };
    }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () =>
    requestWithNetworkCheck<{
      id: string;
      name: string;
      email: string;
      mustChangePassword?: boolean;
    }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    requestWithNetworkCheck<{ success: boolean }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  patients: () =>
    requestWithNetworkCheck<{
      patients: Array<{
        id: string;
        type: 'patient';
        code: string;
        name: string;
        age: number | null;
        sex: string | null;
        dateOfBirth?: string | null;
        phone?: string | null;
        memo?: string | null;
        visitCount?: number;
      }>;
      anonymousCases: Array<{
        id: string;
        type: 'anonymous';
        code: string;
        name: string;
        age: number | null;
        sex: string | null;
        visitCount?: number;
      }>;
    }>('/patients'),
  createPatient: (data: {
    name: string;
    sex?: string;
    dateOfBirth?: string;
    phone?: string;
    memo?: string;
  }) =>
    requestWithNetworkCheck<{
      id: string;
      type: 'patient';
      code: string;
      name: string;
      age: number | null;
      sex: string | null;
      dateOfBirth?: string | null;
      phone?: string | null;
      memo?: string | null;
      visitCount?: number;
    }>('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (
    id: string,
    data: {
      name?: string;
      sex?: string;
      dateOfBirth?: string;
      phone?: string;
      memo?: string;
    },
  ) =>
    requestWithNetworkCheck<{
      id: string;
      type: 'patient';
      code: string;
      name: string;
      age: number | null;
      sex: string | null;
      dateOfBirth?: string | null;
      phone?: string | null;
      memo?: string | null;
      visitCount?: number;
    }>(`/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  createAnonymousCase: (data: { displayName: string; age?: number; sex?: string }) =>
    requestWithNetworkCheck<{
      id: string;
      type: 'anonymous';
      code: string;
      name: string;
      age: number | null;
      sex: string | null;
      visitCount?: number;
    }>('/patients/anonymous-cases', { method: 'POST', body: JSON.stringify(data) }),
  promoteAnonymousToPatient: (anonymousCaseId: string, name?: string) =>
    requestWithNetworkCheck<{
      id: string;
      type: 'patient';
      code: string;
      name: string;
      visitCount: number;
    }>(`/patients/anonymous-cases/${anonymousCaseId}/promote`, {
      method: 'POST',
      body: JSON.stringify(name ? { name } : {}),
    }),
  createConsultation: (data: { patientId?: string; anonymousCaseId?: string }) =>
    request<{ id: string }>('/consultations', { method: 'POST', body: JSON.stringify(data) }),
  consultations: () =>
    request<
      Array<{
        id: string;
        status: string;
        createdAt: string;
        startedAt?: string | null;
        endedAt?: string | null;
        approvedAt?: string | null;
        copiedAt?: string | null;
        kind?: 'new' | 'repeater';
        visitNumber?: number;
        lane?: 'waiting' | 'done';
        hasDocuments?: boolean;
        patientId?: string | null;
        anonymousCaseId?: string | null;
        patient?: { id?: string; name: string; patientCode: string; memo?: string | null } | null;
        anonymousCase?: { id?: string; displayName: string; caseCode: string } | null;
        soapDocuments?: Array<{ subjective: string; assessment: string }>;
        clinicalNotes?: Array<{ content: string }>;
      }>
    >('/consultations'),
  getConsultation: (id: string) =>
    request<{
      id: string;
      status: string;
      pipelineError?: string;
      hasAudio?: boolean;
      patient?: {
        name: string;
        patientCode: string;
        sex?: string | null;
        dateOfBirth?: string | null;
        phone?: string | null;
        memo?: string | null;
      };
      anonymousCase?: {
        displayName: string;
        caseCode: string;
        age?: number | null;
        sex?: string | null;
      };
      structuredData?: { data: Record<string, unknown> } | null;
      soapDocuments?: Array<{
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
      }>;
      clinicalNotes?: Array<{ content: string }>;
      warnings?: Array<{ id: string; message: string; severity: string }>;
      transcriptSegments?: Array<{ id: string; text: string; speaker: string }>;
      revisions?: Array<{
        id: string;
        fieldName: string;
        beforeValue: string;
        afterValue: string;
        changedAt: string;
        documentType: string;
      }>;
    }>(`/consultations/${id}`),
  startRecording: (id: string) =>
    request(`/consultations/${id}/recording/start`, { method: 'POST' }),
  stopRecording: (id: string) =>
    request(`/consultations/${id}/recording/stop`, { method: 'POST' }),
  reprocessConsultation: (id: string) =>
    request<{ id: string; status: string; hasAudio?: boolean }>(`/consultations/${id}/reprocess`, {
      method: 'POST',
    }),
  resetRecording: (id: string) =>
    request(`/consultations/${id}/recording/reset`, { method: 'POST' }),
  uploadChunk: (consultationId: string, sequenceNumber: number, blob: Blob, checksum?: string) => {
    const form = new FormData();
    form.append('audio', blob, `chunk-${sequenceNumber}.webm`);
    form.append('sequenceNumber', String(sequenceNumber));
    if (checksum) {
      form.append('checksum', checksum);
    }
    return request(`/consultations/${consultationId}/recording/chunks`, {
      method: 'POST',
      body: form,
    });
  },
  uploadFinalRecording: (consultationId: string, blob: Blob, checksum?: string) => {
    const form = new FormData();
    form.append('audio', blob, 'consultation-final.webm');
    form.append('sequenceNumber', '0');
    if (checksum) {
      form.append('checksum', checksum);
    }
    return request(`/consultations/${consultationId}/recording/final`, {
      method: 'POST',
      body: form,
    });
  },
  getTranscript: (consultationId: string, final?: boolean) => {
    const query = final === undefined ? '' : `?final=${final}`;
    return request<Array<{ id: string; text: string; speaker: string }>>(
      `/consultations/${consultationId}/transcript${query}`,
    );
  },
  updateSpeaker: (consultationId: string, segmentId: string, speaker: string) =>
    request(`/consultations/${consultationId}/transcript/segments/${segmentId}/speaker`, {
      method: 'PATCH',
      body: JSON.stringify({ speaker }),
    }),
  saveTranscript: (
    consultationId: string,
    segments: Array<{ id: string; text: string }>,
  ) =>
    request<{
      segments: Array<{ id: string; text: string; speaker: string }>;
      suggestedReplacements: Array<{ wrong: string; correct: string }>;
    }>(`/consultations/${consultationId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({ segments }),
    }),
  updateSoap: (id: string, soap: { subjective: string; objective: string; assessment: string; plan: string }) =>
    request(`/consultations/${id}/soap`, { method: 'PATCH', body: JSON.stringify(soap) }),
  updateNote: (id: string, content: string) =>
    request(`/consultations/${id}/clinical-note`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  approve: (id: string) => request(`/consultations/${id}/approve`, { method: 'POST' }),
  copied: (id: string) => request(`/consultations/${id}/copied`, { method: 'POST' }),
  getDocuments: (consultationId: string) =>
    request<
      Array<{
        id: string;
        type: string;
        content: Record<string, unknown>;
        version: number;
        isAiGenerated: boolean;
        approved: boolean;
        updatedAt: string;
      }>
    >(`/consultations/${consultationId}/documents`),
  generateAllDocuments: (
    consultationId: string,
    options?: { referralPattern?: 'simple' | 'complex' },
  ) =>
    request<
      Array<{
        id: string;
        type: string;
        content: Record<string, unknown>;
        version: number;
      }>
    >(`/consultations/${consultationId}/documents/generate-all`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    }),
  updateDocument: (consultationId: string, type: string, content: Record<string, unknown>) =>
    request(`/consultations/${consultationId}/documents/${type}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  getPhysicianRules: () =>
    request<{
      referralRules: Array<{ trigger: string; mustInclude: string[] }>;
      fixedPhrases: { closing?: string; greeting?: string };
      medicalGlossary?: {
        drugNames: string[];
        diagnoses: string[];
        customReplacements: Array<{ wrong: string; correct: string }>;
      };
    }>('/settings/physician-rules'),
  updatePhysicianRules: (rules: {
    referralRules: Array<{ trigger: string; mustInclude: string[] }>;
    fixedPhrases: { closing?: string; greeting?: string };
    medicalGlossary?: {
      drugNames: string[];
      diagnoses: string[];
      customReplacements: Array<{ wrong: string; correct: string }>;
    };
  }) =>
    request('/settings/physician-rules', {
      method: 'PUT',
      body: JSON.stringify(rules),
    }),
  getSuggestedReplacements: () =>
    request<Array<{ wrong: string; correct: string; count: number }>>(
      '/settings/suggested-replacements',
    ),
  addGlossaryReplacements: (replacements: Array<{ wrong: string; correct: string }>) =>
    request('/settings/medical-glossary/replacements', {
      method: 'POST',
      body: JSON.stringify({ replacements }),
    }),
  listMedicalTerms: (params?: { q?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    const suffix = qs.toString() ? `?${qs}` : '';
    return requestWithNetworkCheck<
      Array<{
        id: string;
        canonicalName: string;
        reading: string | null;
        category: string;
        abbreviation: string | null;
        riskLevel: string;
        aliases: Array<{ alias: string; aliasType: string }>;
      }>
    >(`/medical-knowledge/terms${suffix}`);
  },
  listClinicDictionary: () =>
    requestWithNetworkCheck<
      Array<{ id: string; canonicalName: string; aliases: unknown; frequency: number }>
    >('/medical-knowledge/clinic'),
  listDoctorDictionary: () =>
    requestWithNetworkCheck<
      Array<{
        id: string;
        spokenForm: string;
        preferredWrittenForm: string;
        frequency: number;
      }>
    >('/medical-knowledge/doctor'),
  listMisrecognitions: () =>
    requestWithNetworkCheck<
      Array<{ originalTerm: string | null; correctedTerm: string | null; count: number }>
    >('/medical-knowledge/misrecognitions'),
  listLearningCandidates: () =>
    requestWithNetworkCheck<
      Array<{
        id: string;
        originalTerm: string;
        correctedTerm: string;
        occurrenceCount: number;
        status: string;
      }>
    >('/medical-knowledge/learning-candidates'),
  approveLearningCandidate: (id: string) =>
    requestWithNetworkCheck<{ ok: boolean }>(`/medical-knowledge/learning-candidates/${id}/approve`, {
      method: 'POST',
    }),
  getConsultationKnowledge: (consultationId: string) =>
    requestWithNetworkCheck<{
      rawText: string;
      correctedText: string;
      entities: Array<{
        id: string;
        entityType: string;
        rawValue: string;
        normalizedValue: string | null;
        confidence: number | null;
        needsReview: boolean;
        riskLevel: string;
        candidates: Array<{ candidateValue: string; score: number; candidateSource: string }>;
      }>;
      corrections: Array<{
        id: string;
        originalTerm: string | null;
        correctedTerm: string | null;
        confidence: number | null;
        correctionSource: string;
        approvedByDoctor: boolean;
      }>;
      metrics: {
        automaticCorrectionCount: number;
        reviewRequiredCount: number;
        criticalMedicalErrorCount: number;
      } | null;
    }>(`/medical-knowledge/consultations/${consultationId}`),
  approveDoctorCorrection: (body: {
    consultationId: string;
    originalTerm: string;
    correctedTerm: string;
    category?: string;
  }) =>
    requestWithNetworkCheck('/medical-knowledge/doctor-corrections', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  listChat: (consultationId: string) =>
    request<Array<{ id: string; role: string; content: string; createdAt: string }>>(
      `/consultations/${consultationId}/chat`,
    ),
  transcribeChatAudio: (consultationId: string, blob: Blob) => {
    const form = new FormData();
    form.append('audio', blob, 'chat-voice.webm');
    return request<{ text: string }>(`/consultations/${consultationId}/chat/transcribe`, {
      method: 'POST',
      body: form,
    });
  },
  askChat: (consultationId: string, content: string) =>
    request<{
      message: { id: string; role: string; content: string; createdAt?: string };
      soap?: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
      };
      note?: string;
      documents?: Array<{
        id?: string;
        type: string;
        content: Record<string, unknown>;
        version?: number;
      }>;
      documentGenerationError?: string;
    }>(`/consultations/${consultationId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  listAttachments: (consultationId: string) =>
    request<
      Array<{
        id: string;
        fileName: string;
        mimeType: string;
        ocrText: string | null;
        documentKind: string;
        createdAt: string;
      }>
    >(`/consultations/${consultationId}/attachments`),
  uploadAttachment: async (consultationId: string, file: File, documentKind = 'other') => {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    form.append('documentKind', documentKind);
    const res = await fetch(`${API_URL}/api/v1/consultations/${consultationId}/attachments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(err.message ?? `Upload failed (${res.status})`, res.status);
    }
    return res.json() as Promise<{
      id: string;
      fileName: string;
      ocrText: string | null;
      documentKind?: string;
    }>;
  },
  applyQuestionnaire: (consultationId: string, attachmentId: string) =>
    request<{
      attachmentId: string;
      ocrText: string;
      soap: { subjective: string; objective: string; assessment: string; plan: string } | null;
      patientMemo: string | null;
    }>(`/consultations/${consultationId}/attachments/${attachmentId}/apply-questionnaire`, {
      method: 'POST',
    }),
  getTimeline: (consultationId: string) =>
    request<{
      current: {
        id: string;
        label?: string | null;
        soap: { assessment: string } | null;
        documents: Array<{ type: string }>;
        attachments: Array<{
          id: string;
          fileName: string;
          mimeType: string;
          ocrText: string | null;
          documentKind: string;
          createdAt: string;
        }>;
      };
      history: Array<{
        id: string;
        createdAt: string;
        status: string;
        assessment: string | null;
        documentCount: number;
        attachmentCount: number;
      }>;
    }>(`/consultations/${consultationId}/timeline`),
};
