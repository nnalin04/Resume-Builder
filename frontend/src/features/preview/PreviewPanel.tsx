import type { ReactNode, RefObject } from 'react';

import PaginatedPreview, { PAGE_GAP } from '../../components/PaginatedPreview';
import type { FontSize } from '../../utils/fontScales';
import type { ResumeData, TemplateId } from '../../types/resumeTypes';


const RESUME_W = 794;
const RESUME_H = 1123;

interface PreviewPanelProps {
  template: TemplateId;
  previewPageCount: number;
  previewContentRef: RefObject<HTMLDivElement | null>;
  resumeData: ResumeData;
  fontSize: FontSize;
  previewComponent: (props: { data: ResumeData; fontSize?: FontSize }) => ReactNode;
  setPreviewPageCount: (count: number) => void;
}

export default function PreviewPanel({
  template,
  previewPageCount,
  previewContentRef,
  resumeData,
  fontSize,
  previewComponent,
  setPreviewPageCount,
}: PreviewPanelProps) {
  return (
    <div
      className="resume-preview-panel"
      style={{
        flex: '1 1 0',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#f1f5f9',
        padding: 32,
        paddingTop: 16,
        position: 'relative',
      }}
    >
      {(template === 'twocolumn' || template === 'professional') && (
        <div style={{ width: '100%', maxWidth: RESUME_W * 0.82, marginBottom: 12, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: '#92400e', lineHeight: 1.5 }}>
          ⚠ This template uses a multi-column layout. Many ATS systems may misread or skip your content. Use a single-column template when applying via an online portal.
        </div>
      )}

      {previewPageCount > 0 && (
        <div style={{ width: '100%', maxWidth: RESUME_W * 0.82, display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 10,
              background: previewPageCount <= 2 ? '#dcfce7' : previewPageCount === 3 ? '#fef3c7' : '#fee2e2',
              color: previewPageCount <= 2 ? '#15803d' : previewPageCount === 3 ? '#92400e' : '#b91c1c',
              border: `1px solid ${previewPageCount <= 2 ? '#bbf7d0' : previewPageCount === 3 ? '#fcd34d' : '#fca5a5'}`,
            }}
          >
            {previewPageCount} {previewPageCount === 1 ? 'page' : 'pages'}
            {previewPageCount >= 3 ? ' — consider trimming' : ''}
          </span>
        </div>
      )}

      <div
        className="resume-preview-placeholder"
        style={{
          flexShrink: 0,
          width: RESUME_W * 0.82,
          height: (previewPageCount * RESUME_H + (previewPageCount - 1) * PAGE_GAP) * 0.82,
        }}
      >
        <div
          className="print-scale-inner"
          ref={previewContentRef}
          style={{
            transform: 'scale(0.82)',
            transformOrigin: 'top left',
            width: RESUME_W,
          }}
        >
          <PaginatedPreview
            data={resumeData}
            fontSize={fontSize}
            templateId={template}
            previewComponent={previewComponent}
            onPageCountChange={setPreviewPageCount}
          />
        </div>
      </div>
    </div>
  );
}
