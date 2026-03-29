import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type FontSize = 'small' | 'medium' | 'large';

interface DocumentToolbarProps {
  user: any;
  isSubscriber: boolean;
  freeLeft: number | null;
  exportingDocx: boolean;
  handleDocxExport: () => void;
  exporting: boolean;
  handleExport: () => void;
  isMobile: boolean;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  exportError: string | null;
}

export function DocumentToolbar({
  user,
  isSubscriber,
  freeLeft,
  exportingDocx,
  handleDocxExport,
  exporting,
  handleExport,
  isMobile,
  fontSize,
  setFontSize,
  exportError,
}: DocumentToolbarProps) {
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shrink-0 gap-3 shadow-sm hide-on-print">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-soft">
            <span className="text-white text-sm font-outfit font-bold">R</span>
          </div>
          <span className="font-outfit font-bold text-lg text-slate-900 tracking-tight hidden sm:block">Resume Builder</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginRight: 2 }}>Font</span>
              {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  style={{
                    padding: '3px 9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: fontSize === s ? 700 : 500,
                    background: fontSize === s ? '#ede9fe' : 'transparent',
                    color: fontSize === s ? '#6366f1' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          )}

          <Link
            to="/cover-letter"
            style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: '1px solid #e0e7ff', background: '#eef2ff' }}
          >
            Cover Letter
          </Link>

          {user && !isSubscriber && freeLeft !== null && (
            <span className={`hidden sm:flex px-3 py-1 text-xs font-semibold rounded-full items-center gap-1 ${freeLeft > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {freeLeft > 0 ? `${freeLeft} of 3 free downloads this month` : '0 of 3 free downloads this month'}
              {freeLeft === 0 && <Link to="/pricing" className="ml-1 text-brand-600 hover:underline">Upgrade</Link>}
            </span>
          )}

          <button
            onClick={handleDocxExport}
            disabled={exportingDocx}
            title="Download as Word (.docx) — recommended for ATS portals, always free"
            className={`hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${exportingDocx ? 'border-slate-300 text-slate-400 cursor-wait' : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}
          >
            {exportingDocx
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            }
            <span>{exportingDocx ? '...' : 'DOCX (ATS)'}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${exporting ? 'bg-brand-300 text-white cursor-wait' : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-soft hover:shadow-glow'}`}
          >
            {exporting
              ? <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            }
            <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                {user.profile_photo_url
                  ? <img src={user.profile_photo_url} alt="" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                  : <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-sm font-bold text-slate-700 shadow-inner">{user.name.charAt(0).toUpperCase()}</div>
                }
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <Link to="/login" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors hidden sm:block">Sign in</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm">Sign up</Link>
            </div>
          )}
        </div>
      </header>

      {exportError && (
        <div className="bg-red-50 border-b border-red-200 text-red-600 px-6 py-3 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
          {exportError}
        </div>
      )}
    </>
  );
}
