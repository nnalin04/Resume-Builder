import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { htmlToLines } from '../utils/htmlUtils';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';
import { getSkillSections } from '../utils/skillUtils';

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
    <div className="resume-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', marginTop: '7px' }}>
      <span style={{ fontSize: f(11.3), fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: accent, whiteSpace: 'nowrap' as const }}>
        {title}
      </span>
      <div style={{ flex: 1, height: '1px', background: border }} />
    </div>
  );
}

function BulletLines({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  const lines = htmlToLines(text);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '0', marginBottom: f(1.5), alignItems: 'flex-start', overflowWrap: 'break-word' as const, minWidth: 0 }}>
          <span style={{ color: accent, fontWeight: 600, flexShrink: 0, fontSize: f(10.7), lineHeight: 1.36, paddingRight: '4px' }}>–</span>
          <span style={{ fontSize: f(10.7), color: body, lineHeight: 1.36, flex: 1, minWidth: 0 }}>
            {line.segments.map((seg, j) => (
              <span key={j} style={{
                fontWeight: seg.bold ? 700 : undefined,
                fontStyle: seg.italic ? 'italic' as const : undefined,
                textDecoration: [seg.underline && 'underline', seg.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
              }}>{seg.text}</span>
            ))}
          </span>
        </div>
      ))}
    </>
  );
}

export default function TemplateClean({ data, fontSize = 'small' }: Props) {
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
      {skillSections.some(sec => sec.items.length > 0) && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Skills" fm={fm} />
          {skillSections.filter(sec => sec.items.length > 0).map((sec, si) => (
            <div key={si} style={{ marginBottom: si < skillSections.filter(s => s.items.length > 0).length - 1 ? 6 : 0 }}>
              {sec.label && <div style={{ fontSize: f(9.5), fontWeight: 700, color: accent, marginBottom: 3 }}>{sec.label}</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 5px' }}>
                {sec.items.map((s, i) => (
                  <span key={i} style={{
                    background: tagBg, border: `1px solid ${tagBd}`, borderRadius: '3px',
                    padding: '1.5px 6px', fontSize: f(10.1), color: accent, fontWeight: 500,
                    display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' as const,
                  }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experience */}
      {visibleExperiences.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Experience" fm={fm} />
          {visibleExperiences.map(exp => (
            <div key={exp.id} className="resume-item" style={{ marginBottom: '7px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
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
      {visibleProjects.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Projects" fm={fm} />
          {visibleProjects.map(proj => (
            <div key={proj.id} className="resume-item" style={{ marginBottom: '6px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <div style={{ marginBottom: '2px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
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
      {visibleEducation.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Education" fm={fm} />
          {visibleEducation.map(edu => (
            <div key={edu.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <div style={{ fontSize: f(11), fontWeight: 600, color: black, lineHeight: 1.3 }}>{edu.institution}</div>
                <div style={{ fontSize: f(10.4), color: muted, marginTop: '1px', lineHeight: 1.3 }}>{edu.degree}{edu.field && ` — ${edu.field}`}</div>
              </div>
              <div style={{ fontSize: f(10.3), color: muted, flexShrink: 0, paddingTop: '1px' }}>{edu.start_year ? `${edu.start_year} – ${edu.year}` : edu.year}</div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {visibleCertifications.length > 0 && (
        <div style={{ marginTop: '7px' }}>
          <SecHeader title="Certifications" fm={fm} />
          {visibleCertifications.map(cert => (
            <div key={cert.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px', flexWrap: 'wrap', gap: '0 8px' }}>
              <div>
                <span style={{ fontSize: f(10.9), fontWeight: 600, color: black, lineHeight: 1.3 }}>{cert.name}</span>
                {cert.issuer && <span style={{ fontSize: f(10.4), color: muted }}> — {cert.issuer}</span>}
              </div>
              {cert.date && <div style={{ fontSize: f(10.3), color: muted, flexShrink: 0 }}>{cert.date}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Custom Sections */}
      {customSections && customSections.length > 0 && customSections.map(cs => (
        <div key={cs.id} style={{ marginTop: '7px', marginBottom: '14px' }}>
          <SecHeader title={cs.heading} fm={fm} />
          {cs.items.map(item => (
            <div key={item.id} className="resume-item" style={{ marginBottom: '5px' }}>
              <div style={{ fontSize: f(10.7), fontWeight: 600, color: black, lineHeight: 1.4 }}>
                {item.title}{item.date && ` · ${item.date}`}
              </div>
              {item.subtitle && <div style={{ fontSize: f(10.3), color: muted, fontStyle: 'italic', lineHeight: 1.4 }}>{item.subtitle}</div>}
              {item.description && <div style={{ fontSize: f(10.3), color: body, lineHeight: 1.5 }}>{item.description}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
