import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

const NAVY = '#1a2744';

export default function TemplateFinance({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const allSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div id="resume-preview" style={{
      fontFamily: '"Times New Roman", Georgia, serif',
      fontSize: f(10.9),
      color: '#111',
      background: '#fff',
      width: '794px',
      height: '1123px',
      overflow: 'hidden',
      padding: '42px 50px 36px',
      lineHeight: 1.4,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header — centered, formal */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: f(22), fontWeight: 700, color: NAVY, letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ height: '0.5px', background: NAVY, margin: '4px 0' }} />
        <div style={{ fontSize: f(9.8), color: '#444', display: 'flex', justifyContent: 'center', flexWrap: 'wrap' as const, gap: '0 12px', marginTop: 4 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="#444" size={10} /> {p.location}</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="#444" size={10} /> {p.phone}</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="#444" size={10} /> {p.email}</span>}
          {p.linkedin && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="#444" size={10} /> LinkedIn</span>}
          {p.github && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="#444" size={10} /> GitHub</span>}
        </div>
        <div style={{ height: '0.5px', background: NAVY, margin: '4px 0' }} />
      </div>

      {summary && (
        <div style={{ marginBottom: 14 }}>
          <RuledSection title="Professional Summary" f={f} />
          <div style={{ fontSize: f(10.9), color: '#222', lineHeight: 1.5 }}>{summary}</div>
        </div>
      )}

      {experiences.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <RuledSection title="Professional Experience" f={f} />
          {experiences.map((e, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px' }}>
                <span style={{ fontSize: f(11.2), fontWeight: 700, color: NAVY }}>{e.position}</span>
                <span style={{ fontSize: f(10.2), color: '#444', flexShrink: 0 }}>{e.startDate} – {e.currentlyWorking ? 'Present' : e.endDate}</span>
              </div>
              <div style={{ fontSize: f(10.5), color: '#333', fontStyle: 'italic', marginBottom: 4 }}>{e.company}{e.location ? `, ${e.location}` : ''}</div>
              {e.description && e.description.split('\n').filter(Boolean).map((line, j) => (
                <div key={j} style={{ display: 'flex', gap: 7, marginBottom: 2, alignItems: 'flex-start' }}>
                  <span style={{ color: NAVY, fontWeight: 700, flexShrink: 0, fontSize: f(10.7) }}>•</span>
                  <span style={{ fontSize: f(10.5), lineHeight: 1.45, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <RuledSection title="Education" f={f} />
          {education.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: f(11), fontWeight: 700, color: NAVY }}>{e.degree}{e.field ? ` in ${e.field}` : ''}</div>
                <div style={{ fontSize: f(10.2), color: '#444', fontStyle: 'italic' }}>{e.institution}</div>
              </div>
              <span style={{ fontSize: f(10.2), color: '#444', flexShrink: 0 }}>{e.year}</span>
            </div>
          ))}
        </div>
      )}

      {allSkills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <RuledSection title="Skills & Expertise" f={f} />
          <div style={{ fontSize: f(10.5), color: '#222', lineHeight: 1.6 }}>
            {allSkills.join(' · ')}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <RuledSection title="Notable Projects" f={f} />
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: f(11), fontWeight: 700, color: NAVY }}>{proj.name}</div>
              {proj.description && <div style={{ fontSize: f(10.5), color: '#333', lineHeight: 1.45 }}>{proj.description}</div>}
            </div>
          ))}
        </div>
      )}

      {certifications && certifications.length > 0 && (
        <div>
          <RuledSection title="Certifications & Licenses" f={f} />
          {certifications.map((c, i) => (
            <div key={i} style={{ fontSize: f(10.5), color: '#333', marginBottom: 3 }}>
              {c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RuledSection({ title, f }: { title: string; f: (n: number) => number }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ fontSize: f(11), fontWeight: 700, color: NAVY, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ height: '0.5px', background: '#aab', margin: '3px 0 0' }} />
    </div>
  );
}
