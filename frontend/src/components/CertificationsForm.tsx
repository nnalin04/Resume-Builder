import type { Certification } from '../types/resumeTypes';

interface Props {
  certifications: Certification[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Certification, value: string) => void;
  onRemove: (id: string) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow placeholder-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

export default function CertificationsForm({ certifications, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div>
      {certifications.map((cert, idx) => (
        <div key={cert.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/70 mb-3">
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Certification {idx + 1}</span>
            <button onClick={() => onRemove(cert.id)} className="text-xs text-red-400 bg-transparent border-none cursor-pointer hover:text-red-500 transition-colors">✕ Remove</button>
          </div>
          <div className="mb-2">
            <label className={labelCls}>Certification Name</label>
            <input className={inputCls} value={cert.name} onChange={e => onUpdate(cert.id, 'name', e.target.value)} placeholder="AWS Certified Solutions Architect" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Issuer (optional)</label>
              <input className={inputCls} value={cert.issuer} onChange={e => onUpdate(cert.id, 'issuer', e.target.value)} placeholder="Amazon Web Services" />
            </div>
            <div>
              <label className={labelCls}>Date (optional)</label>
              <input className={inputCls} value={cert.date} onChange={e => onUpdate(cert.id, 'date', e.target.value)} placeholder="2024" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={onAdd} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-sm font-medium text-brand-600 bg-transparent cursor-pointer hover:bg-blue-50 transition-colors">
        + Add Certification
      </button>
    </div>
  );
}
