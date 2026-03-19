const BASE = (import.meta.env as Record<string, string>).VITE_API_URL ?? 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Export the resume as a PDF via the backend.
 * The file is downloaded as a blob, which triggers the browser's native
 * download notification bar (unlike window.print which saves silently).
 */
export async function exportToPDF(sections: object, template: string = 'classic', filename = 'resume') {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/export/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sections, template }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof err.detail === 'object' ? err.detail.message : err.detail;
    throw Object.assign(new Error(detail ?? 'Export failed'), { status: res.status });
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
