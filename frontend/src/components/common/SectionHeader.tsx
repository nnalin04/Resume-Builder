export function SectionHeader({ title, open, onToggle, badge }: { title: string; open: boolean; onToggle: () => void; badge?: string }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${open ? 'bg-surface-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50 border-b border-slate-100'}`}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700 tracking-tight">{title}</span>
        {badge && <span className="text-xs text-slate-400 font-normal">{badge}</span>}
      </span>
      <span className={`text-xs text-slate-400 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
    </button>
  );
}
