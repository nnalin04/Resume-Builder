import type { ReactNode } from 'react';

import PaginatedPreview, { PAGE_GAP } from '../../components/PaginatedPreview';
import { TEMPLATE_COLORS, TEMPLATES } from './templateRegistry';
import type { FontSize } from '../../utils/fontScales';
import type { ResumeData, TemplateId } from '../../types/resumeTypes';


const RESUME_W = 794;
const RESUME_H = 1123;

interface MobilePreviewModalProps {
  show: boolean;
  setShow: (show: boolean) => void;
  template: TemplateId;
  setTemplate: (templateId: TemplateId) => void;
  resumeData: ResumeData;
  fontSize: FontSize;
  setFontSize: (fontSize: FontSize) => void;
  previewComponent: (props: { data: ResumeData; fontSize?: FontSize }) => ReactNode;
  mobilePageCount: number;
  setMobilePageCount: (count: number) => void;
  exporting: boolean;
  handleExport: () => Promise<void>;
}

export default function MobilePreviewModal({
  show,
  setShow,
  template,
  setTemplate,
  resumeData,
  fontSize,
  setFontSize,
  previewComponent,
  mobilePageCount,
  setMobilePageCount,
  exporting,
  handleExport,
}: MobilePreviewModalProps) {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid #334155' }}>
        <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 15 }}>Resume Preview</span>
        <button
          onClick={() => setShow(false)}
          style={{ background: '#334155', border: 'none', borderRadius: 8, color: '#94a3b8', padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600, outline: 'none' }}
        >
          ✕ Close
        </button>
      </div>
      <div style={{ background: '#1e293b', padding: '8px 12px', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #334155' }}>
        {TEMPLATES.map((option) => (
          <button
            key={option.id}
            onClick={() => setTemplate(option.id)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              background: template === option.id ? TEMPLATE_COLORS[option.id] : '#334155',
              color: template === option.id ? '#fff' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              outline: 'none',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 16, WebkitOverflowScrolling: 'touch' as const }}>
        <div
          style={{
            flexShrink: 0,
            width: RESUME_W * 0.44,
            height: (mobilePageCount * RESUME_H + (mobilePageCount - 1) * PAGE_GAP) * 0.44,
          }}
        >
          <div style={{ transform: 'scale(0.44)', transformOrigin: 'top left', width: RESUME_W }}>
            <PaginatedPreview
              data={resumeData}
              fontSize={fontSize}
              templateId={template}
              previewComponent={previewComponent}
              onPageCountChange={setMobilePageCount}
            />
          </div>
        </div>
      </div>
      <div style={{ background: '#1e293b', borderTop: '1px solid #334155', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Font:</span>
        {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
          <button
            key={size}
            onClick={() => setFontSize(size)}
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              background: fontSize === size ? '#6366f1' : '#334155',
              color: fontSize === size ? '#fff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
            }}
          >
            {size.charAt(0).toUpperCase() + size.slice(1)}
          </button>
        ))}
        <button
          onClick={() => {
            setShow(false);
            void handleExport();
          }}
          disabled={exporting}
          style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.7 : 1, outline: 'none' }}
        >
          {exporting ? 'Exporting...' : '↓ Download PDF'}
        </button>
      </div>
    </div>
  );
}
