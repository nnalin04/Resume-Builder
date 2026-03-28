import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';
import { getSkillSections } from '../utils/skillUtils';

interface Props { data: ResumeData; fontSize?: FontSize; }

function SectionTitle({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div className="resume-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 5px' }}>
      <div style={{ width: '4px', height: '16px', background: '#2563EB', borderRadius: '2px', flexShrink: 0 }} />
      <span style={{ fontSize: f(12), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#1e293b', lineHeight: 1.3 }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  );
}

function BulletLines({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <>
      {text.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px', alignItems: 'flex-start' }}>
          <span style={{ color: '#2563EB', fontSize: f(13.3), lineHeight: 1.3, flexShrink: 0, marginTop: '0px' }}>•</span>
          <span style={{ fontSize: f(10.7), color: '#334155', lineHeight: 1.4, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
        </div>
      ))}
    </>
  );
}

export default function TemplateModern({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, certifications, customSections } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  const skillSections = getSkillSections(data);

  const visibleExperiences = experiences.filter(e => !e.hidden);
  const visibleProjects = projects.filter(p => !p.hidden);
  const visibleEducation = education.filter(e => !e.hidden);
  const visibleCertifications = (certifications || []).filter(c => !c.hidden);

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: f(10.9),
      color: '#334155',
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
      <div style={{ marginBottom: '8px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
        <div style={{ fontSize: f(26.7), fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: '3px', lineHeight: 1.2 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.7), color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0 10px', lineHeight: 1.4 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="#64748b" /> {p.location}</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="#64748b" /> {p.phone}</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="#64748b" /> {p.email}</span>}
          {p.linkedin && <a href={p.linkedin} style={{ color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="#2563EB" /> LinkedIn</a>}
          {p.github && <a href={p.github} style={{ color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="#2563EB" /> GitHub</a>}
        </div>
        {summary && (
          <div style={{ marginTop: '6px', fontSize: f(10.9), color: '#475569', lineHeight: 1.5, borderLeft: '3px solid #2563EB', paddingLeft: '8px' }}>
            {summary}
          </div>
        )}
      </div>

      {/* Skills */}
      {skillSections.some(sec => sec.items.length > 0) && (
        <>
          <SectionTitle title="Skills" fm={fm} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: '4px' }}>
            {skillSections.filter(sec => sec.items.length > 0).map((sec, si) => (
              <div key={si} style={{ flex: '1 1 180px', minWidth: '140px' }}>
                {sec.label && <div style={{ fontSize: f(9.3), fontWeight: 700, color: '#64748b', marginBottom: 2, textTransform: 'uppercase' as const, letterSpacing: '0.02em' }}>{sec.label}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 3px', alignItems: 'center', marginBottom: '4px' }}>
                  {sec.items.map((s, i) => (
                    <span key={i} style={{
                      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '3px',
                      padding: '1.5px 5px', fontSize: f(9.8), color: '#2563EB', fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' as const,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Experience */}
      {visibleExperiences.length > 0 && (
        <>
          <SectionTitle title="Experience" fm={fm} />
          {visibleExperiences.map(exp => (
            <div key={exp.id} className="resume-item" style={{ marginBottom: '7px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px' }}>
                <span style={{ fontSize: f(12), fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{exp.company}</span>
                <span style={{ fontSize: f(10.4), color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px', lineHeight: 1.5, flexShrink: 0 }}>
                  {exp.startDate}{exp.startDate && ' – '}{exp.currentlyWorking ? 'Present' : exp.endDate}
                </span>
              </div>
              <div style={{ fontSize: f(10.7), color: '#2563EB', fontWeight: 600, marginBottom: '3px', lineHeight: 1.3 }}>
                {exp.position}{exp.location && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {exp.location}</span>}
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
          {visibleProjects.map(proj => (
            <div key={proj.id} className="resume-item" style={{ marginBottom: '5px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <div style={{ fontSize: f(11.1), fontWeight: 700, color: '#0f172a', marginBottom: '2px', lineHeight: 1.3 }}>
                {proj.name}{proj.link && <a href={proj.link} style={{ marginLeft: '6px', fontSize: f(10), color: '#2563EB' }}>↗</a>}
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
          {visibleEducation.map(edu => (
            <div key={edu.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <div style={{ fontSize: f(11.1), fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{edu.institution}</div>
                <div style={{ fontSize: f(10.4), color: '#64748b', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` · ${edu.field}`}</div>
              </div>
              <div style={{ fontSize: f(10.4), color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px', lineHeight: 1.5, flexShrink: 0 }}>{edu.start_year ? `${edu.start_year} – ${edu.year}` : edu.year}</div>
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
                <span style={{ fontSize: f(10.9), fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{cert.name}</span>
                {cert.issuer && <span style={{ fontSize: f(10.4), color: '#64748b' }}> · {cert.issuer}</span>}
              </div>
              {cert.date && <div style={{ fontSize: f(10.4), color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px', lineHeight: 1.5, flexShrink: 0 }}>{cert.date}</div>}
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
