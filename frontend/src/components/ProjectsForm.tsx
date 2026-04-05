import { useState, useEffect } from 'react';
import type { Project } from '../types/resumeTypes';
import RichTextEditor from './RichTextEditor';

interface Props {
  projects: Project[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Project, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

export default function ProjectsForm({ projects, onAdd, onUpdate, onRemove }: Props) {
  const [openEntries, setOpenEntries] = useState<Set<string>>(() => new Set([projects[0]?.id ?? '']));

  useEffect(() => {
    if (projects.length === 0) return;
    const lastId = projects[projects.length - 1].id;
    setOpenEntries(prev => {
      if (!prev.has(lastId) && projects.length > 1) {
        const next = new Set(prev);
        next.add(lastId);
        return next;
      }
      return prev;
    });
  }, [projects.length]);

  return (
    <div>
      {projects.map(proj => {
        const isOpen = openEntries.has(proj.id);
        return (
          <div key={proj.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/70 mb-3" style={{ opacity: proj.hidden ? 0.45 : 1 }}>
            {/* Accordion header */}
            <div
              className="flex justify-between items-center"
              style={{ cursor: 'pointer', marginBottom: isOpen ? 10 : 0 }}
              onClick={() => setOpenEntries(prev => {
                const next = new Set(prev);
                if (next.has(proj.id)) next.delete(proj.id);
                else next.add(proj.id);
                return next;
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onRemove(proj.id); }}
                  className="text-xs text-red-400 bg-transparent border-none cursor-pointer"
                  style={{ padding: '2px 4px', flexShrink: 0 }}
                  title="Remove"
                >✕</button>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {proj.name || 'New Project'}
                  </div>
                  {proj.link && <div style={{ fontSize: 10.5, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{proj.link}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onUpdate(proj.id, 'hidden', !proj.hidden); }}
                  title={proj.hidden ? 'Show in resume' : 'Hide from resume'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: proj.hidden ? 0.5 : 1, lineHeight: 1 }}
                >
                  {proj.hidden ? '🙈' : '👁️'}
                </button>
                <span style={{ fontSize: 10, color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▼</span>
              </div>
            </div>

            {/* Expanded form */}
            {isOpen && (
              <div>
                <div className="mb-2">
                  <label className={labelCls}>Project Name</label>
                  <input className={inputCls} value={proj.name} onChange={e => onUpdate(proj.id, 'name', e.target.value)} placeholder="Project Name" />
                </div>
                <div className="mb-2">
                  <label className={labelCls}>Description</label>
                  <RichTextEditor
                    value={proj.description}
                    onChange={v => onUpdate(proj.id, 'description', v)}
                    placeholder="What did you build? What tech did you use?"
                    minHeight={90}
                  />
                </div>
                <div>
                  <label className={labelCls}>Link <span className="text-slate-400 normal-case tracking-normal font-normal">(GitHub repo or live demo URL)</span></label>
                  <input className={inputCls} value={proj.link} onChange={e => onUpdate(proj.id, 'link', e.target.value)} placeholder="https://github.com/you/project or live demo URL" />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-brand-600 bg-transparent cursor-pointer hover:bg-blue-50 transition-colors">
        + Add Project
      </button>
    </div>
  );
}
