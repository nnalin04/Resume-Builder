import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';
import { getSkillSections } from '../utils/skillUtils';

interface Props { data: ResumeData; fontSize?: FontSize; }

function SectionTitle({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div className="resume-section-title" style={{
      fontSize: f(12.7),
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      color: '#3A6FA8',
      borderBottom: '1.8px solid #111',
      paddingBottom: '2px',
      marginBottom: '5px',
      marginTop: '8px',
      lineHeight: 1.3,
    }}>{title}</div>
  );
}

function BulletLines({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <>
      {text.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '2px', alignItems: 'flex-start' }}>
          <span style={{ color: '#3A6FA8', fontWeight: 700, flexShrink: 0, lineHeight: 1.4, fontSize: f(10.7), marginTop: '1px' }}>–</span>
          <span style={{ lineHeight: 1.4, fontSize: f(10.7), overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
        </div>
      ))}
    </>
  );
}

export default function TemplateClassic({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, certifications, customSections } = data;
  const fm = FONT_MULT[fontSize];
  const skillSections = getSkillSections(data);
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const visibleExperiences = experiences.filter(e => !e.hidden);
  const visibleProjects = projects.filter(p => !p.hidden);
  const visibleEducation = education.filter(e => !e.hidden);
  const visibleCertifications = (certifications || []).filter(c => !c.hidden);

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: f(10.9),
      color: '#1e1e1e',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      padding: '38px 45px 34px 45px',
      lineHeight: 1.38,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '7px' }}>
        <div style={{ fontSize: f(26.7), fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0f0f0f', marginBottom: '4px', lineHeight: 1.2 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.5), color: '#555', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 6px', lineHeight: 1.4 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="#555" /> {p.location}</span>}
          {p.location && p.phone && <span style={{ color: '#ccc' }}>|</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="#555" /> {p.phone}</span>}
          {p.phone && p.email && <span style={{ color: '#ccc' }}>|</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="#555" /> {p.email}</span>}
          {p.email && p.linkedin && <span style={{ color: '#ccc' }}>|</span>}
          {p.linkedin && <a href={p.linkedin} style={{ color: '#3A6FA8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="#3A6FA8" /> LinkedIn</a>}
          {p.linkedin && p.github && <span style={{ color: '#ccc' }}>|</span>}
          {p.github && <a href={p.github} style={{ color: '#3A6FA8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="#3A6FA8" /> GitHub</a>}
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #3A6FA8, transparent)', margin: '5px 0' }} />
        {summary && <div style={{ fontSize: f(10.9), color: '#222', lineHeight: 1.5, padding: '0 8px' }}>{summary}</div>}
      </div>

      {/* Skills */}
      {skillSections.some(sec => sec.items.length > 0) && (
        <>
          <SectionTitle title="Skills" fm={fm} />
          {skillSections.filter(sec => sec.items.length > 0).map((sec, si) => (
            <div key={si} style={{ marginBottom: si < skillSections.filter(s => s.items.length > 0).length - 1 ? 6 : 0 }}>
              {sec.label && <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#64748b', marginBottom: 3 }}>{sec.label}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 4px', marginBottom: '4px', alignItems: 'center' }}>
                {sec.items.map((s, i) => (
                  <span key={i} style={{
                    background: '#eef4fb', border: '1px solid #b8cfe8', borderRadius: '3px',
                    padding: '2px 6px', fontSize: f(10), color: '#3A6FA8', fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' as const,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Experience */}
      {visibleExperiences.length > 0 && (
        <>
          <SectionTitle title="Experience" fm={fm} />
          {visibleExperiences.map((exp, idx) => (
            <div key={exp.id} className="resume-item" style={{ marginBottom: '6px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const, paddingTop: idx > 0 ? '5px' : 0, borderTop: idx > 0 ? '1px dashed #ccc' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px' }}>
                <span style={{ fontSize: f(12), fontWeight: 700, color: '#0f0f0f', lineHeight: 1.3 }}>{exp.company}</span>
                <span style={{ fontSize: f(10.3), color: '#555', flexShrink: 0 }}>{exp.startDate}{exp.startDate && ' – '}{exp.currentlyWorking ? 'Present' : exp.endDate}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '3px', alignItems: 'center' }}>
                <span style={{ fontSize: f(10.7), fontWeight: 500, color: '#3A6FA8', fontStyle: 'italic', lineHeight: 1.3 }}>{exp.position}</span>
                {exp.location && <span style={{ fontSize: f(10), color: '#555' }}>{exp.location}</span>}
              </div>
              {exp.description && <BulletLines text={exp.description} fm={fm} />}
            </div>
          ))}
        </>
      )}

      {/* Projects */}
      {visibleProjects.length > 0 && (
        <>
          <SectionTitle title="Projects" fm={fm} />
          {visibleProjects.map((proj, idx) => (
            <div key={proj.id} className="resume-item" style={{ marginBottom: '5px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const, paddingTop: idx > 0 ? '4px' : 0, borderTop: idx > 0 ? '1px dashed #ccc' : 'none' }}>
              <div style={{ fontSize: f(11.1), fontWeight: 700, color: '#0f0f0f', marginBottom: '2px', lineHeight: 1.3 }}>
                {proj.name}{proj.link && <a href={proj.link} style={{ marginLeft: '6px', fontSize: f(10), color: '#3A6FA8' }}>↗</a>}
              </div>
              {proj.description && <BulletLines text={proj.description} fm={fm} />}
            </div>
          ))}
        </>
      )}

      {/* Education */}
      {visibleEducation.length > 0 && (
        <>
          <SectionTitle title="Education" fm={fm} />
          {visibleEducation.map((edu, idx) => (
            <div key={edu.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', paddingTop: idx > 0 ? '4px' : 0, borderTop: idx > 0 ? '1px dashed #ccc' : 'none', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <div style={{ fontSize: f(11.1), fontWeight: 600, color: '#0f0f0f', lineHeight: 1.3 }}>{edu.institution}</div>
                <div style={{ fontSize: f(10.4), color: '#555', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` — ${edu.field}`}</div>
              </div>
              <div style={{ fontSize: f(10.3), color: '#555', flexShrink: 0, paddingTop: '1px' }}>{edu.start_year ? `${edu.start_year} – ${edu.year}` : edu.year}</div>
            </div>
          ))}
        </>
      )}

      {/* Certifications */}
      {visibleCertifications.length > 0 && (
        <>
          <SectionTitle title="Certifications" fm={fm} />
          {visibleCertifications.map(cert => (
            <div key={cert.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <span style={{ fontSize: f(10.9), fontWeight: 600, color: '#0f0f0f', lineHeight: 1.3 }}>{cert.name}</span>
                {cert.issuer && <span style={{ fontSize: f(10.4), color: '#555', lineHeight: 1.3 }}> — {cert.issuer}</span>}
              </div>
              {cert.date && <div style={{ fontSize: f(10.3), color: '#555', flexShrink: 0 }}>{cert.date}</div>}
            </div>
          ))}
        </>
      )}

      {/* Custom Sections */}
      {customSections && customSections.length > 0 && customSections.map(cs => (
        <div key={cs.id} style={{ marginBottom: '14px' }}>
          <SectionTitle title={cs.heading} fm={fm} />
          {cs.items.map(item => (
            <div key={item.id} className="resume-item" style={{ marginBottom: '5px' }}>
              <div style={{ fontSize: f(10.7), fontWeight: 600, color: '#111', lineHeight: 1.4 }}>
                {item.title}{item.date && ` · ${item.date}`}
              </div>
              {item.subtitle && <div style={{ fontSize: f(10.3), color: '#555', fontStyle: 'italic', lineHeight: 1.4 }}>{item.subtitle}</div>}
              {item.description && <div style={{ fontSize: f(10.3), color: '#333', lineHeight: 1.5 }}>{item.description}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
