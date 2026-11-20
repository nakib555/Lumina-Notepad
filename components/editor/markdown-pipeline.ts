import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import hljs from 'highlight.js';
import markedKatex from 'marked-katex-extension';
import {
  CARET_MARKER,
  escapeHtml,
  escapeMarkdownTableCell,
  formatMarkdownImage,
  getCodeFenceDelimiter,
  hasOnlyDefaultImageStyles,
  insertMarkerIntoHighlightedHtml,
  sanitizeCodeLang,
  sanitizeUrl,
} from '@/lib/editor-helpers';

const katexExtension = markedKatex({ throwOnError: false, nonStandard: true });
katexExtension.extensions.forEach((ext) => {
  const origRenderer = ext.renderer;
  if (origRenderer) {
    ext.renderer = function (token) {
      if (token.text && token.text.includes(CARET_MARKER)) {
        const cleanText = token.text.replaceAll(CARET_MARKER, '').trim();
        if (!cleanText) {
          return CARET_MARKER;
        }
        const rendered = origRenderer.call(this, { ...token, text: cleanText });
        if (ext.name === 'blockKatex') {
          return rendered.trimEnd() + CARET_MARKER + '\n';
        }
        return rendered + CARET_MARKER;
      }
      return origRenderer.call(this, token);
    };
  }
});
marked.use(katexExtension);

const renderer = new marked.Renderer();

export let globalDefaultZebra = false;
export const setGlobalDefaultZebra = (val: boolean) => {
  globalDefaultZebra = val;
};

renderer.code = function (token) {
  const rawCode = token.text.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
  const langHasMarker = (token.lang || '').includes(CARET_MARKER);
  const cleanTokenLang = (token.lang || '').replaceAll(CARET_MARKER, '');
  const markerIndex = rawCode.indexOf(CARET_MARKER);
  const code = markerIndex !== -1 ? rawCode.replaceAll(CARET_MARKER, '') : rawCode;
  const rawLang = sanitizeCodeLang(cleanTokenLang);

  let lang = rawLang;
  let isAutoDetected = false;

  if (!lang || lang === 'text' || lang === 'auto') {
    try {
      const result = hljs.highlightAuto(code);
      if (result.language && result.relevance > 0) {
        lang = sanitizeCodeLang(result.language);
        isAutoDetected = true;
      }
    } catch (e) {
      console.warn('Auto language detection failed:', e);
    }
  }

  const langAliases: Record<string, string> = { text: 'text', plaintext: 'text', txt: 'text', raw: 'text' };
  const finalLang = sanitizeCodeLang(langAliases[lang] || lang) || 'text';
  const persistedLang =
    !rawLang || rawLang === 'auto'
      ? ''
      : rawLang === 'text' || rawLang === 'plaintext' || rawLang === 'txt' || rawLang === 'raw'
        ? 'text'
        : finalLang;

  const displayLangName = !finalLang || finalLang === 'text' ? 'Code' : finalLang.charAt(0).toUpperCase() + finalLang.slice(1);
  const displayLang = escapeHtml(isAutoDetected ? `${displayLangName} (Auto)` : displayLangName);

  let highlightedValue = '';
  if (!finalLang || finalLang === 'text') {
    highlightedValue = escapeHtml(code);
  } else {
    try {
      if (hljs.getLanguage(finalLang)) {
        highlightedValue = hljs.highlight(code, { language: finalLang }).value;
      } else {
        const autoResult = hljs.highlightAuto(code);
        highlightedValue = autoResult.value;
      }
    } catch {
      highlightedValue = escapeHtml(code);
    }
  }

  if (markerIndex !== -1) {
    highlightedValue = insertMarkerIntoHighlightedHtml(highlightedValue, markerIndex, CARET_MARKER);
  } else if (langHasMarker) {
    highlightedValue = CARET_MARKER + highlightedValue;
  }

  const inlineStyle =
    "margin:0;padding:1rem 1.25rem;font-size: 14px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
  const highlightedContent = `<pre style="${inlineStyle}"><code class="code-element outline-none block min-h-[20px] whitespace-pre print:whitespace-pre-wrap [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${highlightedValue}</code></pre>`;

  return `<div class="code-block-wrapper not-prose my-6 print:my-2" contenteditable="false" data-lang="${escapeHtml(persistedLang)}"><div class="rounded-xl font-sans group transition-colors duration-300 border border-border relative overflow-hidden bg-muted/10"><div class="sticky top-0 z-10 flex flex-wrap justify-between items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 border-b border-border select-none bg-muted/30"><div class="flex items-center gap-2 sm:gap-3 min-w-0"><span class="text-[13px] font-semibold text-muted-foreground font-mono capitalize language-label truncate">${displayLang}</span></div><div class="flex items-center gap-1 sm:gap-2 flex-wrap"><button type="button" aria-label="Run code" class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 run-code-btn whitespace-nowrap" title="Run Code" onclick="window.dispatchEvent(new CustomEvent('run-code-block', { detail: { code: this.closest('.code-block-wrapper').querySelector('.code-element').textContent, language: '${finalLang}' } }));"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Run</button><button type="button" aria-label="Open code in sandbox" class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all open-panel-btn whitespace-nowrap" title="Open in Side Panel" onclick="window.dispatchEvent(new CustomEvent('open-code-block', { detail: { code: this.closest('.code-block-wrapper').querySelector('.code-element').textContent, language: '${finalLang}' } }));"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Open</button><button type="button" aria-label="Copy code" class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95 copy-btn whitespace-nowrap" onclick="navigator.clipboard?.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent || ''); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='', 2000);" title="Copy code"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="copy-text"></span></button><button type="button" aria-label="Delete code block" class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 delete-btn whitespace-nowrap" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div></div><div class="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-transparent code-container whitespace-pre print:whitespace-pre-wrap font-mono m-0 text-slate-800 dark:text-slate-200">${highlightedContent}</div></div></div>`;
};

renderer.table = function (token: import('marked').Tokens.Table) {
  let html = marked.Renderer.prototype.table.call(this, token);
  html = html.replace('<table>', '<table class="w-full m-0 table-auto border-separate border-spacing-0">');
  const zebraClass = globalDefaultZebra ? ' table-zebra' : '';
  return `\n<div data-md-table="true" class="overflow-x-auto w-full table-wrapper my-8 print:my-2 rounded-xl rounded-table border border-[var(--border)] p-[1px] bg-background shadow-xs print:border-none print:shadow-none${zebraClass}">\n${html}\n</div>\n`;
};

renderer.listitem = function (token: import('marked').Tokens.ListItem) {
  let html = marked.Renderer.prototype.listitem.call(this, token);
  if (token.task) {
    html = html.replace(/^<li>/, '<li class="task-list-item" style="list-style-type: none;">');
    html = html.replace(/\sdisabled(?:="")?/gi, '');
    html = html.replace(
      /<input([^>]*?)type="checkbox"([^>]*?)>/,
      '<input$1type="checkbox"$2 style="margin-right: 0.5rem; margin-top: 0.25rem; cursor: pointer;">'
    );
  }
  return html;
};

renderer.list = function (token: import('marked').Tokens.List) {
  let html = marked.Renderer.prototype.list.call(this, token);
  if (token.items.some((item) => item.task)) {
    html = html.replace(/^<ul([^>]*)>/, '<ul$1 class="contains-task-list" style="list-style-type: none; padding-left: 0;">');
  }
  return html;
};

renderer.link = function (token: import('marked').Tokens.Link) {
  const safeHref = sanitizeUrl(token.href || '');
  if (!safeHref) {
    return this.parser.parseInline(token.tokens);
  }
  return marked.Renderer.prototype.link.call(this, { ...token, href: safeHref });
};

renderer.image = function (token: import('marked').Tokens.Image) {
  const safeSrc = sanitizeUrl(token.href || '', { allowDataImage: true });
  if (!safeSrc) {
    return escapeHtml(token.text || '');
  }
  let html = marked.Renderer.prototype.image.call(this, { ...token, href: safeSrc });
  html = html.replace(/^<img /, '<img draggable="false" ');
  return html;
};

export const parseMarkdown = (text: string) => {
  const cleanText = text.replace(/[\u200B\u2061]/g, '').replace(/\xA0/g, ' ');
  const trailingNewlinesMatch = cleanText.match(/\n*$/);
  const trailingNewlinesCount = trailingNewlinesMatch ? trailingNewlinesMatch[0].length : 0;
  const textToParse = cleanText.replace(/\n+$/, '');

  const html = marked.parse(textToParse, { renderer, breaks: true, gfm: true }) as string;
  let finalHtml = html;

  finalHtml = finalHtml.replace(/<p><\/p>/g, '<p><br></p>');
  finalHtml = finalHtml.replace(/<td([^>]*)>\s*<\/td>/gi, '<td$1><br></td>');
  finalHtml = finalHtml.replace(/<th([^>]*)>\s*<\/th>/gi, '<th$1><br></th>');

  const countToAppend = Math.max(0, trailingNewlinesCount - 1);
  for (let i = 0; i < countToAppend; i++) {
    finalHtml += '<p><br></p>';
  }

  const trimmed = finalHtml.trim();
  if (countToAppend === 0 && trimmed.endsWith('</div>')) {
    finalHtml += '<p><br></p>';
  }

  return finalHtml;
};

export const applyParsedHtmlWithCaretMarker = (targetEl: HTMLElement, parsedHtml: string) => {
  const doc = targetEl.ownerDocument;
  const NodeFilterRef = doc.defaultView?.NodeFilter ?? NodeFilter;
  const temp = doc.createElement('div');
  temp.innerHTML = parsedHtml;

  // Handle CARET_MARKER inside KaTeX formulas without corrupting <annotation> or MathML
  const katexNodes = Array.from(temp.querySelectorAll('.katex-display, .katex')).filter((el) => {
    const parentDisplay = el.parentElement?.closest('.katex-display');
    return !parentDisplay;
  });

  for (const katexEl of katexNodes) {
    if (katexEl.textContent?.includes(CARET_MARKER)) {
      const katexWalker = doc.createTreeWalker(katexEl, NodeFilterRef.SHOW_TEXT);
      let tNode: Node | null;
      while ((tNode = katexWalker.nextNode())) {
        if (tNode.nodeValue?.includes(CARET_MARKER)) {
          tNode.nodeValue = tNode.nodeValue.replaceAll(CARET_MARKER, '');
        }
      }
      const markerSpan = doc.createElement('span');
      markerSpan.id = 'caret-marker';
      katexEl.parentNode?.insertBefore(markerSpan, katexEl.nextSibling);
    }
  }

  // Strip CARET_MARKER if it leaked into href attributes and place marker after link
  temp.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && href.includes(CARET_MARKER)) {
      a.setAttribute('href', href.replaceAll(CARET_MARKER, ''));
      if (!a.textContent?.includes(CARET_MARKER)) {
        const markerSpan = doc.createElement('span');
        markerSpan.id = 'caret-marker';
        a.parentNode?.insertBefore(markerSpan, a.nextSibling);
      }
    }
  });

  // Replace remaining CARET_MARKER tokens inside normal text nodes with <span id="caret-marker"></span>
  const textNodesWithMarker: Text[] = [];
  const walker = doc.createTreeWalker(temp, NodeFilterRef.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue?.includes(CARET_MARKER)) {
      textNodesWithMarker.push(node as Text);
    }
  }

  for (const textNode of textNodesWithMarker) {
    const value = textNode.nodeValue || '';
    const parts = value.split(CARET_MARKER);
    const frag = doc.createDocumentFragment();
    parts.forEach((part, idx) => {
      if (part) {
        frag.appendChild(doc.createTextNode(part));
      }
      if (idx < parts.length - 1) {
        const markerSpan = doc.createElement('span');
        markerSpan.id = 'caret-marker';
        frag.appendChild(markerSpan);
      }
    });
    textNode.parentNode?.replaceChild(frag, textNode);
  }

  // Ensure empty container blocks holding only #caret-marker keep a <br> so they don't collapse
  temp.querySelectorAll('#caret-marker').forEach((markerEl) => {
    const parent = markerEl.parentElement;
    if (parent && parent.childNodes.length === 1 && /^(P|DIV|LI|TD|TH|H[1-6]|BLOCKQUOTE)$/i.test(parent.tagName)) {
      parent.insertBefore(doc.createElement('br'), markerEl);
    }
  });

  targetEl.innerHTML = '';
  while (temp.firstChild) {
    targetEl.appendChild(temp.firstChild);
  }
};

export const createTurndownService = () => {
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
  });

  service.escape = (string) => string;

  service.use(gfm as import('turndown').Plugin);

  // Override tableCell rule to guarantee pipes are escaped without double-escaping and columns stay aligned
  service.addRule('tableCellEscapePipes', {
    filter: ['th', 'td'],
    replacement: function (content, node) {
      const normalized = content
        .replace(/^(?:<br>\s*)+|(?:<br>\s*)+$/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();
      const escaped = escapeMarkdownTableCell(normalized);
      const parentTr = node.parentElement;
      const index = parentTr ? Array.prototype.indexOf.call(parentTr.children, node) : 0;
      const prefix = index === 0 ? '| ' : ' ';
      return prefix + (escaped || ' ') + ' |';
    },
  });

  service.addRule('caretMarker', {
    filter: function (node) {
      return node.nodeType === 1 && node.nodeName === 'SPAN' && (node as HTMLElement).id === 'caret-marker';
    },
    replacement: function () {
      return CARET_MARKER;
    },
  });

  service.addRule('emptyTableFix', {
    filter: function (node) {
      return node.nodeName === 'TABLE' && (node as HTMLTableElement).rows.length === 0;
    },
    replacement: function () {
      return '';
    },
  });

  service.addRule('tableRows', {
    filter: function (node) {
      if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
      const el = node as HTMLElement;
      if (el.querySelector('table, pre, .code-block-wrapper, .sketch-container')) return false;
      const text = (el.textContent || '').replace(/[\u200B\u2061]/g, '').trim();
      return !text.includes('\n') && /^\|.*\|$/.test(text);
    },
    replacement: function (content, node) {
      const next = (node as HTMLElement).nextElementSibling;
      const nextText = (next?.textContent || '').replace(/[\u200B\u2061]/g, '').trim();
      const isNextRow = Boolean(next && /^\|.*\|$/.test(nextText));
      return content + (isNextRow ? '\n' : '\n\n');
    },
  });

  service.addRule('customCodeBlock', {
    filter: function (node) {
      return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('code-block-wrapper');
    },
    replacement: function (_content, node) {
      const wrapperEl = node as HTMLElement;
      const dataLang = wrapperEl.getAttribute('data-lang');
      let lang = '';
      if (dataLang !== null) {
        lang = dataLang === 'text' ? 'text' : sanitizeCodeLang(dataLang);
      } else {
        const languageSpan = wrapperEl.querySelector('.language-label');
        const rawLabel = (languageSpan?.textContent || '')
          .replace(/\s*\(auto\)\s*$/i, '')
          .trim()
          .toLowerCase();
        lang = rawLabel === 'code' || rawLabel === 'text' ? '' : sanitizeCodeLang(rawLabel);
      }

      let codeContainer = wrapperEl.querySelector('code');
      if (!codeContainer) {
        codeContainer = wrapperEl.querySelector('.code-container') || wrapperEl;
      }

      const extractTextWithNewlines = (el: Node): string => {
        let text = '';
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === 3) {
            text += (child.textContent || '').replace(/[\u200B\u2061]/g, '');
          } else if (child.nodeType === 1) {
            const elName = child.nodeName.toUpperCase();
            if (elName === 'SPAN' && (child as HTMLElement).id === 'caret-marker') {
              text += CARET_MARKER;
            } else if (elName === 'BR') {
              text += '\n';
            } else if (elName === 'DIV' || elName === 'P') {
              if (text && !text.endsWith('\n')) {
                text += '\n';
              }
              text += extractTextWithNewlines(child);
              if (!text.endsWith('\n')) {
                text += '\n';
              }
            } else {
              text += extractTextWithNewlines(child);
            }
          }
        }
        return text;
      };

      const codeTextRaw = codeContainer ? extractTextWithNewlines(codeContainer) : '';
      const code = codeTextRaw.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
      const fence = getCodeFenceDelimiter(code.replaceAll(CARET_MARKER, ''));
      return `\n\n${fence}${lang}\n${code}\n${fence}\n\n`;
    },
  });

  service.addRule('bookmarkMarker', {
    filter: function (node) {
      return node.nodeType === 1 && node.nodeName === 'SPAN' && (node as HTMLElement).classList.contains('bookmark-marker');
    },
    replacement: function (_content, node) {
      const id = escapeHtml((node as HTMLElement).getAttribute('data-bookmark-id') || '');
      return `<span class="bookmark-marker" data-bookmark-id="${id}" style="display:inline-block; border-radius:4px; margin:0 2px; cursor:pointer;" title="Bookmark" contenteditable="false">&#128278;</span>`;
    },
  });

  service.addRule('sketchContainer', {
    filter: function (node) {
      return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('sketch-container');
    },
    replacement: function (_content, node) {
      const safeHtml = (node as HTMLElement).outerHTML.replace(/\n *\n/g, '\n').replace(/\n/g, ' ');
      return '\n\n' + safeHtml + '\n\n';
    },
  });

  service.addRule('emptyBlocks', {
    filter: function (node) {
      if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
      const el = node as HTMLElement;
      if (el.querySelector('img, table, pre, hr, svg, input, .code-block-wrapper, .sketch-container, .table-wrapper, .katex, .bookmark-marker')) {
        return false;
      }
      const cleanedHtml = el.innerHTML
        .replace(/<span id=["']caret-marker["'][^>]*>[\s\S]*?<\/span>/gi, '')
        .replace(/[\u200B\u2061]|&#8203;|&ZeroWidthSpace;/gi, '')
        .trim()
        .toLowerCase();
      return cleanedHtml === '' || cleanedHtml === '<br>' || cleanedHtml === '<br/>';
    },
    replacement: function (content, node) {
      const el = node as HTMLElement;
      const marker = content.replace(/[\u200B\u2061\r\n]|<br\s*\/?>/gi, '').trim();
      const rawTextWithoutCaret = (el.textContent || '')
        .replaceAll(CARET_MARKER, '')
        .replace(/[\u200B\u2061\s]/g, '');
      const hasBr = Boolean(el.querySelector('br'));

      if (!hasBr && rawTextWithoutCaret === '') {
        return marker ? `\n\n${marker}\n\n` : '';
      }
      const prevEl = el.previousElementSibling;
      if (
        !el.nextElementSibling &&
        prevEl &&
        (prevEl.classList.contains('code-block-wrapper') ||
          prevEl.classList.contains('table-wrapper') ||
          prevEl.classList.contains('sketch-container') ||
          prevEl.tagName === 'HR')
      ) {
        return marker ? `\n\n${marker}\n\n` : '';
      }
      return '\n\n<br>' + marker + '\n\n';
    },
  });

  service.addRule('preserveBr', {
    filter: 'br',
    replacement: function (_content, node) {
      let parent = node.parentNode;
      while (parent) {
        if (parent.nodeName === 'TD' || parent.nodeName === 'TH') {
          return '<br>';
        }
        if (parent.nodeName === 'PRE') {
          return '\n';
        }
        parent = parent.parentNode;
      }

      if (node.parentNode && node.parentNode.nodeName === 'X-TURNDOWN') {
        return '<br>';
      }

      return '\n';
    },
  });

  service.addRule('tableBlocks', {
    filter: function (node) {
      if (!['P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE'].includes(node.nodeName)) return false;
      let parent = node.parentNode;
      while (parent) {
        if (parent.nodeName === 'TD' || parent.nodeName === 'TH') {
          return true;
        }
        parent = parent.parentNode;
      }
      return false;
    },
    replacement: function (content, node) {
      if (!content.trim()) return '';
      let prefix = '';
      if (node.nodeName === 'LI') {
        prefix = '• ';
      }
      return prefix + content + (node.nextSibling ? '<br>' : '');
    },
  });

  service.addRule('preserveHtmlTags', {
    filter: ['u', 'sub', 'sup'],
    replacement: function (content, node) {
      const tag = node.nodeName.toLowerCase();
      return `<${tag}>${content}</${tag}>`;
    },
  });

  service.addRule('roundedTable', {
    filter: function (node) {
      if (node.nodeName !== 'DIV') return false;
      const el = node as HTMLElement;
      if (!(el.classList.contains('table-wrapper') || el.classList.contains('overflow-x-auto'))) return false;
      if (!el.querySelector('table')) return false;
      return el.getAttribute('data-custom-style') === 'true' || !el.hasAttribute('data-md-table');
    },
    replacement: function (content, node) {
      const el = node as HTMLElement;
      const table = el.querySelector('table');
      if (table) {
        const classes = Array.from(el.classList);
        const hasRoundedTable = el.classList.contains('rounded-table');
        const curveClass = classes.find((c: string) => c.startsWith('rounded-') && c !== 'rounded-table') || '';
        const isZebra = el.classList.contains('table-zebra');

        const cleanTable = table.cloneNode(true) as HTMLTableElement;
        const cells = Array.from(cleanTable.querySelectorAll('td, th'));
        cells.forEach((cell) => {
          cell.classList.remove(
            'bg-slate-100/50', 'dark:bg-slate-800/30',
            'bg-blue-50/10', 'dark:bg-blue-950/10',
            'bg-slate-200/50', 'dark:bg-slate-700/50',
            'bg-blue-100/20', 'dark:bg-blue-900/20',
            'ring-2', 'ring-blue-500', 'ring-inset', 'z-10', 'relative', 'active-cell'
          );
          if (!cell.getAttribute('class')) {
            cell.removeAttribute('class');
          }
        });

        cleanTable.className = 'border-hidden m-0 w-full';

        const wrapperClasses = ['overflow-x-auto', 'overflow-hidden', 'w-full', 'table-wrapper', 'my-8'];
        if (hasRoundedTable) {
          wrapperClasses.push('rounded-table');
        }
        if (curveClass) {
          wrapperClasses.push(curveClass);
        }
        if (hasRoundedTable || curveClass) {
          wrapperClasses.push('border', 'border-border');
        }
        if (isZebra) {
          wrapperClasses.push('table-zebra');
        }

        return '\n\n<div data-custom-style="true" class="' + wrapperClasses.join(' ') + '">\n' + cleanTable.outerHTML + '\n</div>\n\n';
      }
      return content;
    },
  });

  service.addRule('alignTag', {
    filter: function (node) {
      if (node.nodeType !== 1) return false;
      const el = node as HTMLElement;
      if (el.closest('.code-block-wrapper, .sketch-container, .table-wrapper, .katex, .katex-display')) return false;
      if (
        el.classList.contains('code-block-wrapper') ||
        el.classList.contains('sketch-container') ||
        el.classList.contains('table-wrapper')
      ) {
        return false;
      }
      if (!['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) return false;

      const attrAlign = (el.getAttribute('align') || '').trim().toLowerCase();
      const styleAlign = (el.style.textAlign || '').trim().toLowerCase();
      if (attrAlign === 'left') return true;
      const effectiveAlign = attrAlign || styleAlign;
      return /^(center|right|justify)$/.test(effectiveAlign);
    },
    replacement: function (content, node) {
      const el = node as HTMLElement;
      const attrAlign = (el.getAttribute('align') || '').trim().toLowerCase();
      const styleAlign = (el.style.textAlign || '').trim().toLowerCase();
      const rawAlign = attrAlign || styleAlign;
      const safeAlign = /^(left|center|right|justify)$/.test(rawAlign) ? rawAlign : 'left';

      let inner = content;
      const headingMatch = node.nodeName.match(/^H([1-6])$/);
      if (headingMatch) {
        const hashes = '#'.repeat(Number(headingMatch[1]));
        inner = `${hashes} ${content.trim()}`;
      }
      return `\n<div align="${safeAlign}">\n\n${inner}\n\n</div>\n`;
    },
  });

  service.addRule('fontSizeSpan', {
    filter: function (node) {
      return (
        node.nodeType === 1 &&
        node.nodeName === 'SPAN' &&
        (node as HTMLElement).getAttribute('style') !== null &&
        (node as HTMLElement).getAttribute('style')?.includes('font-size') === true
      );
    },
    replacement: function (content, node) {
      const style = (node as HTMLElement).getAttribute('style') || '';
      const match = style.match(/font-size:\s*([^;]+)/);
      if (match && match[1]) {
        const cleanFontSize = match[1].trim();
        if (/^\d+(?:\.\d+)?(?:pt|px|em|rem|%)$/i.test(cleanFontSize)) {
          return `<span style="font-size: ${cleanFontSize}">${content}</span>`;
        }
      }
      return content;
    },
  });

  service.addRule('image', {
    filter: 'img',
    replacement: function (_content, node) {
      const el = node as HTMLElement;
      const alt = el.getAttribute('alt') || '';
      const rawSrc = el.getAttribute('src') || '';
      const safeSrc = sanitizeUrl(rawSrc, { allowDataImage: true });
      if (!safeSrc) return '';

      const title = el.getAttribute('title') || '';
      const styleRaw = el.getAttribute('style') || '';
      const width = el.getAttribute('width');
      const height = el.getAttribute('height');

      if (hasOnlyDefaultImageStyles(styleRaw, width, height)) {
        return formatMarkdownImage(alt, safeSrc, title);
      }

      let style = styleRaw;
      if (width && !style.includes('width')) style += `${style.trim() && !style.trim().endsWith(';') ? '; ' : ''}width: ${width}; `;
      if (height && !style.includes('height')) style += `${style.trim() && !style.trim().endsWith(';') ? '; ' : ''}height: ${height};`;

      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      const styleAttr = style.trim() ? ` style="${escapeHtml(style.trim())}"` : '';
      return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}"${titleAttr}${styleAttr} />`;
    },
  });

  service.addRule('math', {
    filter: function (node) {
      return (
        node.nodeName === 'SPAN' &&
        (node as HTMLElement).classList.contains('katex') &&
        !(node.parentElement && node.parentElement.classList.contains('katex-display'))
      );
    },
    replacement: function (content, node) {
      const annotation = (node as HTMLElement).querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        return '$' + annotation.textContent + '$';
      }
      return content;
    },
  });

  service.addRule('mathDisplay', {
    filter: function (node) {
      return node.nodeName === 'SPAN' && (node as HTMLElement).classList.contains('katex-display');
    },
    replacement: function (content, node) {
      const annotation = (node as HTMLElement).querySelector('annotation[encoding="application/x-tex"]');
      if (annotation && annotation.textContent) {
        return '\n\n$$' + annotation.textContent + '$$\n\n';
      }
      return content;
    },
  });

  service.addRule('hr', {
    filter: 'hr',
    replacement: function () {
      return '\n\n---\n\n';
    },
  });

  service.addRule('mathError', {
    filter: function (node) {
      return node.nodeName === 'SPAN' && (node as HTMLElement).classList.contains('katex-error');
    },
    replacement: function (_content, node) {
      return (node as HTMLElement).textContent || '';
    },
  });

  return {
    turndown: (html: string) => {
      let md = service.turndown(html);
      md = md.replace(/[\u200B\u2061]/g, '');
      let prev;
      do {
        prev = md;
        md = md.replace(/(^[ \t]*\|[^\n]+\|[ \t]*)\n[ \t]*\n(?=[ \t]*\|[^\n]+\|[ \t]*$)/gm, '$1\n');
      } while (prev !== md);
      return md;
    },
  };
};
