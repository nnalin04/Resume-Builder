import type { Project } from '../types/resumeTypes';

interface Props {
  projects: Project[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Project, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';
const textareaCls = 'w-full border border-slate-200 rounded-lg px-2 py-1 text-[11px] resize-none bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';

export default function ProjectsForm({ projects, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div>
      {projects.map((proj, idx) => (
        <div key={proj.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/70 mb-3" style={{ opacity: proj.hidden ? 0.45 : 1 }}>
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Project {idx + 1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => onUpdate(proj.id, 'hidden', !proj.hidden)}
                title={proj.hidden ? 'Show in resume' : 'Hide from resume'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', opacity: proj.hidden ? 0.5 : 1, lineHeight: 1 }}
              >
                {proj.hidden ? '🙈' : '👁️'}
              </button>
              <button onClick={() => onRemove(proj.id)} className="text-xs text-red-400 bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors">✕ Remove</button>
            </div>
          </div>
          <div className="mb-2">
            <label className={labelCls}>Project Name</label>
            <input className={inputCls} value={proj.name} onChange={e => onUpdate(proj.id, 'name', e.target.value)} placeholder="Project Name" />
          </div>
          <div className="mb-2">
            <label className={labelCls}>
              Description <span className="text-slate-400 normal-case tracking-normal font-normal">(one bullet per line)</span>
            </label>
            <textarea
              className={textareaCls}
              rows={3}
              value={proj.description}
              onChange={e => onUpdate(proj.id, 'description', e.target.value)}
              placeholder={"What did you build?\nWhat tech did you use?"}
            />
          </div>
          <div>
            <label className={labelCls}>Link <span className="text-slate-400 normal-case tracking-normal font-normal">(GitHub repo or live demo URL)</span></label>
            <input className={inputCls} value={proj.link} onChange={e => onUpdate(proj.id, 'link', e.target.value)} placeholder="https://github.com/you/project or live demo URL" />
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-brand-600 bg-transparent cursor-pointer hover:bg-blue-50 transition-colors">
        + Add Project
      </button>
    </div>
  );
}
