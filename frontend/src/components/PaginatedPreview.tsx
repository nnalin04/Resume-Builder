import React, { useState, useEffect, useRef } from 'react';

const A4_H = 1123;
const A4_W = 794;
export const PAGE_GAP = 24; // exported so Dashboard can compute total height

interface Props {
  data: any;
  fontSize: 'small' | 'medium' | 'large';
  templateId: string;
  previewComponent: React.ComponentType<{ data: any; fontSize: any }>;
  onPageCountChange?: (n: number) => void;
}

/**
 * Renders a resume template across one or more A4-sized page containers,
 * with a visible gap between pages.
 *
 * Algorithm:
 * 1. Render the template once in a hidden off-screen container.
 * 2. After fonts are ready, measure the total rendered height and the
 *    bounding boxes of every direct child element.
 * 3. Walk through the content in A4-height increments. Whenever a child
 *    element would be bisected by the natural page boundary, move the cut
 *    point to just before that child — identical to how Word/Docs handle it.
 * 4. Render N visible page containers, each showing the template content
 *    offset by the corresponding cut point via CSS translateY.
 */
export default function PaginatedPreview({
  data,
  fontSize,
  templateId,
  previewComponent: Template,
  onPageCountChange,
}: Props) {
  // pageCuts[i] = starting Y offset (in template pixels) for page i
  const [pageCuts, setPageCuts] = useState<number[]>([0]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function computeCuts() {
      // Wait for web fonts so text reflows are complete before measuring
      await document.fonts.ready;
      if (cancelled || !measureRef.current) return;

      const root = measureRef.current.firstElementChild as HTMLElement | null;
      if (!root) return;

      // offsetHeight reflects the full natural height (minHeight + overflow)
      const totalH = root.offsetHeight;

      if (totalH <= A4_H) {
        if (!cancelled) {
          setPageCuts([0]);
          onPageCountChange?.(1);
        }
        return;
      }

      // Measure all direct children relative to the template root
      const rootTop = root.getBoundingClientRect().top;
      const childRects = Array.from(root.children).map(c => {
        const r = (c as HTMLElement).getBoundingClientRect();
        return { top: r.top - rootTop, bottom: r.bottom - rootTop };
      });

      // Determine cut points — prefer cutting between children, not mid-child
      const cuts: number[] = [0];
      let pageStart = 0;

      while (pageStart + A4_H < totalH) {
        const naturalEnd = pageStart + A4_H;
        let bestCut = naturalEnd;

        // Find the first child that would be bisected at naturalEnd
        for (const child of childRects) {
          if (
            child.top > pageStart &&
            child.top < naturalEnd &&
            child.bottom > naturalEnd
          ) {
            // Cut just before this element so it moves entirely to the next page
            bestCut = child.top;
            break;
          }
        }

        // Guard against infinite loop if a single child is taller than one page
        if (bestCut <= pageStart) bestCut = naturalEnd;

        cuts.push(bestCut);
        pageStart = bestCut;
      }

      if (!cancelled) {
        setPageCuts(cuts);
        onPageCountChange?.(cuts.length);
      }
    }

    computeCuts();
    return () => { cancelled = true; };
  }, [data, fontSize, templateId, onPageCountChange]);

  const pageCount = pageCuts.length;

  return (
    <>
      {/* ── Off-screen measurement render ───────────────────────────────── */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: -9999,
          left: -9999,
          width: A4_W,
          visibility: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <Template data={data} fontSize={fontSize} />
      </div>

      {/* ── Visible pages ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: PAGE_GAP }}>
        {pageCuts.map((startOffset, pageIdx) => (
          <React.Fragment key={`${templateId}-p${pageIdx}-${startOffset}`}>
            {/* Page container — fixed A4 height, clips overflow */}
            <div
              style={{
                width: A4_W,
                height: A4_H,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 2px 16px rgba(0,0,0,0.09)',
                flexShrink: 0,
              }}
            >
              {/* Shift template content so this page starts at startOffset */}
              <div style={{ transform: `translateY(-${startOffset}px)` }}>
                <Template data={data} fontSize={fontSize} />
              </div>
            </div>

            {/* Page separator shown between pages */}
            {pageIdx < pageCount - 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  Page {pageIdx + 2}
                </span>
                <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
