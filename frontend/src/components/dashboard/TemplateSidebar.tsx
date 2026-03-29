import React from 'react';
import { type TemplateId } from '../../types/resumeTypes';
import { TEMPLATES, TEMPLATE_COLORS, TemplateMiniPreview } from './TemplateMiniPreview';

interface TemplateSidebarProps {
  template: TemplateId;
  setTemplate: (tpl: TemplateId) => void;
}

export function TemplateSidebar({ template, setTemplate }: TemplateSidebarProps) {
  return (
    <div className="hide-on-print" style={{
      width: 100,
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 4,
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Template</span>
      {TEMPLATES.map(t => (
        <button
          key={t.id}
          onClick={() => setTemplate(t.id)}
          title={t.label}
          style={{
            width: 80,
            padding: '6px 6px 4px',
            background: template === t.id ? '#f8fafc' : 'transparent',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s',
            outline: 'none',
          }}
        >
          <TemplateMiniPreview id={t.id} active={template === t.id} />
          <span style={{
            fontSize: 9.5,
            fontWeight: template === t.id ? 700 : 500,
            color: template === t.id ? TEMPLATE_COLORS[t.id] : '#94a3b8',
            textAlign: 'center',
            lineHeight: 1.2,
          }}>{t.label}</span>
        </button>
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
}
