interface Props { value: string; onChange: (v: string) => void; }

export default function SummaryForm({ value, onChange }: Props) {
  return (
    <textarea
      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
      rows={4}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Write a 2-3 sentence professional summary..."
    />
  );
}
