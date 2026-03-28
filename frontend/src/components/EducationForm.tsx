import type { Education } from '../types/resumeTypes';

interface Props {
  education: Education[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Education, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

export default function EducationForm({ education, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div>
      {education.map((edu, idx) => (
        <div key={edu.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/70 mb-3" style={{ opacity: edu.hidden ? 0.45 : 1 }}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Education {idx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onUpdate(edu.id, 'hidden', !edu.hidden)}
                title={edu.hidden ? 'Show in resume' : 'Hide from resume'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', opacity: edu.hidden ? 0.5 : 1, lineHeight: 1 }}
              >
                {edu.hidden ? '🙈' : '👁️'}
              </button>
              <button onClick={() => onRemove(edu.id)} className="text-xs text-red-400 bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors">✕ Remove</button>
            </div>
          </div>
          <div className="mb-2">
            <label className={labelCls}>Institution</label>
            <input className={inputCls} value={edu.institution} onChange={e => onUpdate(edu.id, 'institution', e.target.value)} placeholder="University Name" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={labelCls}>Degree</label>
              <input className={inputCls} value={edu.degree} onChange={e => onUpdate(edu.id, 'degree', e.target.value)} placeholder="B.Tech" />
            </div>
            <div>
              <label className={labelCls}>Field</label>
              <input className={inputCls} value={edu.field} onChange={e => onUpdate(edu.id, 'field', e.target.value)} placeholder="Computer Science" />
            </div>
          </div>
          {/* Date range: From → To */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>From</label>
              <input
                className={inputCls}
                value={edu.start_year ?? ''}
                onChange={e => onUpdate(edu.id, 'start_year', e.target.value)}
                placeholder="2018"
              />
            </div>
            <div>
              <label className={labelCls}>To (or Expected)</label>
              <input
                className={inputCls}
                value={edu.year}
                onChange={e => onUpdate(edu.id, 'year', e.target.value)}
                placeholder="2022 or Present"
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-brand-600 bg-transparent cursor-pointer hover:bg-blue-50 transition-colors">
        + Add Education
      </button>
    </div>
  );
}
