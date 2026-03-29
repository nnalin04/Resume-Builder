import React from 'react';
import { SectionHeader } from '../common/SectionHeader';

interface AtsAnalysisPanelProps {
  openJD: boolean;
  onToggle: () => void;
  jobDescription: string;
  setJobDescription: (val: string) => void;
  atsScore: number | null;
  setAtsScore: (val: number | null) => void;
  handleScore: () => void;
  isScoring: boolean;
  atsMatched: string[];
  setAtsMatched: (arr: string[]) => void;
  atsMissing: string[];
  setAtsMissing: (arr: string[]) => void;
  atsRequiredMissing: string[];
  setAtsRequiredMissing: (arr: string[]) => void;
  atsPreferredMissing: string[];
  setAtsPreferredMissing: (arr: string[]) => void;
  atsRequiredMatched: string[];
  setAtsRequiredMatched: (arr: string[]) => void;
  atsPreferredMatched: string[];
  setAtsPreferredMatched: (arr: string[]) => void;
  atsSeniority: string;
  setAtsSeniority: (val: string) => void;
  atsExpYears: number;
  setAtsExpYears: (val: number) => void;
  appendMissingKeyword: (kw: string) => void;
}

export function AtsAnalysisPanel({
  openJD,
  onToggle,
  jobDescription,
  setJobDescription,
  atsScore,
  setAtsScore,
  handleScore,
  isScoring,
  atsMatched,
  setAtsMatched,
  atsMissing,
  setAtsMissing,
  atsRequiredMissing,
  setAtsRequiredMissing,
  atsPreferredMissing,
  setAtsPreferredMissing,
  atsRequiredMatched,
  setAtsRequiredMatched,
  atsPreferredMatched,
  setAtsPreferredMatched,
  atsSeniority,
  setAtsSeniority,
  atsExpYears,
  setAtsExpYears,
  appendMissingKeyword,
}: AtsAnalysisPanelProps) {
  const [showMatchedKeywords, setShowMatchedKeywords] = React.useState(false);

  const resetAll = () => {
    setAtsScore(null);
    setAtsMatched([]);
    setAtsMissing([]);
    setAtsRequiredMissing([]);
    setAtsPreferredMissing([]);
    setAtsRequiredMatched([]);
    setAtsPreferredMatched([]);
    setAtsSeniority('');
    setAtsExpYears(0);
  };

  return (
    <>
      <SectionHeader title="Target Job Description" open={openJD} onToggle={onToggle} />
      {openJD && (
        <div className="p-5 bg-white border-b border-slate-100">
          <p className="text-xs text-slate-500 mb-2 font-medium">Paste the job ad to get an ATS score & AI suggestions</p>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-inner"
            style={{ fontSize: 11 }}
            rows={4}
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="We are looking for a Senior Software Engineer with 5+ years of experience in React and Node.js..."
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ATS Match Score</span>
            {atsScore !== null ? (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold px-2 py-0.5 rounded-md ${atsScore >= 80 ? 'bg-emerald-100 text-emerald-700' : atsScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {atsScore}%
                </span>
                <button onClick={resetAll} className="text-xs text-slate-400 hover:text-slate-600">↺ Reset</button>
              </div>
            ) : (
              <button className="text-xs text-brand-600 font-semibold hover:underline disabled:opacity-50" onClick={handleScore} disabled={isScoring}>
                {isScoring ? 'Calculating...' : 'Calculate Score'}
              </button>
            )}
          </div>

          {atsScore !== null && (
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              <div style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%',
                  width: `${atsScore}%`,
                  borderRadius: 4,
                  background: atsScore >= 80 ? '#16a34a' : atsScore >= 50 ? '#d97706' : '#dc2626',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              {(atsRequiredMatched.length + atsRequiredMissing.length) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>Required skills</span>
                  <span style={{ color: atsRequiredMissing.length === 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {atsRequiredMatched.length}/{atsRequiredMatched.length + atsRequiredMissing.length} matched
                  </span>
                </div>
              )}
              {(atsPreferredMatched.length + atsPreferredMissing.length) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#374151', fontWeight: 600 }}>Preferred skills</span>
                  <span style={{ color: atsPreferredMissing.length === 0 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                    {atsPreferredMatched.length}/{atsPreferredMatched.length + atsPreferredMissing.length} matched
                  </span>
                </div>
              )}
            </div>
          )}

          {atsSeniority && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, marginTop: 12 }}>
              {atsSeniority.charAt(0).toUpperCase() + atsSeniority.slice(1)} level
              {atsExpYears > 0 && ` · ${atsExpYears}+ years`}
            </div>
          )}

          {atsRequiredMissing.length > 0 && (
            <div style={{ marginBottom: 8, marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>🔴 Required Missing</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {atsRequiredMissing.map(kw => (
                  <button
                    key={kw}
                    onClick={() => appendMissingKeyword(kw)}
                    style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 4, padding: '2px 6px', fontSize: 11, border: '1px solid #fca5a5', cursor: 'pointer' }}
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {atsPreferredMissing.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#d97706', marginBottom: 4 }}>🟡 Preferred Missing</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {atsPreferredMissing.map(kw => (
                  <button
                    key={kw}
                    onClick={() => appendMissingKeyword(kw)}
                    style={{ background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '2px 6px', fontSize: 11, border: '1px solid #fcd34d', cursor: 'pointer' }}
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {atsRequiredMissing.length === 0 && atsMissing.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Missing keywords — click to add to skills:</p>
              <div className="flex flex-wrap gap-1.5">
                {atsMissing.map(kw => (
                  <button
                    key={kw}
                    onClick={() => appendMissingKeyword(kw)}
                    className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-100 transition-colors font-medium"
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {atsMatched.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowMatchedKeywords(v => !v)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
                ✅ {atsMatched.length} matched — {showMatchedKeywords ? 'hide' : 'show'}
              </button>
              {showMatchedKeywords && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {atsMatched.map(kw => (
                    <span key={kw} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-2.5 py-1 font-medium">{kw}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
