// In production (Vercel), VITE_API_URL is empty — requests go to /api/* on the
// same origin and Vercel's rewrite rule proxies them to the Oracle backend.
// In local dev, set VITE_API_URL=http://localhost:8000 in .env.local
const BASE = import.meta.env.VITE_API_URL ?? '';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === 'object' ? err.detail.message : err.detail;
    throw Object.assign(new Error(detail ?? 'Request failed'), { status: res.status, data: err.detail });
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  auth_provider: string;
  profile_photo_url: string | null;
  free_downloads_used: number;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_expiry: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const api = {
  auth: {
    register: (email: string, password: string, name: string) =>
      request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    googleCallback: (code: string) =>
      request<AuthResponse>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    me: () => request<AuthUser>('/api/auth/me'),
  },

  recordDownload: () =>
    request<{ ok: boolean; free_downloads_used: number; subscription_status: string }>(
      '/api/record-download',
      { method: 'POST' },
    ),

  payments: {
    getPlans: () =>
      request<{ plans: Plan[]; free_download_limit: number }>('/api/payments/plans'),

    createOrder: (plan: string, return_url: string) =>
      request<CreateOrderResponse>('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ plan, return_url }),
      }),

    verify: (order_id: string) =>
      request<{ status: string; plan: string; type: string }>(`/api/payments/verify?order_id=${order_id}`, {
        method: 'POST',
      }),
  },

  // ─── AI Integration ────────────────────────────────────────────────────────
  
  uploadResume: async (file: File) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${BASE}/api/upload-resume`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload resume');
    return res.json() as Promise<{ message: string; resume_id: number }>;
  },

  parseResume: (resumeId: number) =>
    request<{ sections: any }>(`/api/parse-resume/${resumeId}`, { method: 'POST' }),

  getAtsScore: (resumeId: number, jobDescription: string) =>
    request<{ score: number; recommendations: string[]; keywords_found: string[]; keywords_missing: string[]; matched: string[]; missing: string[] }>('/api/ats-score', {
      method: 'POST',
      body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription }),
    }),

  generateResume: (resumeId: number, jobDescription: string, template: string = 'classic') =>
    request<{ generated_id: number; sections: any; ats_score: number; template: string }>('/api/generate-resume', {
      method: 'POST',
      body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription, template }),
    }),

  chat: (resumeId: number, message: string, jobDescription?: string) =>
    request<{ reply: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ resume_id: resumeId, message, job_description: jobDescription }),
    }),

  rewriteText: (text: string, instruction: string, context?: string) =>
    request<{ result: string }>('/api/ai/rewrite', {
      method: 'POST',
      body: JSON.stringify({ text, instruction, context: context ?? '' }),
    }),
};

export interface Plan {
  id: string;
  label: string;
  amount: number;
  currency: string;
  type: string;
}

export interface CreateOrderResponse {
  order_id: string;
  payment_session_id: string;
  amount: number;
  currency: string;
}
