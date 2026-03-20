import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

interface ResumeItem { id: number; filename: string; }

type Tone = 'professional' | 'enthusiastic' | 'concise';

const TONE_OPTIONS: { value: Tone; label: string; desc: string }[] = [
  { value: 'professional', label: 'Professional', desc: 'Formal and polished' },
  { value: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic and passionate' },
  { value: 'concise', label: 'Concise', desc: 'Brief and direct' },
];

export default function CoverLetterPage() {
  const { user } = useAuth();

  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumeId, setResumeId] = useState<number | ''>('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<Tone>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listResumes().then(d => setResumes(d.items ?? [])).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!resumeId) { setError('Select a resume first.'); return; }
    if (!jobDescription.trim()) { setError('Paste a job description.'); return; }
    setError('');
    setResult('');
    setLoading(true);
    try {
      const data = await api.generateCoverLetter(Number(resumeId), jobDescription, company, tone);
      setResult(data.cover_letter ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
    border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14,
    outline: 'none', color: '#1e293b', background: '#fff',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6366f1, #818cf8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>R</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Resume Builder</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <Link to="/editor" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>← Editor</Link>
          {user && <span style={{ color: '#94a3b8' }}>{user.name || user.email}</span>}
        </div>
      </header>

      {/* Body */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Cover Letter Generator</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Generate a tailored cover letter from your resume + job description in seconds.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left: inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={labelStyle}>Resume</label>
              <select
                value={resumeId}
                onChange={e => setResumeId(Number(e.target.value) || '')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select a resume…</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.filename}</option>
                ))}
              </select>
              {resumes.length === 0 && (
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                  <Link to="/editor" style={{ color: '#6366f1' }}>Import a PDF resume</Link> first to see it here.
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Company name</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, Acme Corp"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tone</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TONE_OPTIONS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    style={{
                      flex: 1, padding: '9px 8px', borderRadius: 10, cursor: 'pointer',
                      border: tone === t.value ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      background: tone === t.value ? '#eef2ff' : '#fff',
                      color: tone === t.value ? '#4338ca' : '#64748b',
                      fontWeight: tone === t.value ? 700 : 500,
                      fontSize: 12, textAlign: 'center' as const, transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 1 }}>{t.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Job description</label>
              <textarea
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={9}
                style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                padding: '12px 24px', borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #818cf8)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Generating…
                </>
              ) : '✨ Generate Cover Letter'}
            </button>
          </div>

          {/* Right: result */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={labelStyle}>Your cover letter</label>
              {result && (
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '5px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                    background: copied ? '#f0fdf4' : '#fff', color: copied ? '#16a34a' : '#475569',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <textarea
              readOnly
              value={result}
              placeholder="Your generated cover letter will appear here…"
              style={{
                ...inputStyle, flex: 1, minHeight: 480, resize: 'none' as const,
                background: result ? '#fff' : '#f8fafc',
                color: result ? '#1e293b' : '#94a3b8',
                lineHeight: 1.7, fontSize: 13,
              }}
            />
            {result && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Review and personalize before sending. AI-generated content may need light editing.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
