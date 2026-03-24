import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

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
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);

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
      {skills && (
        <>
          <SectionTitle title="Skills" fm={fm} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 4px', marginBottom: '4px', alignItems: 'center' }}>
            {skillList.map((s, i) => (
              <span key={i} style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '3px',
                padding: '2px 6px',
                fontSize: f(10),
                color: '#2563EB',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                lineHeight: 1,
                whiteSpace: 'nowrap' as const,
              }}>{s}</span>
            ))}
          </div>
        </>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <>
          <SectionTitle title="Experience" fm={fm} />
          {experiences.map(exp => (
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
      {projects.length > 0 && (
        <>
          <SectionTitle title="Projects" fm={fm} />
          {projects.map(proj => (
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
      {education.length > 0 && (
        <>
          <SectionTitle title="Education" fm={fm} />
          {education.map(edu => (
            <div key={edu.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <div style={{ fontSize: f(11.1), fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{edu.institution}</div>
                <div style={{ fontSize: f(10.4), color: '#64748b', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` · ${edu.field}`}</div>
              </div>
              <div style={{ fontSize: f(10.4), color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '10px', lineHeight: 1.5, flexShrink: 0 }}>{edu.year}</div>
            </div>
          ))}
        </>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <>
          <SectionTitle title="Certifications" fm={fm} />
          {certifications.map(cert => (
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
    </div>
  );
}
