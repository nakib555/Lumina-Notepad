export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeCodeLang(raw: string): string {
  const token = (raw || '').match(/\S*/)?.[0]?.toLowerCase() || '';
  return token.replace(/[^a-z0-9_-]/g, '');
}

export function escapeScriptTagContent(code: string): string {
  if (!code) return '';
  return code.replace(/<\/(script)/gi, '<\\/$1');
}

export function isValidImageUrl(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  if (/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(trimmed)) {
    return true;
  }

  return /^(https?:\/\/|\/|\.\/|\.\.\/)\S+\.(jpeg|jpg|gif|png|webp|avif|svg)(\?[^\s#]*)?(#\S*)?$/i.test(trimmed);
}

export function cleanAiResponse(text: string): string {
  if (!text) return '';

  const stripCodeFence = (input: string): string => {
    const codeBlockRegex = /^```(?:markdown|html|text)?\s*\n?([\s\S]*?)\n?\s*```$/i;
    const matches = input.match(codeBlockRegex);
    if (matches) {
      return matches[1].trim();
    }
    const genericCodeBlockRegex = /^```(?:markdown|html|text)?\s*([\s\S]*?)\s*```$/i;
    const genericMatches = input.match(genericCodeBlockRegex);
    if (genericMatches) {
      return genericMatches[1].trim();
    }
    return input;
  };

  let cleaned = stripCodeFence(text.trim());

  const introPatterns = [
    /^here is the translation of your text into [a-zA-Z\s-]+:?\s*\n*/i,
    /^sure, here is the translation of your text into [a-zA-Z\s-]+:?\s*\n*/i,
    /^here is the updated text:?\s*\n*/i,
    /^here is the polished text:?\s*\n*/i,
    /^here is the summary:?\s*\n*/i,
    /^here is the translation:?\s*\n*/i,
    /^here's the updated text:?\s*\n*/i,
    /^here's the polished text:?\s*\n*/i,
    /^here's the summary:?\s*\n*/i,
    /^here's the translation:?\s*\n*/i,
    /^sure, here is the updated text:?\s*\n*/i,
    /^sure, here is the polished text:?\s*\n*/i,
    /^sure, here's the updated text:?\s*\n*/i,
    /^sure, here's the polished text:?\s*\n*/i,
    /^sure, here is the summary:?\s*\n*/i,
    /^sure, here's the summary:?\s*\n*/i,
    /^sure, here is the translation:?\s*\n*/i,
    /^sure, here's the translation:?\s*\n*/i,
    /^sure! here is the text:?\s*\n*/i,
    /^sure, here are the corrections:?\s*\n*/i,
    /^here are the corrections for the text:?\s*\n*/i,
    /^as requested, here is the text:?\s*\n*/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of introPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  const outroPatterns = [
    /\s*\n*hope this helps!?$/i,
    /\s*\n*let me know if you need anything else!?$/i,
    /\s*\n*let me know if you want me to make any other changes!?$/i,
    /\s*\n*let me know if you need any other changes!?$/i,
    /\s*\n*let me know if you need further assistance!?$/i,
    /\s*\n*i hope this helps!?$/i,
    /\s*\n*hope this is what you were looking for!?$/i,
    /\s*\n*i hope this is what you were looking for!?$/i,
  ];

  changed = true;
  while (changed) {
    changed = false;
    for (const pattern of outroPatterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        changed = true;
      }
    }
  }

  return stripCodeFence(cleaned);
}

export const CARET_MARKER = 'XLUMINACARET9F2AX';

export function sanitizeUrl(url: string, options?: { allowDataImage?: boolean }): string {
  if (!url) return '';
  // Strip ASCII control chars and whitespace at ends
  const cleaned = Array.from(url)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join('')
    .trim();
  if (!cleaned) return '';

  if (options?.allowDataImage) {
    if (/^data:image\/(?:png|jpeg|jpg|gif|webp|avif|bmp|ico|svg\+xml)(?:;charset=[^;,\s]+)?;base64,[a-z0-9+/=\s]+$/i.test(cleaned)) {
      return cleaned.replace(/\s+/g, '');
    }
  }

  // Relative paths, query strings, or hash anchors
  if (/^(?:\/(?!\/)|\.\/|\.\.\/|#|\?)/.test(cleaned)) {
    return cleaned;
  }

  // Explicit scheme check (block javascript:, vbscript:, data:text/html, etc.)
  const schemeMatch = cleaned.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    const allowedSchemes = options?.allowDataImage
      ? ['http', 'https']
      : ['http', 'https', 'mailto', 'tel'];
    return allowedSchemes.includes(scheme) ? cleaned : '';
  }

  // Protocol-relative or bare host/path without scheme
  if (cleaned.startsWith('//')) {
    return `https:${cleaned}`;
  }

  return cleaned;
}

export function sanitizeFontSizeValue(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed}pt`;
  }
  if (/^\d+(?:\.\d+)?(?:pt|px|em|rem|%)$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}

export function getCodeFenceDelimiter(code: string): string {
  if (!code) return '```';
  const matches = code.match(/`+/g);
  const maxRun = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  return '`'.repeat(Math.max(3, maxRun + 1));
}

export function insertMarkerIntoHighlightedHtml(
  highlightedHtml: string,
  offset: number,
  marker: string = CARET_MARKER
): string {
  if (offset <= 0) return marker + highlightedHtml;
  let visibleCount = 0;

  for (let i = 0; i < highlightedHtml.length; i++) {
    if (visibleCount >= offset) {
      return highlightedHtml.slice(0, i) + marker + highlightedHtml.slice(i);
    }

    const ch = highlightedHtml[i];
    if (ch === '<') {
      const closeIdx = highlightedHtml.indexOf('>', i);
      if (closeIdx !== -1) {
        i = closeIdx;
        continue;
      }
    } else if (ch === '&') {
      const entityMatch = highlightedHtml
        .slice(i)
        .match(/^&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i);
      if (entityMatch) {
        i += entityMatch[0].length - 1;
        visibleCount += 1;
        continue;
      }
    }

    visibleCount += 1;
  }

  return highlightedHtml + marker;
}

export function hasOnlyDefaultImageStyles(
  styleRaw: string,
  widthAttr?: string | null,
  heightAttr?: string | null
): boolean {
  if ((widthAttr && widthAttr.trim()) || (heightAttr && heightAttr.trim())) {
    return false;
  }
  if (!styleRaw || !styleRaw.trim()) {
    return true;
  }
  const declarations = styleRaw
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);
  return declarations.every((decl) => /^max-width\s*:\s*100%$/i.test(decl));
}

export function formatMarkdownImage(alt: string, src: string, title?: string): string {
  const safeAlt = (alt || '').replace(/([[\]])/g, '\\$1');
  const trimmedSrc = (src || '').trim();
  const formattedSrc = /[\s()]/.test(trimmedSrc) && !trimmedSrc.startsWith('<')
    ? `<${trimmedSrc}>`
    : trimmedSrc;
  const trimmedTitle = (title || '').trim();
  if (trimmedTitle) {
    const safeTitle = trimmedTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `![${safeAlt}](${formattedSrc} "${safeTitle}")`;
  }
  return `![${safeAlt}](${formattedSrc})`;
}

export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B\u2061]/g, '')
    .replace(/\xA0/g, ' ');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Strip embedded sketch containers (which hold large Excalidraw JSON + SVG markup)
  text = text.replace(/<div[^>]*class=["'][^"']*sketch-container[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Extract fenced code blocks into placeholders so inner lines aren't stripped as markdown
  const codePlaceholders: string[] = [];
  text = text.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\2[ \t]*$/gm, (_m, _indent, _fence, body) => {
    const idx = codePlaceholders.length;
    codePlaceholders.push(body.replace(/\n$/, ''));
    return `@@CODEBLOCK_${idx}@@`;
  });

  // Replace HTML <br> with newlines before stripping other tags
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove HTML wrapper/inline tags while keeping their inner text
  text = text.replace(/<\/?(?:div|p|span|u|sub|sup|mark|strong|b|em|i|del|s|strike|a|blockquote|pre|code|ul|ol|li|table|thead|tbody|tr|th|td|h[1-6]|hr|img|input)\b[^>]*>/gi, '');

  // Strip markdown images BEFORE links (keep alt text only if it isn't generic fallback)
  text = text.replace(/!\[([^\]]*)\]\((?:[^()\n]+|\([^()\n]*\))*\)/g, (_m, alt) => (alt || '').trim());

  // Strip markdown links [text](url "title") -> text
  text = text.replace(/\[([^\]]+)\]\((?:[^()\n]+|\([^()\n]*\))*\)/g, '$1');

  // Strip custom font-size syntax [text]{size} -> text
  text = text.replace(/\[([^\]]+)\]\{[^}]+\}/g, '$1');

  // Strip display & inline KaTeX delimiters
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_m, expr) => expr.trim());
  text = text.replace(/(?<!\\)\$([^$\n]+?)\$/g, '$1');

  // Process line-level markdown constructs
  const lines = text.split('\n').map((line) => {
    // Drop GFM table delimiter rows
    if (/^\s*\|?(?:\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(line)) {
      return '';
    }
    // Clean table data rows: "| a | b |" -> "a  b"
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = splitMarkdownTableRow(line);
      return cells.join('  ').trim();
    }
    // Strip horizontal rules
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      return '';
    }
    // Strip ATX headings
    let cleaned = line.replace(/^\s{0,3}#{1,6}[ \t]+/, '');
    // Strip blockquotes (including nested > >)
    cleaned = cleaned.replace(/^(?:\s{0,3}>\s?)+/, '');
    // Strip task list checkboxes and list markers
    cleaned = cleaned.replace(/^\s*[-*+][ \t]+\[[ xX]\][ \t]+/, '');
    cleaned = cleaned.replace(/^\s*[-*+][ \t]+/, '');
    cleaned = cleaned.replace(/^\s*\d+\.[ \t]+/, '');
    return cleaned;
  });

  text = lines.join('\n');

  // Strip inline code, bold, italic, strikethrough (protecting snake_case underscores)
  text = text.replace(/`([^`\n]+)`/g, '$1');
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, '$2');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/\*([^*\n]+)\*/g, '$1');
  text = text.replace(/(^|[^\w])_([^_\n]+)_([^\w]|$)/g, '$1$2$3');
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Unescape backslash-escaped punctuation (e.g. \|, \*, \#)
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, '$1');

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'");

  // Restore fenced code block contents
  text = text.replace(/@@CODEBLOCK_(\d+)@@/g, (_m, idx) => codePlaceholders[Number(idx)] ?? '');

  // Normalize excessive blank lines and trim
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function escapeMarkdownTableCell(val: string): string {
  if (!val) return '';
  return val.replace(/(?<!\\)\|/g, '\\|');
}

export function splitMarkdownTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) {
    trimmed = trimmed.slice(0, -1);
  }

  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '|';
      i++;
    } else if (ch === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}
