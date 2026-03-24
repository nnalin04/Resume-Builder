import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useResumeState } from '../hooks/useResumeState';
import type { TemplateId, ResumeData } from '../types/resumeTypes';
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
import TemplateMinimal from '../templates/TemplateMinimal';
import TemplateExecutive from '../templates/TemplateExecutive';
import TemplateTech from '../templates/TemplateTech';
import TemplateFinance from '../templates/TemplateFinance';
import TemplateCreative from '../templates/TemplateCreative';
import OnboardingWizard from '../components/OnboardingWizard';
import PaginatedPreview, { PAGE_GAP } from '../components/PaginatedPreview';
import { exportToDOCX } from '../utils/pdfExport';
import { mapExperiences, mapEducation, mapProjects, mapCertifications, flattenSkills } from '../utils/sectionMappers';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

// ─── Convert frontend ResumeData → backend sections format ───────────────────

function resumeDataToSections(data: ResumeData): object {
  return {
    contact: {
      name: data.personalInfo.name,
      email: data.personalInfo.email,
      phone: data.personalInfo.phone,
      location: data.personalInfo.location,
      linkedin: data.personalInfo.linkedin,
      github: data.personalInfo.github,
    },
    summary: data.summary,
    experience: data.experiences.map(e => ({
      company: e.company,
      title: e.position,
      location: e.location,
      start_date: e.startDate,
      end_date: e.currentlyWorking ? 'Present' : e.endDate,
      bullets: e.description ? e.description.split('\n').filter((b: string) => b.trim()) : [],
    })),
    education: data.education.map(e => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      graduation_date: e.year,
    })),
    skills: {
      languages: [],
      frameworks: [],
      tools: [],
      databases: [],
      other: data.skills ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    },
    projects: data.projects.map(p => ({
      name: p.name,
      description: p.description,
      link: p.link,
    })),
    certifications: (data.certifications ?? []).map(c => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  };
}

// ─── Template accent colors ───────────────────────────────────────────────────

const TEMPLATE_COLORS: Record<TemplateId, string> = {
  classic:      '#1a1a2e',
  modern:       '#0070f3',
  professional: '#6366f1',
  twocolumn:    '#059669',
  clean:        '#64748b',
  minimal:      '#9ca3af',
  executive:    '#1e2d4e',
  tech:         '#0d9488',
  finance:      '#1a2744',
  creative:     '#e05c5c',
};

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'classic',      label: 'Classic' },
  { id: 'modern',       label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'twocolumn',    label: 'Two Column' },
  { id: 'clean',        label: 'Clean' },
  { id: 'minimal',      label: 'Minimal' },
  { id: 'executive',    label: 'Executive' },
  { id: 'tech',         label: 'Tech' },
  { id: 'finance',      label: 'Finance' },
  { id: 'creative',     label: 'Creative' },
];

const RESUME_W = 794;
const RESUME_H = 1123;

type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications';

// ─── Template thumbnail (micro-lookalike preview) ─────────────────────────────

function TemplateMiniPreview({ id, active }: { id: TemplateId; active: boolean }) {
  const c = TEMPLATE_COLORS[id];
  const b = (w: string | number, h = 2, color = '#e2e8f0') => (
    <div style={{ width: w, height: h, background: color, borderRadius: 1, flexShrink: 0 }} />
  );
  const col = {
    padding: '5px 5px 4px', display: 'flex', flexDirection: 'column' as const,
    gap: 2, height: '100%', boxSizing: 'border-box' as const,
  };

  let inner: React.ReactNode = null;

  if (id === 'classic') {
    // Plain header, blue section labels with dark bottom border
    inner = (
      <div style={col}>
        {b('68%', 3, '#1e1e1e')}
        {b('50%', 1.5, '#94a3b8')}
        <div style={{ height: 2 }} />
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 1 }}>{b('36%', 2, '#3A6FA8')}</div>
        {b('90%')} {b('78%')} {b('64%')}
        <div style={{ height: 1 }} />
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 1 }}>{b('36%', 2, '#3A6FA8')}</div>
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'modern') {
    // Plain header, sections: blue left pip + label + horizontal rule
    inner = (
      <div style={col}>
        {b('68%', 3, '#0f172a')}
        {b('50%', 1.5, '#94a3b8')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 9, background: '#2563EB', borderRadius: 1, flexShrink: 0 }} />
          {b('28%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('90%')} {b('76%')} {b('62%')}
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 9, background: '#2563EB', borderRadius: 1, flexShrink: 0 }} />
          {b('28%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'professional') {
    // Navy header band + narrow sidebar + main content
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ background: '#1e3a5f', padding: '5px 5px 4px', flexShrink: 0 }}>
          {b('70%', 2.5, 'rgba(255,255,255,0.9)')}
          <div style={{ height: 1.5 }} />
          {b('52%', 1.5, 'rgba(255,255,255,0.5)')}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          <div style={{ width: 14, background: '#eef1f6', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 2px' }}>
            {b('90%', 1.5, '#6366f1')} {b('80%')} {b('85%')} {b('75%')} {b('80%')}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 3px', boxSizing: 'border-box' }}>
            <div style={{ borderBottom: '1px solid #1e3a5f', paddingBottom: 1 }}>{b('48%', 1.5, '#1e3a5f')}</div>
            {b('90%')} {b('76%')} {b('62%')}
            <div style={{ height: 1 }} />
            <div style={{ borderBottom: '1px solid #1e3a5f', paddingBottom: 1 }}>{b('48%', 1.5, '#1e3a5f')}</div>
            {b('85%')} {b('68%')}
          </div>
        </div>
      </div>
    );
  } else if (id === 'twocolumn') {
    // Centered header, two equal columns with blue section labels
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '4px', gap: 3, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          {b('58%', 2.5, '#1a1a1a')}
          {b('76%', 1, '#bbb')}
        </div>
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {b('70%', 1.5, '#1565C0')} {b('90%')} {b('75%')} {b('80%')}
            <div style={{ height: 1 }} />
            {b('70%', 1.5, '#1565C0')} {b('85%')} {b('65%')}
          </div>
          <div style={{ width: 1, background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {b('70%', 1.5, '#1565C0')} {b('90%')} {b('72%')} {b('68%')}
            <div style={{ height: 1 }} />
            {b('70%', 1.5, '#1565C0')} {b('85%')} {b('60%')}
          </div>
        </div>
      </div>
    );
  } else if (id === 'clean') {
    // Plain header, sections: accent label + full-width hairline rule
    inner = (
      <div style={col}>
        {b('68%', 3, '#0f0f0f')}
        {b('50%', 1.5, '#888')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {b('28%', 1.5, '#3A6FA8')}
          <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
        </div>
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {b('28%', 1.5, '#3A6FA8')}
          <div style={{ flex: 1, height: 1, background: '#d0d0d0' }} />
        </div>
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'minimal') {
    // Serif feel: large name, tiny gray all-caps section labels, lots of whitespace
    inner = (
      <div style={col}>
        {b('72%', 3.5, '#111')}
        {b('54%', 1.5, '#9ca3af')}
        <div style={{ height: 4 }} />
        {b('26%', 1.5, '#9ca3af')}
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 3 }} />
        {b('26%', 1.5, '#9ca3af')}
        {b('85%')} {b('70%')}
      </div>
    );
  } else if (id === 'executive') {
    // Full-width dark navy header band, navy section titles with bottom border
    inner = (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ background: '#1e2d4e', padding: '6px 5px 5px', flexShrink: 0 }}>
          {b('70%', 2.5, 'rgba(255,255,255,0.9)')}
          <div style={{ height: 1.5 }} />
          {b('52%', 1.5, 'rgba(255,255,255,0.5)')}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 5px 3px', boxSizing: 'border-box' }}>
          <div style={{ borderBottom: '1px solid #1e2d4e', paddingBottom: 1 }}>{b('44%', 1.5, '#1e2d4e')}</div>
          {b('90%')} {b('75%')} {b('62%')}
          <div style={{ height: 1 }} />
          <div style={{ borderBottom: '1px solid #1e2d4e', paddingBottom: 1 }}>{b('44%', 1.5, '#1e2d4e')}</div>
          {b('85%')} {b('68%')}
        </div>
      </div>
    );
  } else if (id === 'tech') {
    // Name left, teal pill badge top-right; teal left pip sections
    inner = (
      <div style={col}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {b(46, 3, '#0f172a')}
            {b(34, 1.5, '#94a3b8')}
          </div>
          <div style={{ width: 14, height: 6, background: '#f0fdfa', border: '1px solid #0d9488', borderRadius: 10, flexShrink: 0 }} />
        </div>
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 8, background: '#0d9488', borderRadius: 1, flexShrink: 0 }} />
          {b('26%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('90%')} {b('76%')} {b('60%')}
        <div style={{ height: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 2, height: 8, background: '#0d9488', borderRadius: 1, flexShrink: 0 }} />
          {b('26%', 1.5, '#1e293b')}
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'finance') {
    // Centered header: navy name, thin navy rules flanking contact, navy section titles
    inner = (
      <div style={col}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {b('58%', 2.5, '#1a2744')}
          <div style={{ width: '100%', height: 1, background: '#1a2744' }} />
          {b('72%', 1.5, '#888')}
          <div style={{ width: '100%', height: 1, background: '#1a2744' }} />
        </div>
        <div style={{ height: 1 }} />
        <div style={{ borderBottom: '1px solid #1a2744', paddingBottom: 1 }}>{b('42%', 1.5, '#1a2744')}</div>
        {b('90%')} {b('78%')} {b('65%')}
        <div style={{ height: 2 }} />
        <div style={{ borderBottom: '1px solid #1a2744', paddingBottom: 1 }}>{b('42%', 1.5, '#1a2744')}</div>
        {b('85%')} {b('68%')}
      </div>
    );
  } else if (id === 'creative') {
    // Coral left sidebar (name + contact + skills) + white main content
    inner = (
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: 18, background: '#e05c5c', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 3px 4px', boxSizing: 'border-box' }}>
          {b('90%', 2.5, 'rgba(255,255,255,0.95)')}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.3)' }} />
          {b('85%', 1.5, 'rgba(255,255,255,0.65)')} {b('75%', 1.5, 'rgba(255,255,255,0.55)')} {b('80%', 1.5, 'rgba(255,255,255,0.55)')}
          <div style={{ height: 2 }} />
          {b('55%', 1, 'rgba(255,255,255,0.4)')}
          {b('70%', 1.5, 'rgba(255,255,255,0.55)')} {b('65%', 1.5, 'rgba(255,255,255,0.55)')} {b('72%', 1.5, 'rgba(255,255,255,0.55)')}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 4px 4px', boxSizing: 'border-box' }}>
          {b('55%', 1.5, '#e05c5c')} {b('90%')} {b('75%')} {b('65%')}
          <div style={{ height: 1 }} />
          {b('55%', 1.5, '#e05c5c')} {b('85%')} {b('68%')}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: 62, height: 88, background: '#fff', borderRadius: 5,
      overflow: 'hidden', border: `2px solid ${active ? c : '#e2e8f0'}`,
      transition: 'border-color 0.15s', boxSizing: 'border-box', flexShrink: 0,
    }}>
      {inner}
    </div>
  );
}

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
  const { user } = useAuth();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<TemplateId>('classic');
  const [fontSize, setFontSize] = useState<FontSize>('small');
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    personal: false, summary: false, skills: false,
    experience: false, projects: false, education: false, certifications: false,
  });
  const [exporting, setExporting] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportError, setExportError] = useState('');
  const [openJD, setOpenJD] = useState(false);
  const [editorWidth, setEditorWidth] = useState(420);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(420);

  const [showMobilePreview, setShowMobilePreview] = useState(false);
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
  const previewContentRef = useRef<HTMLDivElement>(null);
  const [previewPageCount, setPreviewPageCount] = useState(1);
  const [mobilePageCount, setMobilePageCount] = useState(1);

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
    setOpenSections(prev => {
      const wasOpen = prev[s];
      const allClosed: Record<Section, boolean> = {
        personal: false, summary: false, skills: false,
        experience: false, projects: false, education: false, certifications: false,
      };
      return wasOpen ? allClosed : { ...allClosed, [s]: true };
    });

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = editorWidth;
    const onMove = (me: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newW = Math.max(300, Math.min(650, dragStartWidthRef.current + me.clientX - dragStartXRef.current));
      setEditorWidth(newW);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      // Trigger native browser print which will be formatted by @media print
      window.print();
    } catch (err: any) {
      alert(err.message || String(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDocxExport = async () => {
    setExportingDocx(true);
    setExportError('');
    try {
      const sections = resumeDataToSections(resume.resumeData);
      const name = resume.resumeData.personalInfo.name?.replace(/\s+/g, '_') || 'resume';
      await exportToDOCX(sections, name);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : 'DOCX export failed');
    } finally {
      setExportingDocx(false);
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

      // Personal info — backend returns sections.contact (not sections.personal)
      const contact = s.contact ?? s.personal;
      if (contact) {
        resume.updatePersonalInfo('name', contact.name || '');
        resume.updatePersonalInfo('email', contact.email || '');
        resume.updatePersonalInfo('phone', contact.phone || '');
        resume.updatePersonalInfo('location', contact.location || '');
        resume.updatePersonalInfo('linkedin', contact.linkedin || '');
        resume.updatePersonalInfo('github', contact.github || '');
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
  const freeLeft = user ? Math.max(0, 3 - (user.free_downloads_used ?? 0)) : null;

  // Version management state
  const [showVersionInput, setShowVersionInput] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [versions, setVersions] = useState<{ id: number; name: string; created_at: string }[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Onboarding wizard
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('resume_onboarding_done'));

  const handleSaveVersion = async () => {
    if (!backendResumeId || !versionName.trim()) return;
    setIsSavingVersion(true);
    try {
      await api.saveVersion(backendResumeId, versionName.trim());
      setVersionName('');
      setShowVersionInput(false);
      addToast('Version saved!', 'success');
    } catch {
      addToast('Failed to save version.', 'error');
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleLoadVersions = async () => {
    if (!backendResumeId) { addToast('Import a PDF first to use versions.', 'info'); return; }
    setShowVersions(v => !v);
    if (!showVersions) {
      setIsLoadingVersions(true);
      try {
        const res = await api.listVersions(backendResumeId);
        setVersions(res.versions);
      } catch {
        addToast('Failed to load versions.', 'error');
      } finally {
        setIsLoadingVersions(false);
      }
    }
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!backendResumeId) return;
    try {
      const res = await api.restoreVersion(backendResumeId, versionId);
      const s = res.sections;
      if (s) {
        if (s.summary) resume.updateSummary(s.summary);
        if (s.skills) resume.updateSkills(typeof s.skills === 'string' ? s.skills : Object.values(s.skills).flat().join(', '));
        if (Array.isArray(s.experience) && s.experience.length > 0) resume.replaceExperiences(mapExperiences(s.experience));
        if (Array.isArray(s.education) && s.education.length > 0) resume.replaceEducation(mapEducation(s.education));
        if (Array.isArray(s.projects) && s.projects.length > 0) resume.replaceProjects(mapProjects(s.projects));
      }
      addToast('Version restored!', 'success');
      setShowVersions(false);
    } catch {
      addToast('Failed to restore version.', 'error');
    }
  };

  const PreviewComponent = {
    classic:      TemplateClassic,
    modern:       TemplateModern,
    professional: TemplateProfessional,
    twocolumn:    TemplateTwoColumn,
    clean:        TemplateClean,
    minimal:      TemplateMinimal,
    executive:    TemplateExecutive,
    tech:         TemplateTech,
    finance:      TemplateFinance,
    creative:     TemplateCreative,
  }[template];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-screen bg-slate-100 font-sans"
    >

      {/* ─── Onboarding Wizard ────────────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(templateId, file, targetRole) => {
            setShowOnboarding(false);
            setTemplate(templateId);
            if (targetRole) setJobDescription(targetRole);
            if (file) {
              const dt = new DataTransfer();
              dt.items.add(file);
              const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
              handlePdfUpload(fakeEvent);
            }
          }}
        />
      )}

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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shrink-0 gap-3 shadow-sm hide-on-print">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-soft">
            <span className="text-white text-sm font-outfit font-bold">R</span>
          </div>
          <span className="font-outfit font-bold text-lg text-slate-900 tracking-tight hidden sm:block">Resume Builder</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Font size controls in toolbar */}
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
            title="Download as Word document — always free, ATS-safe"
            className={`hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${exportingDocx ? 'border-slate-300 text-slate-400 cursor-wait' : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}
          >
            {exportingDocx
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            }
            <span>{exportingDocx ? '...' : 'DOCX'}</span>
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

      {/* ─── Main panels ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: '1 1 0', overflow: 'hidden', flexDirection: 'row' }}>

        {/* ─── Editor Panel ─────────────────────────────────────────────── */}
        <div className="hide-on-print" style={{
          flexShrink: 0,
          width: isMobile ? '100%' : editorWidth,
          background: '#fff',
          borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
        }}>
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

                {/* Save Version */}
                {!showVersionInput ? (
                  <button
                    onClick={() => { if (backendResumeId) setShowVersionInput(true); }}
                    disabled={!backendResumeId}
                    title={!backendResumeId ? 'Upload a PDF resume to enable version history' : 'Save current resume as a named version'}
                    className="text-xs font-bold bg-white text-slate-500 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    🔖 Save Version
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={versionName}
                      onChange={e => setVersionName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveVersion(); if (e.key === 'Escape') setShowVersionInput(false); }}
                      placeholder="Version name…"
                      style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #c7d2fe', borderRadius: 8, outline: 'none', width: 130 }}
                    />
                    <button
                      onClick={handleSaveVersion}
                      disabled={isSavingVersion || !versionName.trim()}
                      style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', opacity: isSavingVersion ? 0.6 : 1 }}
                    >{isSavingVersion ? '…' : 'Save'}</button>
                    <button onClick={() => setShowVersionInput(false)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#64748b' }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Target Job Description + ATS */}
            <SectionHeader title="Target Job Description" open={openJD} onToggle={() => setOpenJD(v => !v)} />
            {openJD && <div className="p-5 bg-white border-b border-slate-100">
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
            </div>}

            {/* Version History */}
            <div style={{ borderBottom: '1px solid #e2e8f0' }}>
              <button
                onClick={handleLoadVersions}
                disabled={!backendResumeId}
                title={!backendResumeId ? 'Upload a PDF resume to enable version history' : undefined}
                style={{
                  width: '100%', padding: '12px 20px', background: 'none', border: 'none',
                  cursor: backendResumeId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: 13, fontWeight: 600, color: backendResumeId ? '#64748b' : '#cbd5e1',
                  opacity: backendResumeId ? 1 : 0.5,
                }}
              >
                <span>🔖 Version History</span>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{showVersions ? '▲ hide' : '▼ show'}</span>
              </button>
              {showVersions && (
                <div style={{ padding: '0 16px 12px' }}>
                  {isLoadingVersions ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Loading…</div>
                  ) : versions.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>No saved versions yet. Use "🔖 Save Version" above.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {versions.map(v => (
                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{v.name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(v.created_at).toLocaleString()}</div>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(v.id)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 7, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#6366f1', cursor: 'pointer' }}
                          >Restore</button>
                        </div>
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

            {/* Mobile Preview FAB */}
            {isMobile && (
              <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, rgba(255,255,255,1) 70%, transparent)', padding: '12px 16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowMobilePreview(true)}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 28,
                    padding: '13px 24px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px -4px rgba(99,102,241,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    outline: 'none',
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  Preview Resume
                </button>
              </div>
            )}

            <div style={{ height: 32 }} />
          </div>

        {/* ─── Resizable divider ────────────────────────────────────────── */}
        {!isMobile && (
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: 5, flexShrink: 0, cursor: 'col-resize',
              background: '#e2e8f0', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#e2e8f0'; }}
          >
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
          </div>
        )}

        {/* ─── Desktop: Preview + Template Strip ──────────────────────── */}
        {!isMobile && (
          <>
            {/* Resume preview */}
            <div style={{ flex: '1 1 0', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#f1f5f9', padding: 32 }}>
              {/* Outer placeholder — sized to scaled content height */}
              <div style={{
                flexShrink: 0,
                width: RESUME_W * 0.82,
                height: (previewPageCount * RESUME_H + (previewPageCount - 1) * PAGE_GAP) * 0.82,
              }}>
                <div className="print-scale-inner" ref={previewContentRef} style={{
                  transform: 'scale(0.82)',
                  transformOrigin: 'top left',
                  width: RESUME_W,
                }}>
                  <PaginatedPreview
                    data={resume.resumeData}
                    fontSize={fontSize}
                    templateId={template}
                    previewComponent={PreviewComponent}
                    onPageCountChange={setPreviewPageCount}
                  />
                </div>
              </div>
            </div>

            {/* Template strip (right sidebar — font moved to header) */}
            <div style={{
              width: 100,
              background: '#fff',
              borderLeft: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 0',
              gap: 4,
              flexShrink: 0,
              overflowY: 'auto',
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Template</span>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  title={t.label}
                  style={{
                    width: 80,
                    padding: '6px 6px 4px',
                    background: template === t.id ? '#f8fafc' : 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s',
                    outline: 'none',
                  }}
                >
                  <TemplateMiniPreview id={t.id} active={template === t.id} />
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: template === t.id ? 700 : 500,
                    color: template === t.id ? TEMPLATE_COLORS[t.id] : '#94a3b8',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>{t.label}</span>
                </button>
              ))}
              <div style={{ height: 8 }} />
            </div>
          </>
        )}

      </div>

      {/* ─── Mobile full-screen preview modal ───────────────────────────────── */}
      {isMobile && showMobilePreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #334155' }}>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 15 }}>Resume Preview</span>
            <button
              onClick={() => setShowMobilePreview(false)}
              style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600, outline: 'none' }}
            >✕ Close</button>
          </div>
          <div style={{ background: '#1e293b', padding: '8px 12px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #334155' }}>
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: 20,
                  background: template === t.id ? TEMPLATE_COLORS[t.id] : '#334155',
                  color: template === t.id ? '#fff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  outline: 'none',
                }}
              >{t.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 16, WebkitOverflowScrolling: 'touch' as const }}>
            <div style={{
              flexShrink: 0,
              width: RESUME_W * 0.44,
              height: (mobilePageCount * RESUME_H + (mobilePageCount - 1) * PAGE_GAP) * 0.44,
            }}>
              <div style={{ transform: 'scale(0.44)', transformOrigin: 'top left', width: RESUME_W }}>
                <PaginatedPreview
                  data={resume.resumeData}
                  fontSize={fontSize}
                  templateId={template}
                  previewComponent={PreviewComponent}
                  onPageCountChange={setMobilePageCount}
                />
              </div>
            </div>
          </div>
          <div style={{ background: '#1e293b', borderTop: '1px solid #334155', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Font:</span>
            {(['small', 'medium', 'large'] as FontSize[]).map(s => (
              <button
                key={s}
                onClick={() => setFontSize(s)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 16,
                  background: fontSize === s ? '#6366f1' : '#334155',
                  color: fontSize === s ? '#fff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  outline: 'none',
                }}
              >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
            ))}
            <button
              onClick={() => { setShowMobilePreview(false); handleExport(); }}
              disabled={exporting}
              style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.7 : 1, outline: 'none' }}
            >{exporting ? 'Exporting...' : '↓ Download PDF'}</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
