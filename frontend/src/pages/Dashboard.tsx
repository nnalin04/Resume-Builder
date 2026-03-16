import { useState } from 'react';
import { useResumeState } from '../hooks/useResumeState';
import type { TemplateId } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import PersonalInfoForm from '../components/PersonalInfoForm';
import SummaryForm from '../components/SummaryForm';
import ExperienceForm from '../components/ExperienceForm';
import ProjectsForm from '../components/ProjectsForm';
import EducationForm from '../components/EducationForm';
import TemplateClassic from '../templates/TemplateClassic';
import TemplateModern from '../templates/TemplateModern';
import TemplateProfessional from '../templates/TemplateProfessional';
import TemplateTwoColumn from '../templates/TemplateTwoColumn';
import TemplateClean from '../templates/TemplateClean';
import { exportToPDF } from '../utils/pdfExport';

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'twocolumn', label: 'Two Column' },
  { id: 'clean', label: 'Clean' },
];

const RESUME_W = 794;
const RESUME_H = 1123;

type Section = 'personal' | 'summary' | 'skills' | 'experience' | 'projects' | 'education';

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 transition-colors"
    >
      <span className="text-sm font-semibold text-gray-700">{title}</span>
      <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
    </button>
  );
}

export default function Dashboard() {
  const resume = useResumeState();
  const [template, setTemplate] = useState<TemplateId>('classic');
  const [fontSize, setFontSize] = useState<FontSize>('small');
  const [openSections, setOpenSections] = useState<Record<Section, boolean>>({
    personal: true, summary: true, skills: true,
    experience: true, projects: false, education: false,
  });
  const [exporting, setExporting] = useState(false);

  const toggleSection = (s: Section) =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToPDF('resume-preview');
    } finally {
      setExporting(false);
    }
  };

  const PreviewComponent = {
    classic: TemplateClassic,
    modern: TemplateModern,
    professional: TemplateProfessional,
    twocolumn: TemplateTwoColumn,
    clean: TemplateClean,
  }[template];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f3f4f6' }}>

      {/* Top Nav */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, background: '#2563EB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>R</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>Resume Builder</span>
        </div>

        {/* Template selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Template:</span>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: template === t.id ? '#2563EB' : '#f3f4f6',
                color: template === t.id ? '#fff' : '#4b5563',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Font size selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Font:</span>
          {(['small', 'medium', 'large'] as FontSize[]).map(s => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: fontSize === s ? '#374151' : '#f3f4f6',
                color: fontSize === s ? '#fff' : '#4b5563',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', background: exporting ? '#93c5fd' : '#2563EB',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {exporting ? '⟳ Exporting…' : '↓ Download PDF'}
        </button>
      </header>

      {/* Main panels */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT: Editor */}
        <div style={{ width: '38%', flexShrink: 0, overflowY: 'auto', background: '#fff', borderRight: '1px solid #e5e7eb' }}>

          <SectionHeader title="Personal Information" open={openSections.personal} onToggle={() => toggleSection('personal')} />
          {openSections.personal && <div style={{ padding: 16 }}><PersonalInfoForm data={resume.resumeData.personalInfo} onChange={resume.updatePersonalInfo} /></div>}

          <SectionHeader title="Professional Summary" open={openSections.summary} onToggle={() => toggleSection('summary')} />
          {openSections.summary && <div style={{ padding: 16 }}><SummaryForm value={resume.resumeData.summary} onChange={resume.updateSummary} /></div>}

          <SectionHeader title="Skills" open={openSections.skills} onToggle={() => toggleSection('skills')} />
          {openSections.skills && (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Comma-separated list of skills</p>
              <textarea
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', fontSize: 13, resize: 'none', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                rows={3}
                value={resume.resumeData.skills}
                onChange={e => resume.updateSkills(e.target.value)}
                placeholder="Java, Spring Boot, Docker, Kubernetes..."
              />
            </div>
          )}

          <SectionHeader title="Work Experience" open={openSections.experience} onToggle={() => toggleSection('experience')} />
          {openSections.experience && (
            <div style={{ padding: 16 }}>
              <ExperienceForm
                experiences={resume.resumeData.experiences}
                onAdd={resume.addExperience}
                onUpdate={resume.updateExperience}
                onRemove={resume.removeExperience}
              />
            </div>
          )}

          <SectionHeader title="Projects" open={openSections.projects} onToggle={() => toggleSection('projects')} />
          {openSections.projects && (
            <div style={{ padding: 16 }}>
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
            <div style={{ padding: 16 }}>
              <EducationForm
                education={resume.resumeData.education}
                onAdd={resume.addEducation}
                onUpdate={resume.updateEducation}
                onRemove={resume.removeEducation}
              />
            </div>
          )}

          <div style={{ height: 32 }} />
        </div>

        {/* RIGHT: Preview */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#e5e7eb', padding: '28px 24px 48px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: RESUME_W * 0.88, height: RESUME_H * 0.88, flexShrink: 0 }}>
            <div style={{
              transform: 'scale(0.88)',
              transformOrigin: 'top left',
              width: RESUME_W,
              height: RESUME_H,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <PreviewComponent data={resume.resumeData} fontSize={fontSize} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
