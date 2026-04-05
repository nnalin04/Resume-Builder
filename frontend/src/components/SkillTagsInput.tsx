import { useState, useRef } from 'react';
import type { SkillTag } from '../types/resumeTypes';

interface Props {
  tags: SkillTag[];
  onChange: (tags: SkillTag[]) => void;
}

const POPULAR = [
  'React', 'TypeScript', 'Python', 'Java', 'Go', 'Node.js', 'Spring Boot', 'Docker',
  'Kubernetes', 'PostgreSQL', 'Redis', 'AWS', 'CI/CD', 'Kafka', 'GraphQL',
  'REST API', 'Microservices', 'Git', 'Linux', 'System Design',
];

export default function SkillTagsInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('');
  const [editingYearsId, setEditingYearsId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedNames = new Set(tags.map(t => t.name.toLowerCase()));

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedNames.has(trimmed.toLowerCase())) return;
    onChange([...tags, { name: trimmed }]);
    setInput('');
  };

  const removeTag = (name: string) => {
    onChange(tags.filter(t => t.name !== name));
  };

  const updateYears = (name: string, years: number | undefined) => {
    onChange(tags.map(t => t.name === name ? { ...t, years } : t));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.replace(/,$/, ''));
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const togglePopular = (skill: string) => {
    if (selectedNames.has(skill.toLowerCase())) {
      removeTag(tags.find(t => t.name.toLowerCase() === skill.toLowerCase())!.name);
    } else {
      addTag(skill);
    }
  };

  return (
    <div>
      {/* Selected pills */}
      <div style={{
        display: 'flex', flexWrap: 'wrap' as const, gap: '5px 6px',
        padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 8,
        background: '#fff', marginBottom: 8, minHeight: 40,
        cursor: 'text',
      }}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag.name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20,
            padding: '2px 8px 2px 10px', fontSize: 11, color: '#1e40af', fontWeight: 500,
            whiteSpace: 'nowrap' as const,
          }}>
            {tag.name}
            {/* Years badge — click to edit */}
            {editingYearsId === tag.name ? (
              <input
                type="number"
                min={0}
                max={30}
                defaultValue={tag.years}
                autoFocus
                style={{ width: 32, fontSize: 10, border: 'none', background: 'transparent', color: '#3b82f6', outline: 'none', padding: 0 }}
                onBlur={e => {
                  const v = parseInt(e.target.value, 10);
                  updateYears(tag.name, isNaN(v) ? undefined : v);
                  setEditingYearsId(null);
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                style={{ fontSize: 9.5, color: '#93c5fd', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); setEditingYearsId(tag.name); }}
                title="Click to edit years"
              >
                {tag.years ? `${tag.years}y` : '+y'}
              </span>
            )}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag.name); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: 12, padding: '0 1px', lineHeight: 1 }}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Type a skill and press Enter...' : ''}
          style={{ border: 'none', outline: 'none', fontSize: 11, flex: 1, minWidth: 120, background: 'transparent', color: '#1e293b' }}
        />
      </div>

      {/* Popular skill chips */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Quick add</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '4px 5px' }}>
          {POPULAR.map(skill => {
            const selected = selectedNames.has(skill.toLowerCase());
            return (
              <button
                key={skill}
                type="button"
                onClick={() => togglePopular(skill)}
                style={{
                  fontSize: 10.5, padding: '2px 9px', borderRadius: 20, cursor: 'pointer',
                  border: selected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  background: selected ? '#eff6ff' : '#f8fafc',
                  color: selected ? '#1e40af' : '#64748b',
                  fontWeight: selected ? 600 : 400,
                  transition: 'all 0.1s',
                }}
              >
                {selected ? '✓ ' : ''}{skill}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
