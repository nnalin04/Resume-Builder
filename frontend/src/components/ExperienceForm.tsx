import type { Experience } from '../types/resumeTypes';

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
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: 1 },
  removeBtn: { fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 },
  field: { marginBottom: 8 },
  textarea: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 7px', fontSize: 11, resize: 'none' as const, background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
  addBtn: { width: '100%', padding: '8px 0', border: '2px dashed #93c5fd', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#3b82f6', background: 'none', cursor: 'pointer' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4b5563', marginBottom: 8, cursor: 'pointer' },
  rewriteBtn: { fontSize: 12, color: '#4f46e5', background: '#e0e7ff', border: 'none', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 },
};

export default function ExperienceForm({ experiences, onAdd, onUpdate, onRemove, onRewrite, rewritingId }: Props) {
  return (
    <div>
      {experiences.map((exp, idx) => (
        <div key={exp.id} style={{ ...s.card, opacity: exp.hidden ? 0.45 : 1 }}>
          <div style={s.cardHeader}>
            <span style={s.badge}>Position {idx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onUpdate(exp.id, 'hidden', !exp.hidden)}
                title={exp.hidden ? 'Show in resume' : 'Hide from resume'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', opacity: exp.hidden ? 0.5 : 1, lineHeight: 1 }}
              >
                {exp.hidden ? '🙈' : '👁️'}
              </button>
              <button onClick={() => onRemove(exp.id)} style={s.removeBtn}>✕ Remove</button>
            </div>
          </div>
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
               <label style={{...s.label, marginBottom: 0}}>Description <span style={{ color: '#9ca3af' }}>(one bullet per line)</span></label>
               {onRewrite && (
                 <button 
                   onClick={() => onRewrite(exp.id, exp.description)}
                   disabled={rewritingId === exp.id}
                   style={s.rewriteBtn}
                 >
                   {rewritingId === exp.id ? '✨ Rewriting...' : '✨ Improve Bullets'}
                 </button>
               )}
            </div>
            <textarea
              style={s.textarea}
              rows={5}
              value={exp.description}
              onChange={e => onUpdate(exp.id, 'description', e.target.value)}
              placeholder={"Bullet point 1\nBullet point 2\nBullet point 3"}
            />
            {(() => {
              const bullets = exp.description.split('\n').filter(l => l.trim().length > 0);
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
      ))}
      <button onClick={onAdd} style={s.addBtn}>+ Add Experience</button>
    </div>
  );
}
