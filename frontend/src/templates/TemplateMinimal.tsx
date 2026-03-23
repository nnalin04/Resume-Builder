import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

export default function TemplateMinimal({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const allSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const ACCENT = '#6b7280';

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Georgia, serif',
      fontSize: f(10.9),
      color: '#1a1a1a',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      padding: '50px 55px 40px 55px',
      lineHeight: 1.45,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: f(28), fontWeight: 700, letterSpacing: '0.02em', color: '#111', marginBottom: 6 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ fontSize: f(10.2), color: '#6b7280', display: 'flex', flexWrap: 'wrap' as const, gap: '0 14px', lineHeight: 1.5 }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color={ACCENT} size={10} /> {p.location}</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color={ACCENT} size={10} /> {p.phone}</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color={ACCENT} size={10} /> {p.email}</span>}
          {p.linkedin && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color={ACCENT} size={10} /> LinkedIn</span>}
          {p.github && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color={ACCENT} size={10} /> GitHub</span>}
        </div>
      </div>

      {summary && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Profile</div>
          <div style={{ fontSize: f(10.7), color: '#374151', lineHeight: 1.55 }}>{summary}</div>
        </div>
      )}

      {experiences.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Experience</div>
          {experiences.map((e, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 1 }}>
                <span style={{ fontSize: f(11), fontWeight: 700, color: '#111' }}>{e.position}</span>
                <span style={{ fontSize: f(9.5), color: '#9ca3af', flexShrink: 0 }}>{e.startDate} – {e.currentlyWorking ? 'Present' : e.endDate}</span>
              </div>
              <div style={{ fontSize: f(10.2), color: '#6b7280', marginBottom: 4 }}>{e.company}{e.location ? ` · ${e.location}` : ''}</div>
              {e.description && e.description.split('\n').filter(Boolean).map((line, j) => (
                <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 1, alignItems: 'flex-start' }}>
                  <span style={{ color: '#d1d5db', flexShrink: 0, lineHeight: 1.5, fontSize: f(10.7) }}>–</span>
                  <span style={{ fontSize: f(10.5), color: '#374151', lineHeight: 1.5, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Education</div>
          {education.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: f(11), fontWeight: 700, color: '#111' }}>{e.degree}{e.field ? ` in ${e.field}` : ''}</div>
                <div style={{ fontSize: f(10.2), color: '#6b7280' }}>{e.institution}</div>
              </div>
              <span style={{ fontSize: f(9.5), color: '#9ca3af', flexShrink: 0 }}>{e.year}</span>
            </div>
          ))}
        </div>
      )}

      {allSkills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Skills</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 6px' }}>
            {allSkills.map((s, i) => (
              <span key={i} style={{ fontSize: f(10.2), color: '#374151' }}>
                {s}{i < allSkills.length - 1 ? <span style={{ color: '#d1d5db', marginLeft: 6 }}>·</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Projects</div>
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ fontSize: f(11), fontWeight: 700, color: '#111' }}>{proj.name}</div>
              {proj.description && <div style={{ fontSize: f(10.5), color: '#374151', lineHeight: 1.5 }}>{proj.description}</div>}
            </div>
          ))}
        </div>
      )}

      {certifications && certifications.length > 0 && (
        <div>
          <div style={{ fontSize: f(9.5), fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 8 }}>Certifications</div>
          {certifications.map((c, i) => (
            <div key={i} style={{ fontSize: f(10.5), color: '#374151', marginBottom: 3 }}>
              {c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
