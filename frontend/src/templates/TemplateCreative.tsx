import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

const CORAL = '#e05c5c';
const CORAL_DARK = '#c94040';
const SIDEBAR_W = 178;

export default function TemplateCreative({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications, customSections } = data;
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
      lineHeight: 1.42,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
      display: 'flex',
    }}>

      {/* Left sidebar */}
      <div style={{
        width: SIDEBAR_W, flexShrink: 0,
        background: CORAL, color: '#fff',
        padding: '36px 16px 24px',
        display: 'flex', flexDirection: 'column' as const, gap: 0,
      }}>
        {/* Name */}
        <div style={{ marginBottom: 20, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
          <div style={{ fontSize: f(18), fontWeight: 800, lineHeight: 1.2, color: '#fff', marginBottom: 4, letterSpacing: '-0.01em' }}>
            {p.name || 'Your Name'}
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.4)', margin: '6px 0 10px' }} />
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5, fontSize: f(9.2), color: 'rgba(255,255,255,0.9)' }}>
            {p.location && <span style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}><IconGeoAlt color="rgba(255,255,255,0.8)" size={10} /><span style={{ wordBreak: 'break-word' as const }}>{p.location}</span></span>}
            {p.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconTelephone color="rgba(255,255,255,0.8)" size={10} />{p.phone}</span>}
            {p.email && <span style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}><IconEnvelope color="rgba(255,255,255,0.8)" size={10} /><span style={{ wordBreak: 'break-word' as const }}>{p.email}</span></span>}
            {p.linkedin && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconLinkedin color="rgba(255,255,255,0.8)" size={10} />LinkedIn</span>}
            {p.github && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><IconGithub color="rgba(255,255,255,0.8)" size={10} />GitHub</span>}
          </div>
        </div>

        {allSkills.length > 0 && (
          <div style={{ marginBottom: 18, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <div className="resume-section-title" style={{ fontSize: f(9), fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }}>Skills</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
              {allSkills.map((s, i) => (
                <span key={i} style={{
                  fontSize: f(9.5), color: '#fff', background: 'rgba(255,255,255,0.18)',
                  borderRadius: 4, padding: '3px 8px', display: 'inline-block', lineHeight: 1,
                }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div style={{ marginBottom: 18, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <div className="resume-section-title" style={{ fontSize: f(9), fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }}>Education</div>
            {education.map((e, i) => (
              <div key={i} className="resume-item" style={{ marginBottom: 9, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <div style={{ fontSize: f(10), fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{e.degree}{e.field ? ` in ${e.field}` : ''}</div>
                <div style={{ fontSize: f(9.2), color: 'rgba(255,255,255,0.8)' }}>{e.institution}</div>
                <div style={{ fontSize: f(9), color: 'rgba(255,255,255,0.6)' }}>{e.year}</div>
              </div>
            ))}
          </div>
        )}

        {certifications && certifications.length > 0 && (
          <div>
            <div className="resume-section-title" style={{ fontSize: f(9), fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 7 }}>Certs</div>
            {certifications.map((c, i) => (
              <div key={i} className="resume-item" style={{ fontSize: f(9.2), color: 'rgba(255,255,255,0.85)', marginBottom: 4, lineHeight: 1.4 }}>
                {c.name}{c.date ? ` (${c.date})` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right main content */}
      <div style={{ flex: 1, padding: '36px 34px 24px 28px', overflowY: 'hidden' as const }}>

        {summary && (
          <div style={{ marginBottom: 16, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <SidebarSection title="About Me" f={f} />
            <div style={{ fontSize: f(10.7), color: '#334155', lineHeight: 1.55 }}>{summary}</div>
          </div>
        )}

        {experiences.length > 0 && (
          <div style={{ marginBottom: 16, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <SidebarSection title="Experience" f={f} />
            {experiences.map((e, i) => (
              <div key={i} className="resume-item" style={{ marginBottom: 11, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px', marginBottom: 1 }}>
                  <span style={{ fontSize: f(11.2), fontWeight: 700, color: '#0f172a' }}>{e.position}</span>
                  <span style={{ fontSize: f(9.5), color: '#94a3b8', flexShrink: 0 }}>{e.startDate} – {e.currentlyWorking ? 'Present' : e.endDate}</span>
                </div>
                <div style={{ fontSize: f(10.2), color: CORAL_DARK, fontWeight: 600, marginBottom: 4 }}>{e.company}{e.location ? ` · ${e.location}` : ''}</div>
                {e.description && e.description.split('\n').filter(Boolean).map((line, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'flex-start' }}>
                    <span style={{ color: CORAL, fontWeight: 700, flexShrink: 0, fontSize: f(10.7) }}>•</span>
                    <span style={{ fontSize: f(10.5), lineHeight: 1.45, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <SidebarSection title="Projects" f={f} />
            {projects.map((proj, i) => (
              <div key={i} className="resume-item" style={{ marginBottom: 8, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <div style={{ fontSize: f(11), fontWeight: 700, color: '#0f172a' }}>{proj.name}</div>
                {proj.description && <div style={{ fontSize: f(10.5), color: '#475569', lineHeight: 1.45 }}>{proj.description}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Custom Sections */}
        {customSections && customSections.length > 0 && customSections.map(cs => (
          <div key={cs.id} style={{ marginBottom: 14, marginTop: 8 }}>
            <SidebarSection title={cs.heading} f={f} />
            {cs.items.map(item => (
              <div key={item.id} className="resume-item" style={{ marginBottom: 5 }}>
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
  );
}

function SidebarSection({ title, f }: { title: string; f: (n: number) => number }) {
  return (
    <div className="resume-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ fontSize: f(10), fontWeight: 800, color: CORAL, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{title}</div>
      <div style={{ flex: 1, height: 1.5, background: CORAL, opacity: 0.3 }} />
    </div>
  );
}
