import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

function MainSection({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div className="resume-section-title" style={{ fontSize: f(12), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', paddingBottom: '2px', marginBottom: '5px', marginTop: '8px', lineHeight: 1.3 }}>
      {title}
    </div>
  );
}

function SideSection({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div className="resume-section-title" style={{ fontSize: f(11.3), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.3)', paddingBottom: '2px', marginBottom: '5px', marginTop: '10px', lineHeight: 1.3 }}>
      {title}
    </div>
  );
}

function BulletLines({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <>
      {text.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: '2px', alignItems: 'flex-start' }}>
          <span style={{ color: '#1e3a5f', fontWeight: 700, flexShrink: 0, fontSize: f(13.3), lineHeight: 1.2, marginTop: '1px' }}>›</span>
          <span style={{ fontSize: f(10.7), color: '#1e293b', lineHeight: 1.4, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
        </div>
      ))}
    </>
  );
}

export default function TemplateProfessional({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications, customSections } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const visibleExperiences = experiences.filter(e => !e.hidden);
  const visibleProjects = projects.filter(p => !p.hidden);
  const visibleEducation = education.filter(e => !e.hidden);
  const visibleCertifications = (certifications || []).filter(c => !c.hidden);

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: f(10.9),
      color: '#1e293b',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      display: 'flex',
      flexDirection: 'column' as const,
      lineHeight: 1.38,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Top Header Bar */}
      <div style={{ background: '#1e3a5f', color: '#fff', padding: '28px 45px 22px' }}>
        <div style={{ fontSize: f(26.7), fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '4px', lineHeight: 1.2 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.7), color: 'rgba(255,255,255,0.85)', display: 'flex', flexWrap: 'wrap', gap: '0 12px', lineHeight: 1.4 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="rgba(255,255,255,0.75)" /> {p.location}</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="rgba(255,255,255,0.75)" /> {p.phone}</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="rgba(255,255,255,0.75)" /> {p.email}</span>}
          {p.linkedin && <a href={p.linkedin} style={{ color: '#93c5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="#93c5fd" /> LinkedIn</a>}
          {p.github && <a href={p.github} style={{ color: '#93c5fd', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="#93c5fd" /> GitHub</a>}
        </div>
        {summary && (
          <div style={{ marginTop: '6px', fontSize: f(10.9), color: 'rgba(255,255,255,0.9)', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px' }}>
            {summary}
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left sidebar */}
        <div style={{ width: '36%', background: '#1e3a5f', padding: '15px 22px 22px', color: '#fff', overflow: 'hidden', overflowWrap: 'break-word' as const, wordBreak: 'break-word' as const }}>
          {skills && (
            <>
              <SideSection title="Skills" fm={fm} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 3px', alignItems: 'center' }}>
                {skills.split(',').map((s, i) => (
                  <span key={i} style={{
                    fontSize: f(9),
                    color: 'rgba(255,255,255,0.9)',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '3px',
                    padding: '2px 5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    lineHeight: 1,
                    whiteSpace: 'nowrap' as const,
                  }}>{s.trim()}</span>
                ))}
              </div>
            </>
          )}

          {visibleEducation.length > 0 && (
            <>
              <SideSection title="Education" fm={fm} />
              {visibleEducation.map(edu => (
                <div key={edu.id} className="resume-item" style={{ marginBottom: '8px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(10.7), fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{edu.institution}</div>
                  <div style={{ fontSize: f(10), color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` · ${edu.field}`}</div>
                  <div style={{ fontSize: f(10), color: '#93c5fd', lineHeight: 1.3 }}>{edu.year}</div>
                </div>
              ))}
            </>
          )}

          {visibleCertifications.length > 0 && (
            <>
              <SideSection title="Certifications" fm={fm} />
              {visibleCertifications.map(cert => (
                <div key={cert.id} className="resume-item" style={{ marginBottom: '6px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(10.7), fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{cert.name}</div>
                  {cert.issuer && <div style={{ fontSize: f(10), color: 'rgba(255,255,255,0.75)', lineHeight: 1.3 }}>{cert.issuer}</div>}
                  {cert.date && <div style={{ fontSize: f(10), color: '#93c5fd', lineHeight: 1.3 }}>{cert.date}</div>}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right main */}
        <div style={{ flex: 1, padding: '15px 30px 22px', overflow: 'hidden' }}>
          {visibleExperiences.length > 0 && (
            <>
              <MainSection title="Experience" fm={fm} />
              {visibleExperiences.map(exp => (
                <div key={exp.id} className="resume-item" style={{ marginBottom: '7px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px' }}>
                    <span style={{ fontSize: f(12), fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{exp.company}</span>
                    <span style={{ fontSize: f(10.3), color: '#64748b', lineHeight: 1.3, flexShrink: 0 }}>{exp.startDate}{exp.startDate && ' – '}{exp.currentlyWorking ? 'Present' : exp.endDate}</span>
                  </div>
                  <div style={{ fontSize: f(10.7), fontWeight: 600, color: '#1e3a5f', marginBottom: '3px', fontStyle: 'italic', lineHeight: 1.3 }}>
                    {exp.position}{exp.location && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {exp.location}</span>}
                  </div>
                  {exp.description && <BulletLines text={exp.description} fm={fm} />}
                </div>
              ))}
            </>
          )}

          {visibleProjects.length > 0 && (
            <>
              <MainSection title="Projects" fm={fm} />
              {visibleProjects.map(proj => (
                <div key={proj.id} className="resume-item" style={{ marginBottom: '5px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(11.1), fontWeight: 700, color: '#0f172a', marginBottom: '2px', lineHeight: 1.3 }}>
                    {proj.name}{proj.link && <a href={proj.link} style={{ marginLeft: '6px', color: '#1e3a5f', fontSize: f(10) }}>↗</a>}
                  </div>
                  {proj.description && <BulletLines text={proj.description} fm={fm} />}
                </div>
              ))}
            </>
          )}

          {/* Custom Sections */}
          {customSections && customSections.length > 0 && customSections.map(cs => (
            <div key={cs.id} style={{ marginBottom: '14px' }}>
              <MainSection title={cs.heading} fm={fm} />
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
      </div>
    </div>
  );
}
