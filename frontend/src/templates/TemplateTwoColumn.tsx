import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { htmlToLines } from '../utils/htmlUtils';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';
import { getSkillSections } from '../utils/skillUtils';

interface Props { data: ResumeData; fontSize?: FontSize; }

function ColHeader({ title, fm }: { title: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  return (
    <div className="resume-section-title" style={{
      fontSize: f(11),
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.1em',
      color: '#1565C0',
      marginBottom: '8px',
      marginTop: '0px',
      lineHeight: 1.2,
    }}>{title}</div>
  );
}

function ArrowBullets({ text, fm }: { text: string; fm: number }) {
  const f = (px: number) => Math.round(px * fm * 10) / 10;
  const lines = htmlToLines(text);
  if (!lines.length) return null;
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: '5px', marginBottom: f(1.5), alignItems: 'flex-start', overflowWrap: 'break-word' as const, minWidth: 0 }}>
          <span style={{ color: '#444', fontWeight: 400, flexShrink: 0, fontSize: f(11), lineHeight: 1.45, marginTop: f(1) }}>→</span>
          <span style={{ fontSize: f(10.5), color: '#222', lineHeight: 1.45, flex: 1, minWidth: 0 }}>
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

export default function TemplateTwoColumn({ data, fontSize = 'small' }: Props) {
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
      color: '#1a1a1a',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header — white background, centered */}
      <div style={{ padding: '22px 48px 10px', textAlign: 'center' }}>
        <div style={{
          fontSize: f(30),
          fontWeight: 700,
          color: '#111',
          marginBottom: '4px',
          lineHeight: 1.2,
          letterSpacing: '0.01em',
        }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.5), color: '#444', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 4px', lineHeight: 1.6 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="#555" /> {p.location}</span>}
          {p.location && p.phone && <span style={{ color: '#aaa' }}>|</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="#555" /> {p.phone}</span>}
          {p.phone && p.linkedin && <span style={{ color: '#aaa' }}>|</span>}
          {p.linkedin && <a href={p.linkedin} style={{ color: '#1565C0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="#1565C0" /> Linkedin</a>}
          {p.linkedin && p.email && <span style={{ color: '#aaa' }}>|</span>}
          {p.email && <a href={`mailto:${p.email}`} style={{ color: '#1565C0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="#1565C0" /> {p.email}</a>}
          {p.email && p.github && <span style={{ color: '#aaa' }}>|</span>}
          {p.github && <a href={p.github} style={{ color: '#1565C0', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="#1565C0" /> GitHub</a>}
        </div>
      </div>

      {/* Divider line */}
      <div style={{ height: '1px', background: '#c0c0c0' }} />

      {/* Summary strip — light gray background */}
      {summary && (
        <div style={{
          background: '#f4f4f4',
          padding: '8px 48px',
          fontSize: f(10.7),
          color: '#333',
          lineHeight: 1.55,
          borderBottom: '1px solid #e0e0e0',
        }}>
          {summary}
        </div>
      )}

      {/* Two-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left column — Work Experience (~57%) */}
        <div style={{ width: '57%', padding: '14px 20px 18px 48px', borderRight: '1px solid #d0d0d0', overflow: 'hidden', overflowWrap: 'break-word' as const, wordBreak: 'break-word' as const, boxSizing: 'border-box' as const }}>
          {visibleExperiences.length > 0 && (
            <>
              <ColHeader title="Work Experience" fm={fm} />
              {visibleExperiences.map((exp, idx) => (
                <div key={exp.id} className="resume-item" style={{ marginBottom: idx < visibleExperiences.length - 1 ? '12px' : '0' }}>
                  {/* Company + date row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1px', flexWrap: 'wrap', gap: '2px 8px' }}>
                    <span style={{ fontSize: f(11), fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{exp.company}</span>
                    <span style={{ fontSize: f(10), color: '#555', flexShrink: 0 }}>
                      {exp.startDate}{exp.startDate && '-'}{exp.currentlyWorking ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {/* Position (subtle, italic) */}
                  {exp.position && (
                    <div style={{ fontSize: f(10.3), color: '#555', fontStyle: 'italic', marginBottom: '3px', lineHeight: 1.2 }}>
                      {exp.position}{exp.location && ` · ${exp.location}`}
                    </div>
                  )}
                  {exp.description && <ArrowBullets text={exp.description} fm={fm} />}
                </div>
              ))}
            </>
          )}

          {/* Custom Sections */}
          {customSections && customSections.length > 0 && customSections.map(cs => (
            <div key={cs.id} style={{ marginBottom: '14px', marginTop: '12px' }}>
              <ColHeader title={cs.heading} fm={fm} />
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

        {/* Right column — Skills + Projects + Education (~43%) */}
        <div style={{ width: '43%', padding: '14px 30px 18px 20px', overflow: 'hidden', overflowWrap: 'break-word' as const, wordBreak: 'break-word' as const, boxSizing: 'border-box' as const }}>
          {/* Skills */}
          {skillSections.some(sec => sec.items.length > 0) && (
            <div style={{ marginBottom: '14px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <ColHeader title="Skills" fm={fm} />
              <div style={{
                background: '#dce8f7', border: '1.5px solid #90bde8',
                borderRadius: '8px', padding: '10px 13px', fontSize: f(10.5), color: '#1a1a1a', lineHeight: 1.65,
              }}>
                {skillSections.filter(sec => sec.items.length > 0).map((sec, si) => (
                  <div key={si}>
                    {sec.label && <span style={{ fontWeight: 700 }}>{sec.label}: </span>}
                    {sec.items.join(', ')}
                    {si < skillSections.filter(s => s.items.length > 0).length - 1 && <br />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Projects */}
          {visibleProjects.length > 0 && (
            <div style={{ marginBottom: '14px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <ColHeader title="Personal Projects" fm={fm} />
              {visibleProjects.map(proj => (
                <div key={proj.id} className="resume-item" style={{ marginBottom: '8px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(10.7), fontWeight: 700, color: '#111', marginBottom: '3px', lineHeight: 1.3 }}>
                    {proj.name}
                    {proj.link && <a href={proj.link} style={{ marginLeft: '5px', fontSize: f(10), color: '#1565C0', fontWeight: 400 }}>↗</a>}
                  </div>
                  {proj.description && <ArrowBullets text={proj.description} fm={fm} />}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {visibleEducation.length > 0 && (
            <div>
              <ColHeader title="Education" fm={fm} />
              {visibleEducation.map(edu => (
                <div key={edu.id} className="resume-item" style={{ marginBottom: '6px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(10.7), color: '#111', lineHeight: 1.4 }}>
                    {edu.institution}{edu.year && ` (${edu.start_year ? `${edu.start_year} – ${edu.year}` : edu.year})`}
                  </div>
                  <div style={{ fontSize: f(10.3), color: '#444', lineHeight: 1.4 }}>
                    {edu.degree}{edu.field && `, ${edu.field}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {visibleCertifications.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              <ColHeader title="Certifications" fm={fm} />
              {visibleCertifications.map(cert => (
                <div key={cert.id} className="resume-item" style={{ marginBottom: '5px', breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                  <div style={{ fontSize: f(10.7), fontWeight: 600, color: '#111', lineHeight: 1.4 }}>{cert.name}</div>
                  {(cert.issuer || cert.date) && (
                    <div style={{ fontSize: f(10.3), color: '#444', lineHeight: 1.4 }}>
                      {cert.issuer}{cert.issuer && cert.date && ' · '}{cert.date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
