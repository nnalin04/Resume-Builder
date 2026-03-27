import type { PersonalInfo } from '../types/resumeTypes';

interface Props {
  data: PersonalInfo;
  onChange: (field: keyof PersonalInfo, value: string) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

export default function PersonalInfoForm({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>Full Name</label>
          <input className={inputCls} value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Your Name" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input className={inputCls} value={data.location} onChange={e => onChange('location', e.target.value)} placeholder="City, Country" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+91-..." />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="you@email.com" />
        </div>
      </div>
      <div>
        <label className={labelCls}>LinkedIn URL</label>
        <input className={inputCls} value={data.linkedin} onChange={e => onChange('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
      </div>
      <div>
        <label className={labelCls}>GitHub URL</label>
        <input className={inputCls} value={data.github} onChange={e => onChange('github', e.target.value)} placeholder="https://github.com/..." />
      </div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: '#1e40af', lineHeight: 1.5 }}>
        <strong>For product companies &amp; GCCs:</strong> Include city/state only. Do not add date of birth, father's name, marital status, or photo — these are not expected and can introduce unconscious bias.
      </div>
    </div>
  );
}
