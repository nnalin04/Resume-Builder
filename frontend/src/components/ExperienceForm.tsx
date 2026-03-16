import type { Experience } from '../types/resumeTypes';

interface Props {
  experiences: Experience[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Experience, value: string | boolean) => void;
  onRemove: (id: string) => void;
}

const inputClass = "w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

export default function ExperienceForm({ experiences, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {experiences.map((exp, idx) => (
        <div key={exp.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50 relative">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position {idx + 1}</span>
            <button onClick={() => onRemove(exp.id)} className="text-red-400 hover:text-red-600 text-xs">✕ Remove</button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} value={exp.company} onChange={e => onUpdate(exp.id, 'company', e.target.value)} placeholder="Company Name" />
            </div>
            <div>
              <label className={labelClass}>Position</label>
              <input className={inputClass} value={exp.position} onChange={e => onUpdate(exp.id, 'position', e.target.value)} placeholder="Job Title" />
            </div>
          </div>
          <div className="mb-2">
            <label className={labelClass}>Location</label>
            <input className={inputClass} value={exp.location} onChange={e => onUpdate(exp.id, 'location', e.target.value)} placeholder="City" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={labelClass}>Start Date</label>
              <input className={inputClass} value={exp.startDate} onChange={e => onUpdate(exp.id, 'startDate', e.target.value)} placeholder="Jan 2022" />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input className={inputClass} value={exp.endDate} onChange={e => onUpdate(exp.id, 'endDate', e.target.value)} placeholder="Dec 2023" disabled={exp.currentlyWorking} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 mb-2 cursor-pointer">
            <input type="checkbox" checked={exp.currentlyWorking} onChange={e => onUpdate(exp.id, 'currentlyWorking', e.target.checked)} className="rounded" />
            Currently working here
          </label>
          <div>
            <label className={labelClass}>Description <span className="text-gray-400">(one bullet per line)</span></label>
            <textarea
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
              rows={5}
              value={exp.description}
              onChange={e => onUpdate(exp.id, 'description', e.target.value)}
              placeholder={"Bullet point 1\nBullet point 2\nBullet point 3"}
            />
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg text-sm hover:bg-blue-50 transition-colors font-medium">
        + Add Experience
      </button>
    </div>
  );
}
