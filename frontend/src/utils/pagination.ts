/**
 * Measures the height of a DOM element by rendering it temporarily in a shadow container.
 * This is used for precise A4 page pagination calculations.
 */
export async function measureElementHeight(
  html: string,
  width: number,
  styles: string[] = []
): Promise<number> {
  // Ensure fonts are ready before measurement
  if (typeof document !== 'undefined' && (document as any).fonts) {
    await (document as any).fonts.ready;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = `${width}px`;
  container.style.visibility = 'hidden';
  container.className = 'print-measurement-container';

  // Apply styles
  const styleTag = document.createElement('style');
  styleTag.textContent = styles.join('\n');
  container.appendChild(styleTag);

  const inner = document.createElement('div');
  inner.innerHTML = html;
  container.appendChild(inner);

  document.body.appendChild(container);
  const height = inner.offsetHeight;
  document.body.removeChild(container);

  return height;
}
