interface Props { 
  value: string; 
  onChange: (v: string) => void;
  onRewrite?: () => void;
  isRewriting?: boolean;
}

export default function SummaryForm({ value, onChange, onRewrite, isRewriting }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {onRewrite && (
        <button
          onClick={onRewrite}
          disabled={isRewriting}
          style={{ position: 'absolute', top: -30, right: 0, fontSize: 12, color: '#4f46e5', background: '#e0e7ff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
        >
          {isRewriting ? '✨ Rewriting...' : '✨ Rewrite with AI'}
        </button>
      )}
      <textarea
        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 7px', fontSize: 11, resize: 'none', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
        rows={4}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Write a 2-3 sentence professional summary..."
      />
      {(() => {
        const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
        const over = wordCount > 80;
        return wordCount > 0 ? (
          <div style={{ fontSize: 11, marginTop: 4, color: over ? '#d97706' : '#64748b', fontWeight: over ? 600 : 400 }}>
            {wordCount} words{over ? ' — aim for under 80' : ' / 80 recommended'}
          </div>
        ) : null;
      })()}
    </div>
  );
}
