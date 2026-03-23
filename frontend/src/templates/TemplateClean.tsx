import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

const accent  = '#3A6FA8';
const black   = '#0f0f0f';
const body    = '#1e1e1e';
const muted   = '#555555';
const border  = '#d0d0d0';
const tagBg   = '#eef4fb';
const tagBd   = '#b8cfe8';

function SecHeader({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', marginTop: '7px' }}>
      <span style={{ fontSize: f(11.3), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: accent, whiteSpace: 'nowrap' as const }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '1px', background: border }} />
    </div>
  );
}

function BulletLines({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <>
      {text.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '0', marginBottom: '1.8px', alignItems: 'flex-start' }}>
          <span style={{ color: accent, fontWeight: 600, flexShrink: 0, fontSize: f(10.7), lineHeight: 1.36, paddingRight: '4px' }}>–</span>
          <span style={{ fontSize: f(10.7), color: body, lineHeight: 1.36, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
        </div>
      ))}
    </>
  );
}

export default function TemplateClean({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: f(10.9),
      color: body,
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      padding: '34px 45px 30px 45px',
      lineHeight: 1.4,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: f(28), fontWeight: 700, letterSpacing: '0.02em', color: black, marginBottom: '4px', lineHeight: 1.2 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.5), color: muted, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 6px', lineHeight: 1.4 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color={muted} /> {p.location}</span>}
          {p.location && p.phone && <span style={{ color: border }}>|</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color={muted} /> {p.phone}</span>}
          {p.phone && p.linkedin && <span style={{ color: border }}>|</span>}
          {p.linkedin && <a href={p.linkedin} style={{ color: accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color={accent} /> LinkedIn</a>}
          {p.linkedin && p.github && <span style={{ color: border }}>|</span>}
          {p.github && <a href={p.github} style={{ color: accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color={accent} /> GitHub</a>}
          {p.github && p.email && <span style={{ color: border }}>|</span>}
          {p.email && <a href={`mailto:${p.email}`} style={{ color: accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color={accent} /> {p.email}</a>}
        </div>
        <div style={{ height: '1px', background: `linear-gradient(to right, transparent, ${accent}, transparent)`, margin: '6px 0 5px' }} />
        {summary && (
          <p style={{ fontSize: f(10.9), color: body, textAlign: 'center', padding: '0 10px', lineHeight: 1.5, marginBottom: '2px' }}>
            {summary}
          </p>
        )}
      </div>

      {/* Skills */}
      {skillList.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Skills" fm={fm} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 5px' }}>
            {skillList.map((s, i) => (
              <span key={i} style={{
                background: tagBg, border: `1px solid ${tagBd}`, borderRadius: '3px',
                padding: '1.5px 6px', fontSize: f(10.1), color: accent, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' as const,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Experience" fm={fm} />
          {experiences.map(exp => (
            <div key={exp.id} style={{ marginBottom: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px' }}>
                <span style={{ fontSize: f(12), fontWeight: 700, color: black, lineHeight: 1.3 }}>{exp.company}</span>
                <span style={{ fontSize: f(10.3), color: muted, flexShrink: 0 }}>
                  {exp.startDate}{exp.startDate && ' – '}{exp.currentlyWorking ? 'Present' : exp.endDate}
                </span>
              </div>
              {(exp.position || exp.location) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  {exp.position && <span style={{ fontSize: f(10.7), fontWeight: 500, color: accent, lineHeight: 1.3 }}>{exp.position}</span>}
                  {exp.location && <span style={{ fontSize: f(10), color: muted }}>{exp.location}</span>}
                </div>
              )}
              {exp.description && <BulletLines text={exp.description} fm={fm} />}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Projects" fm={fm} />
          {projects.map(proj => (
            <div key={proj.id} style={{ marginBottom: '6px' }}>
              <div style={{ marginBottom: '2px' }}>
                <span style={{ fontSize: f(11), fontWeight: 700, color: black }}>
                  {proj.name}
                  {proj.link && <a href={proj.link} style={{ marginLeft: '6px', fontSize: f(10), color: accent, fontWeight: 400 }}>↗</a>}
                </span>
              </div>
              {proj.description && <BulletLines text={proj.description} fm={fm} />}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Education" fm={fm} />
          {education.map(edu => (
            <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <div style={{ fontSize: f(11), fontWeight: 600, color: black, lineHeight: 1.3 }}>{edu.institution}</div>
                <div style={{ fontSize: f(10.4), color: muted, marginTop: '1px', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` — ${edu.field}`}</div>
              </div>
              <div style={{ fontSize: f(10.3), color: muted, flexShrink: 0, paddingTop: '1px' }}>{edu.year}</div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Certifications" fm={fm} />
          {certifications.map(cert => (
            <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <span style={{ fontSize: f(10.9), fontWeight: 600, color: black, lineHeight: 1.3 }}>{cert.name}</span>
                {cert.issuer && <span style={{ fontSize: f(10.4), color: muted }}> — {cert.issuer}</span>}
              </div>
              {cert.date && <div style={{ fontSize: f(10.3), color: muted, flexShrink: 0 }}>{cert.date}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
