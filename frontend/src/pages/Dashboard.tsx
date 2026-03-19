import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useResumeState } from '../hooks/useResumeState';
import type { TemplateId } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import PersonalInfoForm from '../components/PersonalInfoForm';
import SummaryForm from '../components/SummaryForm';
import ExperienceForm from '../components/ExperienceForm';
import ProjectsForm from '../components/ProjectsForm';
import EducationForm from '../components/EducationForm';
import CertificationsForm from '../components/CertificationsForm';
import TemplateClassic from '../templates/TemplateClassic';
import TemplateModern from '../templates/TemplateModern';
import TemplateProfessional from '../templates/TemplateProfessional';
import TemplateTwoColumn from '../templates/TemplateTwoColumn';
import TemplateClean from '../templates/TemplateClean';
import { exportToPDF } from '../utils/pdfExport';
import { mapExperiences, mapEducation, mapProjects, mapCertifications, flattenSkills } from '../utils/sectionMappers';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'twocolumn', label: 'Two Column' },
  { id: 'clean', label: 'Clean' },
];

const RESUME_W = 794;
const RESUME_H = 1123;

type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications';

// ─── Toast system ─────────────────────────────────────────────────────────────

type ToastType = 'error' | 'success' | 'info';
interface Toast { id: number; message: string; type: ToastType }

let _toastId = 0;

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  error:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' },
};

// ─── Section helpers ──────────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${open ? 'bg-surface-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50 border-b border-slate-100'}`}
    >
      <span className="text-sm font-semibold text-slate-700 tracking-tight">{title}</span>
      <span className={`text-xs text-slate-400 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const resume = useResumeState();
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateId>('classic');
  const [fontSize, setFontSize] = useState<FontSize>('small');
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    personal: true, summary: true, skills: true,
    experience: true, projects: false, education: false, certifications: false,
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // AI & Job Matching
  const [jobDescription, setJobDescription] = useState('');
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsMatched, setAtsMatched] = useState<string[]>([]);
  const [atsMissing, setAtsMissing] = useState<string[]>([]);
  const [showMatchedKeywords, setShowMatchedKeywords] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [backendResumeId, setBackendResumeId] = useState<number | null>(null);
  const [isRewritingSummary, setIsRewritingSummary] = useState(false);
  const [rewritingExperienceId, setRewritingExperienceId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'error') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!resume.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [resume.isDirty]);

  const toggleSection = (s: Section) =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      if (user) {
        await api.recordDownload();
        await refreshUser();
      }
      await exportToPDF('resume-preview');
      resume.clearDraft();
    } catch (err: unknown) {
      const e = err as { status?: number };
      if (e?.status === 402) {
        navigate('/pricing');
      } else {
        setExportError(err instanceof Error ? err.message : 'Export failed');
      }
    } finally {
      setExporting(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Section 2.3: show login prompt instead of silent no-op
    if (!user) {
      addToast('Sign in to import your PDF resume.', 'info');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await api.uploadResume(file);
      setBackendResumeId(uploadRes.resume_id);

      const parseRes = await api.parseResume(uploadRes.resume_id);
      const s = parseRes.sections;
      if (!s) return;

      // Personal info
      if (s.personal) {
        resume.updatePersonalInfo('name', s.personal.name || '');
        resume.updatePersonalInfo('email', s.personal.email || '');
        resume.updatePersonalInfo('phone', s.personal.phone || '');
        resume.updatePersonalInfo('location', s.personal.location || '');
        resume.updatePersonalInfo('linkedin', s.personal.linkedin || '');
        resume.updatePersonalInfo('github', s.personal.github || '');
      }

      // Summary
      if (s.summary) resume.updateSummary(s.summary);

      // Skills
      if (s.skills) resume.updateSkills(flattenSkills(s.skills));

      // Experience
      if (Array.isArray(s.experience) && s.experience.length > 0)
        resume.replaceExperiences(mapExperiences(s.experience));

      // Education
      if (Array.isArray(s.education) && s.education.length > 0)
        resume.replaceEducation(mapEducation(s.education));

      // Projects
      if (Array.isArray(s.projects) && s.projects.length > 0)
        resume.replaceProjects(mapProjects(s.projects));

      // Certifications
      if (Array.isArray(s.certifications) && s.certifications.length > 0)
        resume.replaceCertifications(mapCertifications(s.certifications));

      addToast('Resume imported successfully!', 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScore = async () => {
    if (!jobDescription.trim()) { addToast('Paste a job description first.', 'info'); return; }
    setIsScoring(true);
    try {
      // If we have a backend resume ID use it; otherwise score against current skills text
      const resumeId = backendResumeId ?? 0;
      const res = await api.getAtsScore(resumeId, jobDescription);
      setAtsScore(res.score);
      setAtsMatched(res.matched ?? res.keywords_found ?? []);
      setAtsMissing(res.missing ?? res.keywords_missing ?? []);
    } catch {
      addToast('Failed to get ATS score. Try importing your PDF first.', 'error');
    } finally {
      setIsScoring(false);
    }
  };

  const handleOptimize = async () => {
    if (!jobDescription.trim()) { addToast('Please enter a job description first.', 'info'); return; }
    if (!backendResumeId) { addToast('Import a PDF first to use AI optimization.', 'info'); return; }
    setIsOptimizing(true);
    try {
      const res = await api.generateResume(backendResumeId, jobDescription, template);
      const s = res.sections;
      if (s) {
        if (s.summary) resume.updateSummary(s.summary);
        if (s.skills) resume.updateSkills(flattenSkills(s.skills));
        if (Array.isArray(s.experience) && s.experience.length > 0)
          resume.replaceExperiences(mapExperiences(s.experience));
        if (Array.isArray(s.education) && s.education.length > 0)
          resume.replaceEducation(mapEducation(s.education));
        if (Array.isArray(s.projects) && s.projects.length > 0)
          resume.replaceProjects(mapProjects(s.projects));
      }
      if (res.ats_score != null) setAtsScore(res.ats_score);
      addToast('Resume optimized!', 'success');
    } catch {
      addToast('AI Optimization failed.', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Section 1.5: use /api/ai/rewrite — no backendResumeId required
  const handleRewriteSummary = async () => {
    setIsRewritingSummary(true);
    try {
      const instruction = jobDescription
        ? `Rewrite to be more impactful and tailored to this job: ${jobDescription.slice(0, 300)}`
        : 'Rewrite to be more professional and impactful. 2-3 sentences.';
      const res = await api.rewriteText(resume.resumeData.summary, instruction);
      if (res.result && res.result !== resume.resumeData.summary) {
        resume.updateSummary(res.result);
        addToast('Summary rewritten!', 'success');
      }
    } catch {
      addToast('Failed to rewrite summary.', 'error');
    } finally {
      setIsRewritingSummary(false);
    }
  };

  const handleRewriteExperience = async (id: string, text: string) => {
    setRewritingExperienceId(id);
    try {
      const exp = resume.resumeData.experiences.find(e => e.id === id);
      const instruction = jobDescription
        ? `Improve these resume bullets for this job: ${jobDescription.slice(0, 300)}. Return improved bullets, one per line.`
        : 'Improve these resume bullets to be more action-oriented and quantified. Return improved bullets, one per line.';
      const context = exp ? `Role: ${exp.position} at ${exp.company}` : '';
      const res = await api.rewriteText(text, instruction, context);
      if (res.result) {
        resume.updateExperience(id, 'description', res.result);
        addToast('Bullets improved!', 'success');
      }
    } catch {
      addToast('Failed to rewrite experience.', 'error');
    } finally {
      setRewritingExperienceId(null);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);
    try {
      let reply: string;
      if (backendResumeId) {
        const res = await api.chat(backendResumeId, userMsg, jobDescription);
        reply = res.reply;
      } else {
        const res = await api.rewriteText(
          resume.resumeData.summary,
          userMsg,
          `Resume has ${resume.resumeData.experiences.length} experience(s). Job description: ${jobDescription.slice(0, 300)}`,
        );
        reply = res.result || 'Please import a PDF resume for full coaching support.';
      }
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      addToast('Chat failed', 'error');
    } finally {
      setIsChatLoading(false);
    }
  };

  const appendMissingKeyword = (kw: string) => {
    const current = resume.resumeData.skills.trim();
    const skills = current ? `${current}, ${kw}` : kw;
    resume.updateSkills(skills);
    setAtsMissing(prev => prev.filter(k => k !== kw));
  };

  const isSubscriber = user?.subscription_status === 'ACTIVE';
  const freeLeft = user ? Math.max(0, 1 - (user.free_downloads_used ?? 0)) : null;

  const PreviewComponent = {
    classic: TemplateClassic,
    modern: TemplateModern,
    professional: TemplateProfessional,
    twocolumn: TemplateTwoColumn,
    clean: TemplateClean,
  }[template];

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans">

      {/* ─── Toast Container ──────────────────────────────────────────────── */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
        }}>
          {toasts.map(t => {
            const c = TOAST_COLORS[t.type];
            return (
              <div key={t.id} style={{
                background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: 340, animation: 'fadeIn 0.15s ease',
              }}>
                <span style={{ flex: 1 }}>{t.message}</span>
                <button
                  onClick={() => dismissToast(t.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, fontSize: 16, lineHeight: 1, padding: 0 }}
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Top Nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shrink-0 gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-soft">
            <span className="text-white text-sm font-outfit font-bold">R</span>
          </div>
          <span className="font-outfit font-bold text-lg text-slate-900 tracking-tight hidden sm:block">Resume Builder</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {user && !isSubscriber && freeLeft !== null && (
            <span className={`hidden sm:flex px-3 py-1 text-xs font-semibold rounded-full items-center gap-1 ${freeLeft > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {freeLeft > 0 ? `${freeLeft} free download left` : '0 free downloads left'}
              {freeLeft === 0 && <Link to="/pricing" className="ml-1 text-brand-600 hover:underline">Upgrade</Link>}
            </span>
          )}

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
              {user.profile_photo_url
                ? <img src={user.profile_photo_url} alt="" className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                : <div className="w-8 h-8 rounded-full bg-surface-100 flex items-center justify-center text-sm font-bold text-slate-700 shadow-inner">{user.name.charAt(0).toUpperCase()}</div>
              }
              <button onClick={logout} className="hidden sm:block text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Sign out</button>
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

      {/* ─── Main panels ──────────────────────────────────────────────────── */}
      <div className={`flex flex-1 overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}>

        {isMobile && (
          <div className="flex bg-white border-b border-slate-200 shrink-0">
            <button onClick={() => setActiveTab('editor')} className={`flex-1 py-3.5 text-sm font-bold transition-colors ${activeTab === 'editor' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>Editor</button>
            <button onClick={() => setActiveTab('preview')} className={`flex-1 py-3.5 text-sm font-bold transition-colors ${activeTab === 'preview' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500 hover:text-slate-800'}`}>Preview</button>
          </div>
        )}

        {/* ─── LEFT: Editor ─────────────────────────────────────────────── */}
        {(!isMobile || activeTab === 'editor') && (
          <div className={`shrink-0 bg-white ${isMobile ? 'w-full flex-1 overflow-y-auto' : 'w-[420px] lg:w-[480px] border-r border-slate-200 overflow-y-auto'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4 bg-surface-50 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-outfit font-bold text-lg text-slate-800">Resume Details</h2>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs font-bold bg-white text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : '📄 Import PDF'}
                </button>
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing}
                  className="text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isOptimizing ? '✨ Optimizing...' : '✨ Optimize'}
                </button>
              </div>
            </div>

            {/* Target Job Description + ATS */}
            <SectionHeader title="Target Job Description" open={openSections.personal} onToggle={() => {}} />
            <div className="p-5 bg-white border-b border-slate-100">
              <p className="text-xs text-slate-500 mb-2 font-medium">Paste the job ad to get an ATS score & AI suggestions</p>
              <textarea
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-inner"
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
                    <button onClick={() => { setAtsScore(null); setAtsMatched([]); setAtsMissing([]); }} className="text-xs text-slate-400 hover:text-slate-600">↺ Reset</button>
                  </div>
                ) : (
                  <button className="text-xs text-brand-600 font-semibold hover:underline disabled:opacity-50" onClick={handleScore} disabled={isScoring}>
                    {isScoring ? 'Calculating...' : 'Calculate Score'}
                  </button>
                )}
              </div>

              {/* ATS Keyword Breakdown (Section 3) */}
              {atsMissing.length > 0 && (
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

            {/* Personal Info */}
            <SectionHeader title="Personal Information" open={openSections.personal} onToggle={() => toggleSection('personal')} />
            {openSections.personal && <div className="p-5 bg-white"><PersonalInfoForm data={resume.resumeData.personalInfo} onChange={resume.updatePersonalInfo} /></div>}

            {/* Summary */}
            <SectionHeader title="Professional Summary" open={openSections.summary} onToggle={() => toggleSection('summary')} />
            {openSections.summary && (
              <div className="p-5 bg-white">
                <SummaryForm
                  value={resume.resumeData.summary}
                  onChange={resume.updateSummary}
                  onRewrite={handleRewriteSummary}
                  isRewriting={isRewritingSummary}
                />
              </div>
            )}

            {/* Skills */}
            <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
            {openSections.skills && (
              <div className="p-5 bg-white">
                <p className="text-xs text-slate-500 mb-2 font-medium">Comma-separated list of skills</p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-slate-800 placeholder-slate-400"
                  rows={3}
                  value={resume.resumeData.skills}
                  onChange={e => resume.updateSkills(e.target.value)}
                  placeholder="Python, React, TypeScript, System Design..."
                />
              </div>
            )}

            {/* Experience */}
            <SectionHeader title="Work Experience" open={openSections.experience} onToggle={() => toggleSection('experience')} />
            {openSections.experience && (
              <div className="p-5 bg-white">
                <ExperienceForm
                  experiences={resume.resumeData.experiences}
                  onAdd={resume.addExperience}
                  onUpdate={resume.updateExperience}
                  onRemove={resume.removeExperience}
                  onRewrite={handleRewriteExperience}
                  rewritingId={rewritingExperienceId}
                />
              </div>
            )}

            {/* Projects */}
            <SectionHeader title="Projects" open={openSections.projects} onToggle={() => toggleSection('projects')} />
            {openSections.projects && (
              <div className="p-5 bg-white">
                <ProjectsForm
                  projects={resume.resumeData.projects}
                  onAdd={resume.addProject}
                  onUpdate={resume.updateProject}
                  onRemove={resume.removeProject}
                />
              </div>
            )}

            {/* Education */}
            <SectionHeader title="Education" open={openSections.education} onToggle={() => toggleSection('education')} />
            {openSections.education && (
              <div className="p-5 bg-white border-b border-slate-100">
                <EducationForm
                  education={resume.resumeData.education}
                  onAdd={resume.addEducation}
                  onUpdate={resume.updateEducation}
                  onRemove={resume.removeEducation}
                />
              </div>
            )}

            {/* Certifications */}
            <SectionHeader title="Certifications" open={openSections.certifications} onToggle={() => toggleSection('certifications')} />
            {openSections.certifications && (
              <div className="p-5 bg-white border-b border-transparent">
                <CertificationsForm
                  certifications={resume.resumeData.certifications ?? []}
                  onAdd={resume.addCertification}
                  onUpdate={resume.updateCertification}
                  onRemove={resume.removeCertification}
                />
              </div>
            )}

            {/* ─── AI Coach Chat Panel ──────────────────────────────── */}
            <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', position: 'sticky', bottom: 0 }}>
              <button
                onClick={() => setChatOpen(v => !v)}
                style={{
                  width: '100%', padding: '10px 20px', background: 'none', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 13, fontWeight: 700, color: '#6366f1',
                }}
              >
                <span>✨ AI Coach</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{chatOpen ? '▲ hide' : '▼ open'}</span>
              </button>

              {chatOpen && (
                <div style={{ borderTop: '1px solid #e2e8f0' }}>
                  {/* Messages */}
                  <div style={{ height: 260, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {chatMessages.length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 60 }}>
                        Ask me anything about your resume.<br />
                        "Improve my summary", "What keywords am I missing?"
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: m.role === 'user' ? '#ede9fe' : '#fff',
                        border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                        borderRadius: 10, padding: '7px 11px',
                        fontSize: 12.5, lineHeight: 1.5,
                        color: '#1e293b',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {m.text}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div style={{ alignSelf: 'flex-start', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '7px 14px', fontSize: 12, color: '#94a3b8' }}>
                        Thinking…
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div style={{ display: 'flex', gap: 8, padding: '8px 12px 12px', borderTop: '1px solid #e2e8f0' }}>
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                      placeholder="Ask your AI coach…"
                      style={{
                        flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px',
                        fontSize: 13, outline: 'none', background: '#fff',
                      }}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={isChatLoading || !chatInput.trim()}
                      style={{
                        background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        opacity: isChatLoading || !chatInput.trim() ? 0.5 : 1,
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ─── RIGHT: Preview ───────────────────────────────────────────── */}
        {(!isMobile || activeTab === 'preview') && (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">

            {/* Template + font controls bar */}
            <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Template</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    style={{ transition: 'all 0.15s' }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${template === t.id ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl ml-auto">
                <span className="text-xs font-semibold text-slate-400 px-2">A</span>
                {(['small', 'medium', 'large'] as FontSize[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${fontSize === s ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume preview */}
            <div className="flex-1 overflow-y-auto flex justify-center items-start p-4 lg:p-8">
              <div className="shrink-0" style={{ width: RESUME_W * (isMobile ? 0.42 : 0.82), height: RESUME_H * (isMobile ? 0.42 : 0.82) }}>
                <div className="bg-white rounded-sm overflow-hidden" style={{
                  transform: `scale(${isMobile ? 0.42 : 0.82})`,
                  transformOrigin: 'top left',
                  width: RESUME_W,
                  height: RESUME_H,
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12), 0 30px 60px -15px rgba(0,0,0,0.06)',
                }}>
                  <PreviewComponent data={resume.resumeData} fontSize={fontSize} />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
