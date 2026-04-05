import type { ReactNode } from 'react';
import type { SkillTag } from '../../types/resumeTypes';

import { DEFAULT_SKILL_CATEGORIES } from '../../utils/skillUtils';
import SkillTagsInput from '../../components/SkillTagsInput';
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

      <SectionHeader title="Personal Information" open={openSections.personal} onToggle={() => toggleSection('personal')} />
      {openSections.personal && <div className="p-5 bg-white"><PersonalInfoForm data={resume.resumeData.personalInfo} onChange={resume.updatePersonalInfo} /></div>}

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

      <SectionHeader
        title="Skills"
        open={openSections.skills}
        onToggle={() => toggleSection('skills')}
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

      <SectionHeader title="Custom Sections" open={openSections.customSections} onToggle={() => toggleSection('customSections')} />
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

function SectionHeader({ title, open, onToggle, badge }: { title: string; open: boolean; onToggle: () => void; badge?: string }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${open ? 'bg-surface-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50 border-b border-slate-100'}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 tracking-tight">{title}</span>
        {badge && <span className="text-xs text-slate-400 font-normal">{badge}</span>}
      </span>
      <span className={`text-xs text-slate-400 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
    </button>
  );
}
