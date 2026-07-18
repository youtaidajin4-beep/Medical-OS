const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
    requestWithNetworkCheck<{ accessToken: string; user: { id: string; name: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  me: () => requestWithNetworkCheck<{ id: string; name: string; email: string }>('/auth/me'),
  patients: () =>
    requestWithNetworkCheck<{
      patients: Array<{
        id: string;
        type: 'patient';
        code: string;
        name: string;
        age: number | null;
        sex: string | null;
        memo?: string | null;
      }>;
      anonymousCases: Array<{
        id: string;
        type: 'anonymous';
        code: string;
        name: string;
        age: number | null;
        sex: string | null;
      }>;
    }>('/patients'),
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
        patient?: { name: string; patientCode: string; memo?: string | null } | null;
        anonymousCase?: { displayName: string; caseCode: string } | null;
        soapDocuments?: Array<{ subjective: string; assessment: string }>;
        clinicalNotes?: Array<{ content: string }>;
      }>
    >('/consultations'),
  getConsultation: (id: string) =>
    request<{
      id: string;
      status: string;
      pipelineError?: string;
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
  generateAllDocuments: (consultationId: string) =>
    request<
      Array<{
        id: string;
        type: string;
        content: Record<string, unknown>;
        version: number;
      }>
    >(`/consultations/${consultationId}/documents/generate-all`, { method: 'POST' }),
  updateDocument: (consultationId: string, type: string, content: Record<string, unknown>) =>
    request(`/consultations/${consultationId}/documents/${type}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  getPhysicianRules: () =>
    request<{
      referralRules: Array<{ trigger: string; mustInclude: string[] }>;
      fixedPhrases: { closing?: string; greeting?: string };
    }>('/settings/physician-rules'),
  updatePhysicianRules: (rules: {
    referralRules: Array<{ trigger: string; mustInclude: string[] }>;
    fixedPhrases: { closing?: string; greeting?: string };
  }) =>
    request('/settings/physician-rules', {
      method: 'PUT',
      body: JSON.stringify(rules),
    }),
};
