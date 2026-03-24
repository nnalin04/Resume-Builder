import type { ResumeData } from '../types/resumeTypes';
import type { FontSize } from '../utils/fontScales';
import { FONT_MULT } from '../utils/fontScales';
import { IconGeoAlt, IconTelephone, IconEnvelope, IconLinkedin, IconGithub } from '../components/ContactIcons';

interface Props { data: ResumeData; fontSize?: FontSize; }

export default function TemplateExecutive({ data, fontSize = 'small' }: Props) {
  const { personalInfo: p, summary, experiences, projects, education, skills, certifications, customSections } = data;
  const fm = FONT_MULT[fontSize];
  const f = (px: number) => Math.round(px * fm * 10) / 10;

  const allSkills = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  const NAVY = '#1e2d4e';

  const visibleExperiences = experiences.filter(e => !e.hidden);
  const visibleProjects = projects.filter(p => !p.hidden);
  const visibleEducation = education.filter(e => !e.hidden);
  const visibleCertifications = (certifications || []).filter(c => !c.hidden);

  return (
    <div id="resume-preview" style={{
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: f(10.9),
      color: '#222',
      background: '#fff',
      width: '794px',
      minHeight: '1123px',
      lineHeight: 1.4,
      boxSizing: 'border-box' as const,
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const,
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    }}>

      {/* Bold header band */}
      <div style={{ background: NAVY, padding: '28px 40px 22px', color: '#fff' }}>
        <div style={{ fontSize: f(26), fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0 16px', fontSize: f(9.8), color: 'rgba(255,255,255,0.8)' }}>
          {p.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGeoAlt color="rgba(255,255,255,0.7)" size={10} /> {p.location}</span>}
          {p.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconTelephone color="rgba(255,255,255,0.7)" size={10} /> {p.phone}</span>}
          {p.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconEnvelope color="rgba(255,255,255,0.7)" size={10} /> {p.email}</span>}
          {p.linkedin && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconLinkedin color="rgba(255,255,255,0.7)" size={10} /> LinkedIn</span>}
          {p.github && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><IconGithub color="rgba(255,255,255,0.7)" size={10} /> GitHub</span>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '22px 40px 20px' }}>

        {summary && (
          <div style={{ marginBottom: 16, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <SectionTitle title="Executive Summary" f={f} navy={NAVY} />
            <div style={{ fontSize: f(10.9), color: '#333', lineHeight: 1.55 }}>{summary}</div>
          </div>
        )}

        {visibleExperiences.length > 0 && (
          <div style={{ marginBottom: 16, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
            <SectionTitle title="Professional Experience" f={f} navy={NAVY} />
            {visibleExperiences.map((e, i) => (
              <div key={i} className="resume-item" style={{ marginBottom: 10, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0 8px' }}>
                  <span style={{ fontSize: f(11.5), fontWeight: 700, color: NAVY }}>{e.position}</span>
                  <span style={{ fontSize: f(9.8), color: '#6b7280', flexShrink: 0 }}>{e.startDate} – {e.currentlyWorking ? 'Present' : e.endDate}</span>
                </div>
                <div style={{ fontSize: f(10.5), color: '#555', fontStyle: 'italic', marginBottom: 4 }}>{e.company}{e.location ? `, ${e.location}` : ''}</div>
                {e.description && e.description.split('\n').filter(Boolean).map((line, j) => (
                  <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 2, alignItems: 'flex-start' }}>
                    <span style={{ color: NAVY, fontWeight: 700, flexShrink: 0, fontSize: f(10.7) }}>▪</span>
                    <span style={{ fontSize: f(10.5), lineHeight: 1.45, overflowWrap: 'break-word' as const, minWidth: 0 }}>{line}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 1 }}>
            {visibleEducation.length > 0 && (
              <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <SectionTitle title="Education" f={f} navy={NAVY} />
                {visibleEducation.map((e, i) => (
                  <div key={i} className="resume-item" style={{ marginBottom: 7, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                    <div style={{ fontSize: f(11), fontWeight: 700, color: NAVY }}>{e.degree}{e.field ? ` in ${e.field}` : ''}</div>
                    <div style={{ fontSize: f(10.2), color: '#555' }}>{e.institution} · {e.year}</div>
                  </div>
                ))}
              </div>
            )}
            {visibleCertifications.length > 0 && (
              <div>
                <SectionTitle title="Certifications" f={f} navy={NAVY} />
                {visibleCertifications.map((c, i) => (
                  <div key={i} style={{ fontSize: f(10.5), color: '#444', marginBottom: 3 }}>
                    {c.name}{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Custom Sections */}
            {customSections && customSections.length > 0 && customSections.map(cs => (
              <div key={cs.id} style={{ marginBottom: 14, marginTop: 8 }}>
                <SectionTitle title={cs.heading} f={f} navy={NAVY} />
                {cs.items.map((item, i) => (
                  <div key={i} className="resume-item" style={{ marginBottom: 5 }}>
                    <div style={{ fontSize: f(10.7), fontWeight: 600, color: NAVY, lineHeight: 1.4 }}>
                      {item.title}{item.date && ` · ${item.date}`}
                    </div>
                    {item.subtitle && <div style={{ fontSize: f(10.3), color: '#555', fontStyle: 'italic', lineHeight: 1.4 }}>{item.subtitle}</div>}
                    {item.description && <div style={{ fontSize: f(10.3), color: '#333', lineHeight: 1.5 }}>{item.description}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            {allSkills.length > 0 && (
              <div style={{ marginBottom: 14, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                <SectionTitle title="Core Competencies" f={f} navy={NAVY} />
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 6px' }}>
                  {allSkills.map((s, i) => (
                    <span key={i} style={{
                      fontSize: f(9.8), color: NAVY, background: '#eef1f8',
                      borderRadius: 3, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', lineHeight: 1,
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {visibleProjects.length > 0 && (
              <div>
                <SectionTitle title="Key Projects" f={f} navy={NAVY} />
                {visibleProjects.map((proj, i) => (
                  <div key={i} className="resume-item" style={{ marginBottom: 6, breakInside: 'avoid' as const, pageBreakInside: 'avoid' as const }}>
                    <div style={{ fontSize: f(10.7), fontWeight: 700, color: NAVY }}>{proj.name}</div>
                    {proj.description && <div style={{ fontSize: f(10.2), color: '#555', lineHeight: 1.45 }}>{proj.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, f, navy }: { title: string; f: (n: number) => number; navy: string }) {
  return (
    <div className="resume-section-title" style={{
      fontSize: f(10.2), fontWeight: 700, color: navy,
      borderBottom: `1.5px solid ${navy}`, paddingBottom: 2, marginBottom: 7, marginTop: 2,
      textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    }}>{title}</div>
  );
}
