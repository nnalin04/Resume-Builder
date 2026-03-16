import type { Education } from '../types/resumeTypes';

interface Props {
  education: Education[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Education, value: string) => void;
  onRemove: (id: string) => void;
}

const inputClass = "w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

export default function EducationForm({ education, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {education.map((edu, idx) => (
        <div key={edu.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Education {idx + 1}</span>
            <button onClick={() => onRemove(edu.id)} className="text-red-400 hover:text-red-600 text-xs">✕ Remove</button>
          </div>
          <div className="mb-2">
            <label className={labelClass}>Institution</label>
            <input className={inputClass} value={edu.institution} onChange={e => onUpdate(edu.id, 'institution', e.target.value)} placeholder="University Name" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={labelClass}>Degree</label>
              <input className={inputClass} value={edu.degree} onChange={e => onUpdate(edu.id, 'degree', e.target.value)} placeholder="B.Tech" />
            </div>
            <div>
              <label className={labelClass}>Field</label>
              <input className={inputClass} value={edu.field} onChange={e => onUpdate(edu.id, 'field', e.target.value)} placeholder="Computer Science" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input className={inputClass} value={edu.year} onChange={e => onUpdate(edu.id, 'year', e.target.value)} placeholder="2022" />
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-300 text-blue-500 rounded-lg text-sm hover:bg-blue-50 transition-colors font-medium">
        + Add Education
      </button>
    </div>
  );
}
