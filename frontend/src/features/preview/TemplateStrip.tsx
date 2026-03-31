import { TEMPLATE_COLORS, TEMPLATES, TemplateMiniPreview } from './templateRegistry';
import type { TemplateId } from '../../types/resumeTypes';


interface TemplateStripProps {
  template: TemplateId;
  setTemplate: (templateId: TemplateId) => void;
}

export default function TemplateStrip({ template, setTemplate }: TemplateStripProps) {
  return (
    <div
      className="hide-on-print"
      style={{
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
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Template</span>
      {TEMPLATES.map((option) => (
        <button
          key={option.id}
          onClick={() => setTemplate(option.id)}
          title={option.label}
          style={{
            width: 80,
            padding: '6px 6px 4px',
            background: template === option.id ? '#f8fafc' : 'transparent',
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
          <TemplateMiniPreview id={option.id} active={template === option.id} />
          <span
            style={{
              fontSize: 9.5,
              fontWeight: template === option.id ? 700 : 500,
              color: template === option.id ? TEMPLATE_COLORS[option.id] : '#94a3b8',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {option.label}
          </span>
        </button>
      ))}
      <div style={{ height: 8 }} />
    </div>
  );
}
