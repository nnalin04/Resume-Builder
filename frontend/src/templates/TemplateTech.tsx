import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

const TEAL = '#0d9488';
const TEAL_LIGHT = '#f0fdfa';
const TEAL_MID = '#14b8a6';

export default function TemplateTech({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const allSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div id="resume-preview" style={{
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      fontSize: f(10.9),
      color: '#1e293b',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      padding: '36px 42px 30px',
      lineHeight: 1.42,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap' as const, gap: 8 }}>
        <div>
          <div style={{ fontSize: f(25), fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 3 }}>
            {p.name || 'Your Name'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0 12px', fontSize: f(9.8), color: '#64748b' }}>
            {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="#64748b" size={10} /> {p.location}</span>}
            {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="#64748b" size={10} /> {p.phone}</span>}
            {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="#64748b" size={10} /> {p.email}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {p.github && (
            <a href={p.github} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: f(9.8), color: TEAL, background: TEAL_LIGHT, padding: '4px 10px', borderRadius: 20, textDecoration: 'none', border: `1px solid ${TEAL_MID}` }}>
              <IconGithub color={TEAL} size={10} /> GitHub
            </a>
          )}
          {p.linkedin && (
            <a href={p.linkedin} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: f(9.8), color: TEAL, background: TEAL_LIGHT, padding: '4px 10px', borderRadius: 20, textDecoration: 'none', border: `1px solid ${TEAL_MID}` }}>
              <IconLinkedin color={TEAL} size={10} /> LinkedIn
            </a>
          )}
        </div>
      </div>

      {/* Skills tags — shown prominently near top */}
      {allSkills.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <div style={{ fontSize: f(9.2), fontWeight: 700, color: TEAL, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6, fontFamily: 'monospace' }}>// Tech Stack</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 5px' }}>
            {allSkills.map((s, i) => (
              <span key={i} style={{
                fontSize: f(9.5), color: TEAL, background: TEAL_LIGHT,
                border: `1px solid ${TEAL_MID}`, borderRadius: 4,
                padding: '2px 8px', display: 'inline-flex', alignItems: 'center', lineHeight: 1,
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <SectionLabel label="About" f={f} />
          <div style={{ fontSize: f(10.7), color: '#334155', lineHeight: 1.55 }}>{summary}</div>
        </div>
      )}

      {experiences.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <SectionLabel label="Experience" f={f} />
          {experiences.map((e, i) => (
            <div key={i} style={{ marginBottom: 10, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 1 }}>
                <span style={{ fontSize: f(11.2), fontWeight: 700, color: '#0f172a' }}>{e.position}</span>
                <span style={{ fontSize: f(9.5), color: '#94a3b8', flexShrink: 0, fontFamily: 'monospace' }}>{e.startDate} – {e.currentlyWorking ? 'now' : e.endDate}</span>
              </div>
              <div style={{ fontSize: f(10.2), color: TEAL, fontWeight: 600, marginBottom: 4 }}>{e.company}{e.location ? ` · ${e.location}` : ''}</div>
              {e.description && e.description.split('\n').filter(Boolean).map((line, j) => (
                <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'flex-start' }}>
                  <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0, fontSize: f(10.7), fontFamily: 'monospace' }}>→</span>
                  <span style={{ fontSize: f(10.5), lineHeight: 1.45, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <SectionLabel label="Projects" f={f} />
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: 7, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
              <div style={{ fontSize: f(11), fontWeight: 700, color: '#0f172a' }}>
                {proj.name}
                {proj.link && <a href={proj.link} style={{ marginLeft: 8, fontSize: f(9.5), color: TEAL, fontWeight: 400, textDecoration: 'none' }}>↗ link</a>}
              </div>
              {proj.description && <div style={{ fontSize: f(10.5), color: '#475569', lineHeight: 1.45 }}>{proj.description}</div>}
            </div>
          ))}
        </div>
      )}

      {education.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <SectionLabel label="Education" f={f} />
          {education.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 5 }}>
              <div>
                <span style={{ fontSize: f(11), fontWeight: 700, color: '#0f172a' }}>{e.degree}{e.field ? ` in ${e.field}` : ''}</span>
                <span style={{ fontSize: f(10.2), color: '#64748b', marginLeft: 6 }}>{e.institution}</span>
              </div>
              <span style={{ fontSize: f(9.5), color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>{e.year}</span>
            </div>
          ))}
        </div>
      )}

      {certifications && certifications.length > 0 && (
        <div>
          <SectionLabel label="Certifications" f={f} />
          {certifications.map((c, i) => (
            <div key={i} style={{ fontSize: f(10.5), color: '#475569', marginBottom: 3 }}>
              {c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label, f }: { label: string; f: (n: number) => number }) {
  return (
    <div style={{
      fontSize: f(9.2), fontWeight: 700, color: TEAL,
      textTransform: 'uppercase' as const, letterSpacing: '0.08em',
      marginBottom: 7, marginTop: 2, fontFamily: 'monospace',
      borderBottom: `1px solid #ccfbf1`, paddingBottom: 3,
    }}>// {label}</div>
  );
}
