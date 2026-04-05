import { useState, useEffect } from 'react';
import type { Experience } from '../types/resumeTypes';
import RichTextEditor from './RichTextEditor';
import { htmlToPlainLines } from '../utils/htmlUtils';

interface Props {
  experiences: Experience[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Experience, value: string | boolean) => void;
  onRemove: (id: string) => void;
  onRewrite?: (id: string, currentText: string) => void;
  rewritingId?: string | null;
}

const s = {
  input: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 7px', fontSize: 11, background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
  label: { display: 'block', fontSize: 11, fontWeight: 500, color: '#4b5563', marginBottom: 4 },
  card: { border: '1px solid #f3f4f6', borderRadius: 8, padding: 12, background: '#f9fafb', marginBottom: 12 },
  removeBtn: { fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  field: { marginBottom: 8 },
  addBtn: { width: '100%', padding: '8px 0', border: '2px dashed #93c5fd', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#3b82f6', background: 'none', cursor: 'pointer' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', marginBottom: 8, cursor: 'pointer' },
  rewriteBtn: { fontSize: 12, color: '#4f46e5', background: '#e0e7ff', border: 'none', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 },
};

export default function ExperienceForm({ experiences, onAdd, onUpdate, onRemove, onRewrite, rewritingId }: Props) {
  const [openEntries, setOpenEntries] = useState<Set<string>>(() => new Set([experiences[0]?.id ?? '']));

  useEffect(() => {
    if (experiences.length === 0) return;
    const lastId = experiences[experiences.length - 1].id;
    setOpenEntries(prev => {
      if (!prev.has(lastId) && experiences.length > 1) {
        const next = new Set(prev);
        next.add(lastId);
        return next;
      }
      return prev;
    });
  }, [experiences.length]);

  return (
    <div>
      {experiences.map(exp => {
        const isOpen = openEntries.has(exp.id);
        const dateStr = [exp.startDate, exp.currentlyWorking ? 'Present' : exp.endDate].filter(Boolean).join(' – ');
        const entryTitle = [exp.company || 'New Experience', exp.position].filter(Boolean).join(' — ');
        return (
          <div key={exp.id} style={{ ...s.card, opacity: exp.hidden ? 0.45 : 1 }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isOpen ? 10 : 0 }}
              onClick={() => setOpenEntries(prev => {
                const next = new Set(prev);
                if (next.has(exp.id)) next.delete(exp.id);
                else next.add(exp.id);
                return next;
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(exp.id); }}
                  style={{ ...s.removeBtn, padding: '2px 4px', flexShrink: 0 }}
                  title="Remove"
                >✕</button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {entryTitle}
                  </div>
                  {dateStr && <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{dateStr}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onUpdate(exp.id, 'hidden', !exp.hidden); }}
                  title={exp.hidden ? 'Show in resume' : 'Hide from resume'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: exp.hidden ? 0.5 : 1, lineHeight: 1 }}
                >
                  {exp.hidden ? '🙈' : '👁️'}
                </button>
                <span style={{ fontSize: 10, color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▼</span>
              </div>
            </div>

            {isOpen && (
              <div>
                <div style={s.grid2}>
                  <div>
                    <label style={s.label}>Company</label>
                    <input style={s.input} value={exp.company} onChange={e => onUpdate(exp.id, 'company', e.target.value)} placeholder="Company Name" />
                  </div>
                  <div>
                    <label style={s.label}>Position</label>
                    <input style={s.input} value={exp.position} onChange={e => onUpdate(exp.id, 'position', e.target.value)} placeholder="Job Title" />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Location</label>
                  <input style={s.input} value={exp.location} onChange={e => onUpdate(exp.id, 'location', e.target.value)} placeholder="City" />
                </div>
                <div style={s.grid2}>
                  <div>
                    <label style={s.label}>Start Date</label>
                    <input style={s.input} value={exp.startDate} onChange={e => onUpdate(exp.id, 'startDate', e.target.value)} placeholder="Jan 2022" />
                  </div>
                  <div>
                    <label style={s.label}>End Date</label>
                    <input style={{ ...s.input, opacity: exp.currentlyWorking ? 0.5 : 1 }} value={exp.endDate} onChange={e => onUpdate(exp.id, 'endDate', e.target.value)} placeholder="Dec 2023" disabled={exp.currentlyWorking} />
                  </div>
                </div>
                <label style={s.checkRow}>
                  <input type="checkbox" checked={exp.currentlyWorking} onChange={e => onUpdate(exp.id, 'currentlyWorking', e.target.checked)} />
                  Currently working here
                </label>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{...s.label, marginBottom: 0}}>Key Points</label>
                    {onRewrite && (
                      <button
                        type="button"
                        onClick={() => onRewrite(exp.id, exp.description)}
                        disabled={rewritingId === exp.id}
                        style={s.rewriteBtn}
                      >
                        {rewritingId === exp.id ? '✨ Rewriting...' : '✨ Improve Bullets'}
                      </button>
                    )}
                  </div>
                  <RichTextEditor
                    value={exp.description}
                    onChange={v => onUpdate(exp.id, 'description', v)}
                    placeholder="• Led X, resulting in Y..."
                  />
                  {(() => {
                    const bullets = htmlToPlainLines(exp.description);
                    if (bullets.length === 0) return null;
                    const withMetric = bullets.filter(l => /\d+[%$kKmMx]?|\d{2,}/.test(l)).length;
                    const pct = withMetric / bullets.length;
                    const color = pct >= 0.5 ? '#16a34a' : '#d97706';
                    return (
                      <div style={{ fontSize: 11, marginTop: 4, color, fontWeight: 600 }}>
                        {withMetric}/{bullets.length} bullets have metrics {pct >= 0.5 ? '✓' : '— add numbers to strengthen impact'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={onAdd} style={s.addBtn}>+ Add Experience</button>
    </div>
  );
}
