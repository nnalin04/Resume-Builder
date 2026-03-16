import type { Project } from '../types/resumeTypes';

interface Props {
  projects: Project[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Project, value: string) => void;
  onRemove: (id: string) => void;
}

const inputClass = "w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

export default function ProjectsForm({ projects, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {projects.map((proj, idx) => (
        <div key={proj.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project {idx + 1}</span>
            <button onClick={() => onRemove(proj.id)} className="text-red-400 hover:text-red-600 text-xs">✕ Remove</button>
          </div>
          <div className="mb-2">
            <label className={labelClass}>Project Name</label>
            <input className={inputClass} value={proj.name} onChange={e => onUpdate(proj.id, 'name', e.target.value)} placeholder="Project Name" />
          </div>
          <div className="mb-2">
            <label className={labelClass}>Description <span className="text-gray-400">(one bullet per line)</span></label>
            <textarea
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
              rows={3}
              value={proj.description}
              onChange={e => onUpdate(proj.id, 'description', e.target.value)}
              placeholder={"What did you build?\nWhat tech did you use?"}
            />
          </div>
          <div>
            <label className={labelClass}>Link (optional)</label>
            <input className={inputClass} value={proj.link} onChange={e => onUpdate(proj.id, 'link', e.target.value)} placeholder="https://..." />
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg text-sm hover:bg-blue-50 transition-colors font-medium">
        + Add Project
      </button>
    </div>
  );
}
