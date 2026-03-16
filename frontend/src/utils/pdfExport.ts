export async function exportToPDF(_elementId: string, filename = 'resume') {
  // Inject a one-time print stylesheet that hides everything except the resume
  const styleId = '__resume_print_style__';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    @media print {
      @page {
        size: A4 portrait;
        margin: 0;
      }
      body > * { display: none !important; }
      body > #__resume_print_wrapper__ { display: block !important; }

      #__resume_print_wrapper__ {
        position: fixed;
        top: 0; left: 0;
        width: 210mm;
        height: 297mm;
        overflow: hidden;
        background: #fff;
      }

      /* Force exact colors in print */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }
  `;

  // Clone the resume into a top-level wrapper so @media print can isolate it
  const preview = document.getElementById('resume-preview');
  if (!preview) { alert('Resume preview not found.'); return; }

  // Remove any old wrapper
  const old = document.getElementById('__resume_print_wrapper__');
  if (old) document.body.removeChild(old);

  const wrapper = document.createElement('div');
  wrapper.id = '__resume_print_wrapper__';
  wrapper.style.cssText = 'display:none;';

  const clone = preview.cloneNode(true) as HTMLElement;
  clone.style.width = '210mm';
  clone.style.height = '297mm';
  clone.style.overflow = 'hidden';
  clone.removeAttribute('id'); // avoid duplicate id

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Wait for fonts + layout
  await document.fonts.ready;
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

  // Trigger print dialog — user saves as PDF (perfect quality, no library)
  window.print();

  // Cleanup after dialog closes
  setTimeout(() => {
    document.body.removeChild(wrapper);
    style!.textContent = '';
  }, 1000);
}
