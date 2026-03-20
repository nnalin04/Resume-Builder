import { useState } from 'react';
import type { TemplateId } from '../types/resumeTypes';

interface Props {
  onComplete: (templateId: TemplateId, file?: File, targetRole?: string) => void;
}

const TEMPLATE_OPTIONS: { id: TemplateId; label: string; color: string }[] = [
  { id: 'classic',      label: 'Classic',      color: '#1a1a2e' },
  { id: 'modern',       label: 'Modern',       color: '#0070f3' },
  { id: 'professional', label: 'Professional', color: '#6366f1' },
  { id: 'twocolumn',    label: 'Two Column',   color: '#059669' },
  { id: 'clean',        label: 'Clean',        color: '#64748b' },
  { id: 'minimal',      label: 'Minimal',      color: '#9ca3af' },
  { id: 'executive',    label: 'Executive',    color: '#1e2d4e' },
  { id: 'tech',         label: 'Tech',         color: '#0d9488' },
  { id: 'finance',      label: 'Finance',      color: '#1a2744' },
  { id: 'creative',     label: 'Creative',     color: '#e05c5c' },
];

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [targetRole, setTargetRole] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('modern');

  const dismiss = (template = selectedTemplate) => {
    localStorage.setItem('resume_onboarding_done', '1');
    onComplete(template, selectedFile, targetRole);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); setStep(2); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20,
        width: '90%', maxWidth: step === 3 ? 660 : 460,
        padding: '36px 32px 28px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.22)',
        position: 'relative',
      }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              height: 4, flex: 1, borderRadius: 4,
              background: n <= step ? '#6366f1' : '#e2e8f0',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {/* Step 1: Get started */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Welcome! Let's build your resume</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>Start with your existing resume or build from scratch.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px', borderRadius: 14, border: '2px solid #e2e8f0',
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <input type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Upload existing resume PDF</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>We'll parse and auto-fill your details</div>
                </div>
              </label>
              <button
                onClick={() => setStep(2)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '16px 20px', borderRadius: 14, border: '2px solid #e2e8f0',
                  background: '#fff', cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onMouseOut={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Start from scratch</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Fill in your details manually</div>
                </div>
              </button>
            </div>
            <button onClick={() => dismiss()} style={{ marginTop: 18, background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              Skip setup
            </button>
          </div>
        )}

        {/* Step 2: Target role */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>What role are you targeting?</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>Optional — helps us tailor AI suggestions to your goal.</p>
            <input
              type="text"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Backend Engineer at a fintech"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px',
                border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14,
                outline: 'none', fontFamily: 'inherit', color: '#1e293b',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              onKeyDown={e => { if (e.key === 'Enter') setStep(3); }}
            />
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 700, fontSize: 15,
                }}
              >Next →</button>
            </div>
            <button onClick={() => setStep(3)} style={{ marginTop: 12, background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              Skip this step
            </button>
          </div>
        )}

        {/* Step 3: Pick template */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>Pick a template</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px' }}>You can change this anytime in the editor.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {TEMPLATE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    border: selectedTemplate === t.id ? `2.5px solid ${t.color}` : '1.5px solid #e2e8f0',
                    borderRadius: 12, background: '#fff', cursor: 'pointer',
                    padding: '12px 8px', transition: 'all 0.15s',
                    boxShadow: selectedTemplate === t.id ? `0 0 0 3px ${t.color}22` : 'none',
                  }}
                >
                  {/* Mini preview swatch */}
                  <div style={{ height: 44, borderRadius: 6, background: t.color, marginBottom: 8, display: 'flex', alignItems: 'flex-end', padding: '0 6px 4px' }}>
                    <div style={{ height: 3, width: '60%', background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: selectedTemplate === t.id ? 700 : 500, color: selectedTemplate === t.id ? t.color : '#64748b' }}>
                    {t.label}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => dismiss(selectedTemplate)}
              style={{
                marginTop: 22, width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Get started →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
