import type { PersonalInfo } from '../types/resumeTypes';

interface Props {
  data: PersonalInfo;
  onChange: (field: keyof PersonalInfo, value: string) => void;
}

const inputClass = "w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";

export default function PersonalInfoForm({ data, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Full Name</label>
          <input className={inputClass} value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Your Name" />
        </div>
        <div>
          <label className={labelClass}>Location</label>
          <input className={inputClass} value={data.location} onChange={e => onChange('location', e.target.value)} placeholder="City, Country" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+91-..." />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="you@email.com" />
        </div>
      </div>
      <div>
        <label className={labelClass}>LinkedIn URL</label>
        <input className={inputClass} value={data.linkedin} onChange={e => onChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
      </div>
      <div>
        <label className={labelClass}>GitHub URL</label>
        <input className={inputClass} value={data.github} onChange={e => onChange('github', e.target.value)} placeholder="https://github.com/..." />
      </div>
    </div>
  );
}
