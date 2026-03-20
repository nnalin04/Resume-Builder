const BASE = (import.meta.env as Record<string, string>).VITE_API_URL ?? '';

async function _postExport(endpoint: string, body: object, filename: string, _mime: string): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${endpoint}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === 'object' ? err.detail.message : err.detail;
    throw Object.assign(new Error(detail ?? 'Export failed'), { status: res.status });
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/** Export the resume as a PDF via the backend (freemium-gated). */
export async function exportToPDF(sections: object, template: string = 'classic', filename = 'resume') {
  await _postExport(
    '/api/export/generate',
    { sections, template },
    `${filename}.pdf`,
    'application/pdf',
  );
}

/** Export the resume as an ATS-safe DOCX — always free, no paywall. */
export async function exportToDOCX(sections: object, filename = 'resume') {
  await _postExport(
    '/api/export/generate-docx',
    { sections },
    `${filename}.docx`,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
}
