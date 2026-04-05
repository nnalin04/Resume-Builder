import type { ReactNode } from 'react';
import type { SkillTag } from '../../types/resumeTypes';
import { User, FileText, Wrench, Briefcase, FolderOpen, GraduationCap, Award, Plus } from 'lucide-react';

import { DEFAULT_SKILL_CATEGORIES } from '../../utils/skillUtils';
import SkillTagsInput from '../../components/SkillTagsInput';
import SectionFeedback from '../../components/SectionFeedback';
import { htmlToPlainLines } from '../../utils/htmlUtils';
import PersonalInfoForm from '../../components/PersonalInfoForm';
import SummaryForm from '../../components/SummaryForm';
import ExperienceForm from '../../components/ExperienceForm';
import ProjectsForm from '../../components/ProjectsForm';
import EducationForm from '../../components/EducationForm';
import CertificationsForm from '../../components/CertificationsForm';


type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'customSections';

interface EditorFormStackProps {
  // Layout slots — pre-rendered by Dashboard, no cross-feature coupling
  atsPanel: ReactNode;
  versionPanel: ReactNode;
  chatPanel: ReactNode;

  // Section accordion
  openSections: Record<Section, boolean>;
  toggleSection: (section: Section) => void;

  // Resume data + mutations
  resume: any;

  // AI rewrite callbacks
  handleRewriteSummary: () => Promise<void>;
  isRewritingSummary: boolean;
  handleRewriteExperience: (id: string, text: string) => Promise<void>;
  rewritingExperienceId: string | null;

  // Mobile
  isMobile: boolean;
  setShowMobilePreview: (value: boolean) => void;
}

export default function EditorFormStack(props: EditorFormStackProps) {
  const {
    atsPanel,
    versionPanel,
    chatPanel,
    openSections,
    toggleSection,
    resume,
    handleRewriteSummary,
    isRewritingSummary,
    handleRewriteExperience,
    rewritingExperienceId,
    isMobile,
    setShowMobilePreview,
  } = props;

  return (
    <>
      {atsPanel}

      {versionPanel}

      <SectionHeader title="Personal Information" subtitle="Your contact details and links" icon={<User size={15} />} open={openSections.personal} onToggle={() => toggleSection('personal')} status={getSectionStatus('personal', resume)} />
      {openSections.personal && (
        <div className="p-5 bg-white">
          <SectionFeedback points={getPersonalFeedback(resume)} />
          <PersonalInfoForm data={resume.resumeData.personalInfo} onChange={resume.updatePersonalInfo} />
        </div>
      )}

      <SectionHeader title="Professional Summary" subtitle="A concise pitch that opens your resume" icon={<FileText size={15} />} open={openSections.summary} onToggle={() => toggleSection('summary')} status={getSectionStatus('summary', resume)} />
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

      <SectionHeader
        title="Skills"
        subtitle="Keywords ATS systems scan for"
        icon={<Wrench size={15} />}
        open={openSections.skills}
        onToggle={() => toggleSection('skills')}
        status={getSectionStatus('skills', resume)}
        badge={(() => {
          const cats = resume.resumeData.skillCategories;
          const count = cats?.length
            ? cats.reduce((n: number, c: { skills: string }) => n + c.skills.split(',').filter((s) => s.trim()).length, 0)
            : resume.resumeData.skills.split(',').filter((s: string) => s.trim()).length;
          return count > 0 ? `(${count} skills)` : undefined;
        })()}
      />
      {openSections.skills && (() => {
        const categorized = !!(resume.resumeData.skillCategories?.length);
        const cats = resume.resumeData.skillCategories ?? [];
        // Derive skillTags from skills string if not yet set
        const skillTags: SkillTag[] = resume.resumeData.skillTags ??
          resume.resumeData.skills.split(',').map((s: string) => s.trim()).filter(Boolean).map((name: string) => ({ name }));
        return (
          <div className="p-5 bg-white">
            <SectionFeedback points={getSkillsFeedback(resume)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p className="text-xs text-slate-500 font-medium">{categorized ? 'Skills by category' : 'Skill tags'}</p>
              <button
                onClick={() => {
                  if (categorized) {
                    const flat = cats.map((c: { skills: string }) => c.skills.trim()).filter(Boolean).join(', ');
                    if (flat) resume.updateSkills(flat);
                    resume.replaceSkillCategories([]);
                  } else {
                    const seeded = DEFAULT_SKILL_CATEGORIES.map((c, i) =>
                      i === 0 ? { ...c, skills: resume.resumeData.skills } : { ...c }
                    );
                    resume.replaceSkillCategories(seeded);
                  }
                }}
                className="text-xs font-semibold px-3 py-1 rounded-full border transition-colors"
                style={{
                  background: categorized ? '#eff6ff' : '#f8fafc',
                  color: categorized ? '#2563eb' : '#64748b',
                  borderColor: categorized ? '#bfdbfe' : '#e2e8f0',
                }}
              >
                {categorized ? '✕ Simple mode' : '⊞ Split by category'}
              </button>
            </div>

            {categorized ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cats.map((cat: { id: string; label: string; skills: string }) => (
                  <div key={cat.id}>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">{cat.label}</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-slate-800 placeholder-slate-400"
                      style={{ fontSize: 11 }}
                      value={cat.skills}
                      onChange={(e) => resume.updateSkillCategory(cat.id, 'skills', e.target.value)}
                      placeholder={
                        cat.id === 'languages' ? 'Python 3.11, TypeScript 5, Go 1.22...' :
                        cat.id === 'frameworks' ? 'React 18, FastAPI 0.110, Django 5...' :
                        cat.id === 'databases' ? 'PostgreSQL 16, Redis 7, MongoDB 7...' :
                        cat.id === 'devops' ? 'Docker, Kubernetes, GitHub Actions...' :
                        'Microservices, Event-Driven, REST...'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <SkillTagsInput
                tags={skillTags}
                onChange={resume.updateSkillTags}
              />
            )}
          </div>
        );
      })()}

      <SectionHeader title="Work Experience" subtitle="Add details about jobs and internships" icon={<Briefcase size={15} />} open={openSections.experience} onToggle={() => toggleSection('experience')} status={getSectionStatus('experience', resume)} />
      {openSections.experience && (
        <div className="p-5 bg-white">
          <SectionFeedback points={getExperienceFeedback(resume)} />
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

      <SectionHeader title="Projects" subtitle="Side projects, open source, hackathons" icon={<FolderOpen size={15} />} open={openSections.projects} onToggle={() => toggleSection('projects')} status={getSectionStatus('projects', resume)} />
      {openSections.projects && (
        <div className="p-5 bg-white">
          <SectionFeedback points={getProjectsFeedback(resume)} />
          <ProjectsForm
            projects={resume.resumeData.projects}
            onAdd={resume.addProject}
            onUpdate={resume.updateProject}
            onRemove={resume.removeProject}
          />
        </div>
      )}

      <SectionHeader title="Education" subtitle="Degrees, diplomas, and coursework" icon={<GraduationCap size={15} />} open={openSections.education} onToggle={() => toggleSection('education')} status={getSectionStatus('education', resume)} />
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

      <SectionHeader title="Certifications" subtitle="Licenses, badges, and credentials" icon={<Award size={15} />} open={openSections.certifications} onToggle={() => toggleSection('certifications')} />
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

      <SectionHeader title="Custom Sections" subtitle="Awards, publications, volunteer work, etc." icon={<Plus size={15} />} open={openSections.customSections} onToggle={() => toggleSection('customSections')} />
      {openSections.customSections && (
        <div className="p-5 bg-white border-b border-transparent">
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: '#166534', lineHeight: 1.5, marginBottom: 12 }}>
            <strong>ATS tip:</strong> Use standard headings ATS systems recognise: <em>Volunteer Experience, Publications, Awards, Open Source, Languages, Interests</em>. Avoid creative labels like "My Journey" — ATS may skip the section entirely.
          </div>
          {(resume.resumeData.customSections ?? []).length === 0 ? (
            <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>No custom sections yet. Import a PDF to populate them.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(resume.resumeData.customSections ?? []).map((cs: any) => (
                <div key={cs.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', background: '#f8fafc' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{cs.heading}</div>
                  {cs.items.map((item: any) => (
                    <div key={item.id} style={{ fontSize: 11.5, color: '#475569', paddingLeft: 8, borderLeft: '2px solid #e2e8f0', marginBottom: 2 }}>
                      {item.title}{item.subtitle ? ` — ${item.subtitle}` : ''}{item.date ? ` (${item.date})` : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {chatPanel}

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview Resume
          </button>
        </div>
      )}

      <div style={{ height: 32 }} />
    </>
  );
}

type SectionStatus = 'complete' | 'needs-work' | 'empty';

function getSectionStatus(section: Section, resume: any): SectionStatus {
  switch (section) {
    case 'personal':
      return (resume.resumeData.personalInfo.name && resume.resumeData.personalInfo.email) ? 'complete'
        : resume.resumeData.personalInfo.name ? 'needs-work' : 'empty';
    case 'summary':
      return resume.resumeData.summary.length > 50 ? 'complete'
        : resume.resumeData.summary.length > 0 ? 'needs-work' : 'empty';
    case 'skills': {
      const count = resume.resumeData.skills.split(',').filter((s: string) => s.trim()).length;
      return count > 3 ? 'complete' : count > 0 ? 'needs-work' : 'empty';
    }
    case 'experience':
      return resume.resumeData.experiences.length > 0 ? 'complete' : 'empty';
    case 'projects':
      return resume.resumeData.projects.length > 0 ? 'complete' : 'empty';
    case 'education':
      return resume.resumeData.education.length > 0 ? 'complete' : 'empty';
    default:
      return 'empty';
  }
}

function getPersonalFeedback(resume: any): string[] {
  const tips: string[] = [];
  const p = resume.resumeData.personalInfo;
  if (!p.linkedin) tips.push('Add your LinkedIn URL — recruiters check it before scheduling interviews.');
  if (!p.github) tips.push('Add your GitHub URL to showcase your code and projects.');
  return tips;
}

function getSkillsFeedback(resume: any): string[] {
  const tips: string[] = [];
  const skills: string[] = resume.resumeData.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  if (skills.length < 4) {
    tips.push('Add at least 4–6 skills — ATS systems score based on keyword match rate.');
  }
  const allBullets = resume.resumeData.experiences
    .flatMap((e: any) => htmlToPlainLines(e.description))
    .join(' ')
    .toLowerCase();
  const orphanSkills = skills.filter(s => s.length > 2 && !allBullets.includes(s));
  if (orphanSkills.length > 0) {
    tips.push(`Skills listed but not mentioned in experience: ${orphanSkills.slice(0, 3).join(', ')}. Add them to a bullet for stronger ATS match.`);
  }
  return tips;
}

function getExperienceFeedback(resume: any): string[] {
  const tips: string[] = [];
  const allBullets = resume.resumeData.experiences.flatMap((e: any) => htmlToPlainLines(e.description));
  if (allBullets.length === 0) return tips;
  const withMetric = allBullets.filter((l: string) => /\d+[%$kKmMx]?|\d{2,}/.test(l)).length;
  if (withMetric / allBullets.length < 0.5) {
    tips.push('Less than half your bullets have numbers. Quantify impact: "Reduced latency by 40%" beats "Improved performance".');
  }
  const weakPhrases = ['responsible for', 'worked on', 'helped with', 'assisted in'];
  const hasWeak = allBullets.some((l: string) => weakPhrases.some(p => l.toLowerCase().includes(p)));
  if (hasWeak) {
    tips.push('Replace weak phrases like "responsible for" or "worked on" with strong action verbs: Led, Built, Reduced, Increased.');
  }
  return tips;
}

function getProjectsFeedback(resume: any): string[] {
  const tips: string[] = [];
  const missingLink = resume.resumeData.projects.filter((p: any) => !p.hidden && !p.link);
  if (missingLink.length > 0) {
    tips.push(`${missingLink.length} project(s) have no link. Add a GitHub repo or live demo URL — it builds credibility.`);
  }
  return tips;
}

function SectionHeader({
  title,
  subtitle,
  icon,
  open,
  onToggle,
  badge,
  status,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  status?: SectionStatus;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${open ? 'bg-surface-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50 border-b border-slate-100'}`}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && <span style={{ color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}>{icon}</span>}
        <span style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="text-sm font-semibold text-slate-700 tracking-tight">{title}</span>
            {badge && <span className="text-xs text-slate-400 font-normal">{badge}</span>}
            {status === 'complete' && (
              <span style={{ fontSize: 10, fontWeight: 600, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap' as const }}>✓ Done</span>
            )}
            {status === 'needs-work' && (
              <span style={{ fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap' as const }}>Needs attention</span>
            )}
          </span>
          {subtitle && <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 400, marginTop: 1 }}>{subtitle}</span>}
        </span>
      </span>
      <span className={`text-xs text-slate-400 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ flexShrink: 0, marginLeft: 8 }}>▼</span>
    </button>
  );
}
