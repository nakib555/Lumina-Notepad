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
