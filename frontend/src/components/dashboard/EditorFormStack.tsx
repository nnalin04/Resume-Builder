import { useState } from 'react';
import { SectionHeader } from '../common/SectionHeader';
import PersonalInfoForm from '../PersonalInfoForm';
import SummaryForm from '../SummaryForm';
import ExperienceForm from '../ExperienceForm';
import ProjectsForm from '../ProjectsForm';
import EducationForm from '../EducationForm';
import CertificationsForm from '../CertificationsForm';
import { useResumeState } from '../../hooks/useResumeState';
import { DEFAULT_SKILL_CATEGORIES } from '../../utils/skillUtils';

export type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications' | 'customSections';

interface EditorFormStackProps {
  handleRewriteSummary: () => void;
  isRewritingSummary: boolean;
  handleRewriteExperience: (id: string, text: string) => void;
  rewritingExperienceId: string | null;
  resume: ReturnType<typeof useResumeState>;
}

export function EditorFormStack({
  handleRewriteSummary,
  isRewritingSummary,
  handleRewriteExperience,
  rewritingExperienceId,
  resume,
}: EditorFormStackProps) {
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    personal: false, summary: false, skills: false,
    experience: false, projects: false, education: false, certifications: false,
    customSections: false,
  });

  const toggleSection = (s: Section) =>
    setOpenSections(prev => {
      const wasOpen = prev[s];
      const allClosed: Record<Section, boolean> = {
        personal: false, summary: false, skills: false,
        experience: false, projects: false, education: false, certifications: false,
        customSections: false,
      };
      return wasOpen ? allClosed : { ...allClosed, [s]: true };
    });

  return (
    <>
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
      <SectionHeader
        title="Skills"
        open={openSections.skills}
        onToggle={() => toggleSection('skills')}
        badge={(() => {
          const cats = resume.resumeData.skillCategories;
          const count = cats?.length
            ? cats.reduce((n: number, c: any) => n + c.skills.split(',').filter((s: string) => s.trim()).length, 0)
            : resume.resumeData.skills.split(',').filter((s: string) => s.trim()).length;
          return count > 0 ? `(${count} skills)` : undefined;
        })()}
      />
      {openSections.skills && (() => {
        const categorized = !!(resume.resumeData.skillCategories?.length);
        const cats = resume.resumeData.skillCategories ?? [];
        return (
          <div className="p-5 bg-white">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p className="text-xs text-slate-500 font-medium">{categorized ? 'Skills by category' : 'Comma-separated list of skills'}</p>
              <button
                onClick={() => {
                  if (categorized) {
                    const flat = cats.map((c: any) => c.skills.trim()).filter(Boolean).join(', ');
                    if (flat) resume.updateSkills(flat);
                    resume.replaceSkillCategories([]);
                  } else {
                    const seeded = DEFAULT_SKILL_CATEGORIES.map((c: any, i: number) =>
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
                {cats.map((cat: any) => (
                  <div key={cat.id}>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">{cat.label}</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-slate-800 placeholder-slate-400"
                      style={{ fontSize: 11 }}
                      value={cat.skills}
                      onChange={e => resume.updateSkillCategory(cat.id, 'skills', e.target.value)}
                      placeholder={
                        cat.id === 'languages'    ? 'Python 3.11, TypeScript 5, Go 1.22...' :
                        cat.id === 'frameworks'   ? 'React 18, FastAPI 0.110, Django 5...' :
                        cat.id === 'databases'    ? 'PostgreSQL 16, Redis 7, MongoDB 7...' :
                        cat.id === 'devops'       ? 'Docker, Kubernetes, GitHub Actions...' :
                        'Microservices, Event-Driven, REST...'
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow text-slate-800 placeholder-slate-400"
                style={{ fontSize: 11 }}
                rows={3}
                value={resume.resumeData.skills}
                onChange={e => resume.updateSkills(e.target.value)}
                placeholder="Python 3.11, React 18, TypeScript 5, System Design..."
              />
            )}
          </div>
        );
      })()}

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

      {/* Custom Sections */}
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
    </>
  );
}
