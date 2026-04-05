interface Props {
  points: string[];
}

export default function SectionFeedback({ points }: Props) {
  if (!points.length) return null;
  return (
    <div style={{
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderLeft: '3px solid #f59e0b',
      borderRadius: 6,
      padding: '8px 12px',
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
        💡 Tips to strengthen this section
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {points.map((point, i) => (
          <li key={i} style={{ fontSize: 11, color: '#78350f', lineHeight: 1.5, paddingLeft: 12, position: 'relative' as const }}>
            <span style={{ position: 'absolute' as const, left: 0 }}>·</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
