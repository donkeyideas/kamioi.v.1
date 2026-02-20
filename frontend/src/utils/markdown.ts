/**
 * Lightweight markdown-to-HTML converter for blog content.
 * Handles: headings, bold, italic, links, images, lists, blockquotes, code blocks, paragraphs.
 * Output is sanitized against basic XSS (no script tags, no event handlers).
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function processInline(line: string): string {
  let result = escapeHtml(line);

  // Images: ![alt](url)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />');

  // Links: [text](url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#3B82F6;text-decoration:underline">$1</a>');

  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code: `text`
  result = result.replace(/`([^`]+)`/g, '<code style="background:rgba(124,58,237,0.1);padding:2px 6px;border-radius:4px;font-size:0.9em">$1</code>');

  return result;
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      html.push(`<p style="margin:0 0 16px;line-height:1.8">${paragraphLines.map(processInline).join(' ')}</p>`);
      paragraphLines = [];
    }
  }

  function closeList() {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0;font-size:13px"><code>${escapeHtml(codeContent.join('\n'))}</code></pre>`);
        codeContent = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        closeList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      flushParagraph();
      closeList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = { 1: '28px', 2: '24px', 3: '20px', 4: '18px', 5: '16px', 6: '14px' };
      const margins: Record<number, string> = { 1: '32px 0 16px', 2: '28px 0 12px', 3: '24px 0 10px', 4: '20px 0 8px', 5: '16px 0 6px', 6: '12px 0 4px' };
      html.push(`<h${level} style="font-size:${sizes[level]};font-weight:700;margin:${margins[level]};color:var(--text-primary)">${processInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      flushParagraph();
      closeList();
      const content = line.trim().slice(2);
      html.push(`<blockquote style="border-left:3px solid #7C3AED;padding:8px 16px;margin:16px 0;color:var(--text-secondary);font-style:italic">${processInline(content)}</blockquote>`);
      continue;
    }

    // Unordered list
    if (line.trim().match(/^[-*]\s+/)) {
      flushParagraph();
      if (!inList) {
        html.push('<ul style="margin:8px 0 16px;padding-left:24px">');
        inList = true;
      }
      const content = line.trim().replace(/^[-*]\s+/, '');
      html.push(`<li style="margin:4px 0;line-height:1.7">${processInline(content)}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.trim().match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (!inList) {
        html.push('<ol style="margin:8px 0 16px;padding-left:24px">');
        inList = true;
      }
      html.push(`<li style="margin:4px 0;line-height:1.7">${processInline(olMatch[1])}</li>`);
      continue;
    }

    // Horizontal rule
    if (line.trim().match(/^[-*_]{3,}$/)) {
      flushParagraph();
      closeList();
      html.push('<hr style="border:none;border-top:1px solid var(--border-subtle);margin:24px 0" />');
      continue;
    }

    // Regular text -> accumulate for paragraph
    closeList();
    paragraphLines.push(line);
  }

  // Flush remaining
  flushParagraph();
  closeList();
  if (inCodeBlock && codeContent.length > 0) {
    html.push(`<pre style="background:rgba(0,0,0,0.3);border-radius:8px;padding:16px;overflow-x:auto;margin:16px 0;font-size:13px"><code>${escapeHtml(codeContent.join('\n'))}</code></pre>`);
  }

  return html.join('\n');
}
