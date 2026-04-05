export interface RichSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

export interface RichLine {
  text: string;
  segments: RichSegment[];
}

function walkNode(node: Node, marks: { bold: boolean; italic: boolean; underline: boolean; strike: boolean }): RichSegment[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text) return [];
    return [{ text, ...marks }];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const newMarks = { ...marks };
  if (tag === 'strong' || tag === 'b') newMarks.bold = true;
  if (tag === 'em' || tag === 'i') newMarks.italic = true;
  if (tag === 'u') newMarks.underline = true;
  if (tag === 's' || tag === 'del' || tag === 'strike') newMarks.strike = true;
  const segments: RichSegment[] = [];
  for (const child of Array.from(el.childNodes)) {
    segments.push(...walkNode(child, newMarks));
  }
  return segments;
}

function segmentsToLine(segments: RichSegment[]): RichLine {
  const text = segments.map(s => s.text).join('');
  return { text, segments };
}

export function htmlToLines(html: string): RichLine[] {
  if (!html || !html.trim()) return [];

  // Plain text path
  if (!html.includes('<')) {
    return html.split('\n').filter(l => l.trim()).map(line => ({
      text: line,
      segments: [{ text: line }],
    }));
  }

  // SSR guard
  if (typeof window === 'undefined') {
    return html.split('\n').filter(l => l.trim()).map(line => ({
      text: line,
      segments: [{ text: line }],
    }));
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;
  const lines: RichLine[] = [];
  const baseMarks = { bold: false, italic: false, underline: false, strike: false };

  function processNode(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'li') {
      const segments = walkNode(el, baseMarks);
      const line = segmentsToLine(segments);
      if (line.text.trim()) lines.push(line);
    } else if (tag === 'ul' || tag === 'ol') {
      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    } else if (tag === 'p') {
      const segments = walkNode(el, baseMarks);
      const line = segmentsToLine(segments);
      if (line.text.trim()) lines.push(line);
    } else {
      for (const child of Array.from(el.childNodes)) {
        processNode(child);
      }
    }
  }

  for (const child of Array.from(body.childNodes)) {
    processNode(child);
  }

  return lines;
}

export function htmlToPlainLines(html: string): string[] {
  return htmlToLines(html).map(l => l.text).filter(Boolean);
}
