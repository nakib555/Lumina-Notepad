import React, { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import { renderToStaticMarkup } from 'react-dom/server';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { Trash2, Settings2, ExternalLink, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { TableEditDialog } from './table-edit-dialog';
import { ImageEditDialog } from './image-edit-dialog';
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import { cn } from "@/lib/utils";

const CARET_MARKER = '\u200B\u200C\u200D';

const getCaretCharacterOffsetWithin = (element: HTMLElement) => {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = win.getSelection()!.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
};

const setCaretPosition = (element: HTMLElement, offset: number) => {
    const createRange = (node: Node, chars: { count: number }, range: Range | null): Range => {
        if (!range) {
            range = document.createRange();
            range.selectNode(node);
            range.setStart(node, 0);
        }
        if (chars.count === 0) {
            range.setEnd(node, chars.count);
        } else if (node && chars.count > 0) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent!.length < chars.count) {
                    chars.count -= node.textContent!.length;
                } else {
                    range.setEnd(node, chars.count);
                    chars.count = 0;
                }
            } else {
                for (let lp = 0; lp < node.childNodes.length; lp++) {
                    range = createRange(node.childNodes[lp], chars, range);
                    if (chars.count === 0) {
                        break;
                    }
                }
            }
        }
        return range;
    };
    const sel = window.getSelection();
    if (sel) {
        const chars = { count: offset };
        const range = createRange(element, chars, null);
        if (range) {
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
};

const findAndRemoveMarker = (node: Node): { foundNode: Text, offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
        const index = node.nodeValue?.indexOf(CARET_MARKER);
        if (index !== undefined && index > -1) {
            node.nodeValue = node.nodeValue?.replace(CARET_MARKER, '') || '';
            return { foundNode: node as Text, offset: index };
        }
    } else {
        for (let i = 0; i < node.childNodes.length; i++) {
            const result = findAndRemoveMarker(node.childNodes[i]);
            if (result) return result;
        }
    }
    return null;
};

marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

const renderer = new marked.Renderer();

const CUSTOM_STYLE = {
  margin: 0,
  padding: '1rem 1.25rem',
  fontSize: '13px',
  lineHeight: '1.5',
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  background: 'transparent',
};

renderer.code = function(token) {
  const code = token.text;
  const rawLang = (token.lang || '').match(/\S*/)?.[0]?.toLowerCase() || 'text';
  
  const langAliases: Record<string, string> = { text: 'text', plaintext: 'text', txt: 'text', raw: 'text' };
  const lang = langAliases[rawLang] || rawLang;
  
  const displayLang = (lang === 'text' || !lang) ? 'Text' : lang.charAt(0).toUpperCase() + lang.slice(1);

  let highlightedContent = '';
  if (lang === 'text') {
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    
    // Fallback style converted to inline CSS for the pre tag
    const inlineStyle = "margin:0;padding:1rem 1.25rem;font-size:13px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
    
    highlightedContent = `<pre style="${inlineStyle}"><code class="code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${escapeHtml(code)}</code></pre>`;
  } else {
    try {
      highlightedContent = renderToStaticMarkup(
        <SyntaxHighlighter
          language={lang}
          useInlineStyles={true}
          customStyle={CUSTOM_STYLE}
          PreTag="div"
          codeTagProps={{
            className: "code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none] font-mono"
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
      // Inject contenteditable into the code tag after generation
      highlightedContent = highlightedContent.replace('<code', '<code contenteditable="plaintext-only"');
    } catch {
      const inlineStyle = "margin:0;padding:1rem 1.25rem;font-size:13px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
      const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      highlightedContent = `<pre style="${inlineStyle}"><code class="code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${escapeHtml(code)}</code></pre>`;
    }
  }

  return `
<div class="code-block-wrapper border border-[#e5e7eb] dark:border-[#374151] rounded-md my-4 overflow-hidden not-prose shadow-sm max-w-full relative" contenteditable="false">
  <div class="bg-[#f8f9fa] dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] px-4 py-2 flex justify-between items-center text-[13px]">
    <div class="font-semibold text-[#6366f1] dark:text-[#818cf8] language-label flex items-center">
      ${displayLang}
    </div>
    <div class="flex items-center gap-4">
      <button class="flex items-center gap-1 text-[#6366f1] dark:text-[#818cf8] hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer">
        <span class="text-xs">»</span> Open
      </button>
      <button class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity bg-transparent border-none cursor-pointer copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='Copy', 2000);">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span class="copy-text">Copy</span>
      </button>
      <button class="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-opacity bg-transparent border-none cursor-pointer delete-btn" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  </div>
  <div class="bg-[#f4f7f9] dark:bg-[#0d1117] overflow-x-auto overflow-y-auto max-h-[500px] w-full max-w-full code-container whitespace-pre font-mono m-0 text-slate-800 dark:text-slate-200">
    ${highlightedContent}
  </div>
</div>
`;
};

const parseMarkdown = (text: string) => {
  return marked.parse(text, { renderer, breaks: true, gfm: true }) as string;
};

  export interface EditorAreaRef {
    flushPreviewEdit: () => string | undefined;
  }

interface EditorAreaProps {
  content: string;
  theme: string;
  handleContentChange: (content: string) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  editorAreaRef?: React.RefObject<EditorAreaRef | null>;
  noteId?: string;
  textareaRef?: React.RefObject<HTMLDivElement | null>;
  isAutoMarkdownEnabled?: boolean;
  isViewMode?: boolean;
  isEraserMode?: boolean;
}

export const EditorArea = ({
  content,
  handleContentChange,
  handleDrop,
  handleDragOver,
  editorAreaRef,
  noteId,
  textareaRef,
  isAutoMarkdownEnabled,
  isViewMode,
  isEraserMode
}: EditorAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [tableRect, setTableRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [colRects, setColRects] = useState<{ left: number, width: number }[]>([]);
  const [rowRects, setRowRects] = useState<{ top: number, height: number }[]>([]);
  const [selectedColIndex, setSelectedColIndex] = useState<number | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isTableEditDialogOpen, setIsTableEditDialogOpen] = useState(false);
  const [activeTableRow, setActiveTableRow] = useState<HTMLTableRowElement | null>(null);
  const [activeTableRowRect, setActiveTableRowRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null);
  const [imageRect, setImageRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [isImageEditDialogOpen, setIsImageEditDialogOpen] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
  const [linkRect, setLinkRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  const resizeStartData = useRef<{ startX: number, startY: number, startWidth: number, startHeight: number, startLeft: number, startTop: number, direction: string } | null>(null);

  // Sync previewRef with textareaRef if provided
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (textareaRef && previewRef.current) {
      if (typeof textareaRef === 'function') {
        textareaRef(previewRef.current);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (textareaRef as any).current = previewRef.current;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/immutability */

  const updateTableRect = useCallback((table: HTMLTableElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    
    const tableRect = table.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setTableRect({
      top: tableRect.top - parentRect.top,
      left: tableRect.left - parentRect.left,
      width: tableRect.width,
      height: tableRect.height
    });

    const firstRow = table.querySelector('tr');
    if (firstRow) {
      const tds = Array.from(firstRow.children) as HTMLElement[];
      setColRects(tds.map(td => {
         const r = td.getBoundingClientRect();
         return { left: r.left - parentRect.left, width: r.width };
      }));
    }

    const trs = Array.from(table.querySelectorAll('tr'));
    setRowRects(trs.map(tr => {
       const r = tr.getBoundingClientRect();
       return { top: r.top - parentRect.top, height: r.height };
    }));
  }, []);

  const updateImageRect = useCallback((img: HTMLImageElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    
    const imgRect = img.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setImageRect({
      top: imgRect.top - parentRect.top,
      left: imgRect.left - parentRect.left,
      width: imgRect.width,
      height: imgRect.height
    });
  }, []);

  const updateLinkRect = useCallback((link: HTMLAnchorElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    
    const lRect = link.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setLinkRect({
      top: lRect.top - parentRect.top,
      left: lRect.left - parentRect.left,
      width: lRect.width,
      height: lRect.height
    });
  }, []);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isTableEditDialogOpen || isImageEditDialogOpen) return;
      if (!previewRef.current) return;
      
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      const img = target.closest('img');
      const link = target.closest('a');
      const isHoveringToolbar = target.closest('.table-floating-toolbar') || target.closest('.image-floating-toolbar') || target.closest('.link-floating-toolbar') || target.closest('[role="dialog"]');
      
      // Inside table checking
      if (table && previewRef.current.contains(table) && !target.closest('.table-floating-toolbar')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredTable !== table) setHoveredTable(table);
        updateTableRect(table);
        setHoveredImage(null);
        setHoveredLink(null);
      } else if (img && previewRef.current.contains(img) && !target.closest('.image-floating-toolbar')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredImage !== img) setHoveredImage(img as HTMLImageElement);
        updateImageRect(img as HTMLImageElement);
        setHoveredTable(null);
        setHoveredLink(null);
      } else if (link && previewRef.current.contains(link) && !target.closest('.link-floating-toolbar')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredLink !== link) setHoveredLink(link as HTMLAnchorElement);
        updateLinkRect(link as HTMLAnchorElement);
        setHoveredImage(null);
        setHoveredTable(null);
      } else if (isHoveringToolbar) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        if (!timeoutRef.current && (hoveredTable || hoveredImage || hoveredLink)) {
          timeoutRef.current = setTimeout(() => {
            setHoveredTable(null);
            setHoveredImage(null);
            setHoveredLink(null);
            timeoutRef.current = null;
          }, 150);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hoveredTable, updateTableRect, isTableEditDialogOpen, hoveredImage, updateImageRect, isImageEditDialogOpen, hoveredLink, updateLinkRect]);

  useEffect(() => {
    if (!hoveredTable) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (hoveredTable) updateTableRect(hoveredTable);
      });
    });
    
    observer.observe(hoveredTable);
    return () => observer.disconnect();
  }, [hoveredTable, updateTableRect]);

  useEffect(() => {
    if (!hoveredImage) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (hoveredImage) updateImageRect(hoveredImage);
      });
    });
    
    observer.observe(hoveredImage);
    return () => observer.disconnect();
  }, [hoveredImage, updateImageRect]);

  // Initialize turndown service once
  const turndownService = React.useMemo(() => {
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
    });
    
    service.escape = (string) => string; // Do not escape anything to allow live markdown typing

    service.use(gfm as import('turndown').Plugin);

    service.addRule('tableRows', {
      filter: function (node) {
        return (node.nodeName === 'P' || node.nodeName === 'DIV') && 
               /^\s*\|(.*)\|\s*$/.test(node.textContent || '');
      },
      replacement: function (content) {
        return content + '\n';
      }
    });

    service.addRule('customCodeBlock', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('code-block-wrapper');
      },
      replacement: function (_content, node) {
        const languageSpan = (node as HTMLElement).querySelector('.language-label');
        const language = languageSpan ? languageSpan.textContent?.trim().toLowerCase() : '';
        let codeContainer = (node as HTMLElement).querySelector('code');
        
        // Firefox/Chrome can strip the <code> tag during complex selections inside contenteditable.
        if (!codeContainer) {
          codeContainer = (node as HTMLElement).querySelector('.code-container') || node;
        }
        
        const extractTextWithNewlines = (el: Node): string => {
          let text = '';
          for (let i = 0; i < el.childNodes.length; i++) {
            const child = el.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE) {
              text += child.textContent || '';
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const elName = child.nodeName.toUpperCase();
              if (elName === 'BR') {
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
        // Remove exactly one trailing newline if it exists because our extraction adds one for the last block element
        const code = codeTextRaw.endsWith('\n') ? codeTextRaw.slice(0, -1) : codeTextRaw;
        const lang = language === 'code' ? '' : language;
        return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
      }
    });

    service.addRule('bookmarkMarker', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'SPAN' && (node as HTMLElement).classList.contains('bookmark-marker');
      },
      replacement: function (_content, node) {
        const id = (node as HTMLElement).getAttribute('data-bookmark-id') || '';
        return `<span class="bookmark-marker" data-bookmark-id="${id}" style="display:inline-block; border-radius:4px; margin:0 2px; cursor:pointer;" title="Bookmark" contenteditable="false">&#128278;</span>`;
      }
    });

    service.addRule('preserveBr', {
      filter: 'br',
      replacement: function () {
        return '<br>';
      }
    });

    service.addRule('preserveHtmlTags', {
      filter: ['u', 'sub', 'sup'],
      replacement: function (content, node) {
        const tag = node.nodeName.toLowerCase();
        return `<${tag}>${content}</${tag}>`;
      }
    });

    service.addRule('roundedTable', {
      filter: function (node) {
        return node.nodeName === 'DIV' && node.classList.contains('overflow-x-auto') && node.classList.contains('rounded-table');
      },
      replacement: function (content, node) {
        const table = node.querySelector('table');
        if (table) {
          const classes = Array.from(node.classList);
          const curveClass = classes.find(c => c.startsWith('rounded-') && c !== 'rounded-table') || 'rounded-xl';
          table.classList.add('border-hidden', 'm-0', 'w-full');
          table.classList.remove('border-0');
          return '\n\n<div class="overflow-x-auto w-full table-wrapper my-8 rounded-table ' + curveClass + ' border border-border">\n' + table.outerHTML + '\n</div>\n\n';
        }
        return content;
      }
    });

    service.addRule('alignDiv', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'DIV' && 
               ((node as HTMLElement).getAttribute('align') !== null || (node as HTMLElement).style.textAlign !== '');
      },
      replacement: function (content, node) {
        const align = (node as HTMLElement).getAttribute('align') || (node as HTMLElement).style.textAlign;
        return `\n<div align="${align}">\n\n${content}\n\n</div>\n`;
      }
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
          return `<span style="font-size: ${match[1].trim()}">${content}</span>`;
        }
        return content;
      }
    });

    service.addRule('image', {
      filter: 'img',
      replacement: function (content, node) {
        const alt = (node as HTMLElement).getAttribute('alt') || '';
        const src = (node as HTMLElement).getAttribute('src') || '';
        const title = (node as HTMLElement).getAttribute('title') || '';
        const styleRaw = (node as HTMLElement).getAttribute('style') || '';
        const width = (node as HTMLElement).getAttribute('width');
        const height = (node as HTMLElement).getAttribute('height');
        
        let style = styleRaw;
        if (width && !style.includes('width')) style += `width: ${width}; `;
        if (height && !style.includes('height')) style += `height: ${height};`;
        
        const titleAttr = title ? ` title="${title}"` : '';
        
        if (style.trim()) {
          const styleAttr = ` style="${style.trim()}"`;
          return `<img src="${src}" alt="${alt}"${titleAttr}${styleAttr} />`;
        }
        
        return title ? `![${alt}](${src}${titleAttr})` : `![${alt}](${src})`;
      }
    });

    service.addRule('math', {
      filter: function (node) {
        return node.nodeName === 'SPAN' && 
               (node as HTMLElement).classList.contains('katex') && 
               !(node.parentElement && node.parentElement.classList.contains('katex-display'));
      },
      replacement: function (content, node) {
        const annotation = (node as HTMLElement).querySelector('annotation[encoding="application/x-tex"]');
        if (annotation && annotation.textContent) {
          return '$' + annotation.textContent + '$';
        }
        return content;
      }
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
      }
    });

    service.addRule('mathError', {
      filter: function (node) {
        return node.nodeName === 'SPAN' && (node as HTMLElement).classList.contains('katex-error');
      },
      replacement: function (_content, node) {
        return (node as HTMLElement).textContent || '';
      }
    });

    return {
      turndown: (html: string) => {
        let md = service.turndown(html);
        let prev;
        do {
          prev = md;
          md = md.replace(/(^[ \t]*\|[^\n]+\|[ \t]*)\n[ \t]*\n(?=[ \t]*\|[^\n]+\|[ \t]*$)/gm, '$1\n');
        } while (prev !== md);
        return md;
      }
    };
  }, []);

  const lastProcessedContent = useRef(content);

  const flushPreviewEdit = useCallback(() => {
    if (previewRef.current) {
      const htmlContent = previewRef.current.innerHTML;
      const markdown = turndownService.turndown(htmlContent);
      if (markdown !== lastProcessedContent.current) {
        lastProcessedContent.current = markdown;
        handleContentChange(markdown);
      }
      return markdown;
    }
  }, [handleContentChange, turndownService]);



  const handleImageResizeStart = useCallback((e: React.MouseEvent, direction: string = 'se') => {
    if (!hoveredImage) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizingImage(true);
    resizeStartData.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: hoveredImage.offsetWidth,
      startHeight: hoveredImage.offsetHeight,
      startLeft: hoveredImage.offsetLeft,
      startTop: hoveredImage.offsetTop,
      direction
    };
  }, [hoveredImage]);

  useEffect(() => {
    if (!isResizingImage || !hoveredImage || !resizeStartData.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const { startX, startWidth, startHeight, direction } = resizeStartData.current!;
      const dx = e.clientX - startX;
      
      const ratio = startWidth / startHeight;
      let newWidth = startWidth;
      
      if (direction.includes('e')) {
        newWidth = Math.max(50, startWidth + dx);
      } else if (direction.includes('w')) {
        newWidth = Math.max(50, startWidth - dx);
      }

      const newHeight = newWidth / ratio;

      hoveredImage.style.width = `${newWidth}px`;
      hoveredImage.style.height = `${newHeight}px`;
      updateImageRect(hoveredImage);
    };

    const handleMouseUp = () => {
      setIsResizingImage(false);
      resizeStartData.current = null;
      flushPreviewEdit();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingImage, hoveredImage, updateImageRect, flushPreviewEdit]);

  const deleteImage = useCallback(() => {
    if (hoveredImage && hoveredImage.parentNode) {
      const wrapper = hoveredImage.closest('.image-wrapper');
      if (wrapper) {
        wrapper.remove();
      } else {
        hoveredImage.remove();
      }
      setHoveredImage(null);
      flushPreviewEdit();
    }
  }, [hoveredImage, flushPreviewEdit]);

  const handleImageEditConfirm = useCallback((newSrc: string, width: string, height: string, alt: string, align: 'left'|'center'|'right') => {
    if (!hoveredImage) return;
    
    /* eslint-disable react-hooks/immutability */
    hoveredImage.src = newSrc;
    if (width) {
      hoveredImage.style.width = width;
    }
    if (height) {
      hoveredImage.style.height = height;
    }
    hoveredImage.alt = alt;
    hoveredImage.title = alt; // Use alt as caption title
    /* eslint-enable react-hooks/immutability */

    if (align === 'left') {
      hoveredImage.style.display = 'block';
      hoveredImage.style.marginLeft = '0';
      hoveredImage.style.marginRight = 'auto';
    } else if (align === 'right') {
      hoveredImage.style.display = 'block';
      hoveredImage.style.marginLeft = 'auto';
      hoveredImage.style.marginRight = '0';
    } else {
      hoveredImage.style.display = 'block';
      hoveredImage.style.marginLeft = 'auto';
      hoveredImage.style.marginRight = 'auto';
    }
    
    // Clear wrapper alignment if any exists from previous versions
    const wrapper = hoveredImage.parentElement;
    if (wrapper) {
      wrapper.style.textAlign = '';
      wrapper.style.justifyContent = '';
    }
    
    flushPreviewEdit();
  }, [hoveredImage, flushPreviewEdit]);



  const handleTableEditConfirm = useCallback((targetRows: number, targetCols: number, curveClass: string, tableData?: { headers: string[], rows: string[][], alignments?: string[] }) => {
    if (!hoveredTable) return;

    const tbody = hoveredTable.querySelector('tbody');
    const thead = hoveredTable.querySelector('thead');
    if (!tbody || !thead) return;

    if (tableData) {
      // Rebuild the entire table contents safely using the provided structural data
      // which has preserved the exact HTML via innerHTML
      thead.innerHTML = '';
      const headerTr = document.createElement('tr');
      tableData.headers.forEach((h, i) => {
        const th = document.createElement('th');
        th.innerHTML = h || 'Header';
        if (tableData.alignments?.[i]) {
          th.setAttribute('align', tableData.alignments[i]);
          th.style.textAlign = tableData.alignments[i];
        }
        headerTr.appendChild(th);
      });
      thead.appendChild(headerTr);

      tbody.innerHTML = '';
      tableData.rows.forEach(rowData => {
        const tr = document.createElement('tr');
        rowData.forEach((cellHtml, i) => {
          const td = document.createElement('td');
          td.innerHTML = cellHtml || 'Cell';
          if (tableData.alignments?.[i]) {
            td.setAttribute('align', tableData.alignments[i]);
            td.style.textAlign = tableData.alignments[i];
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    } else {
      // Fallback for old way
      const firstRow = hoveredTable.querySelector('tr');
      const currentCols = firstRow ? firstRow.querySelectorAll('th, td').length : 0;

      // Adjust columns
      if (targetCols > currentCols) {
        const diff = targetCols - currentCols;
        // Add to header
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
          for (let i = 0; i < diff; i++) {
            const th = document.createElement('th');
            th.textContent = 'Header';
            headerRow.appendChild(th);
          }
        }
        // Add to body rows
        const bodyRows = tbody.querySelectorAll('tr');
        bodyRows.forEach(row => {
          for (let i = 0; i < diff; i++) {
            const td = document.createElement('td');
            td.textContent = 'Cell';
            row.appendChild(td);
          }
        });
      } else if (targetCols < currentCols) {
        const diff = currentCols - targetCols;
        // Remove from header
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
          for (let i = 0; i < diff; i++) {
            if (headerRow.lastChild) headerRow.removeChild(headerRow.lastChild);
          }
        }
        // Remove from body rows
        const bodyRows = tbody.querySelectorAll('tr');
        bodyRows.forEach(row => {
          for (let i = 0; i < diff; i++) {
            if (row.lastChild) row.removeChild(row.lastChild);
          }
        });
      }

      // Adjust rows
      const targetBodyRows = Math.max(0, targetRows - 1);
      const currentBodyRows = tbody.querySelectorAll('tr').length;

      if (targetBodyRows > currentBodyRows) {
        const diff = targetBodyRows - currentBodyRows;
        for (let i = 0; i < diff; i++) {
          const tr = document.createElement('tr');
          for (let j = 0; j < targetCols; j++) {
            const td = document.createElement('td');
            td.textContent = 'Cell';
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
      } else if (targetBodyRows < currentBodyRows) {
        const diff = currentBodyRows - targetBodyRows;
        for (let i = 0; i < diff; i++) {
          if (tbody.lastChild) tbody.removeChild(tbody.lastChild);
        }
      }
    }

    // Handle rounded corners
    const wrapper = hoveredTable.closest('.overflow-x-auto');
    if (wrapper) {
      wrapper.classList.remove('rounded-table', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'border', 'border-border');
      hoveredTable.classList.remove('border-hidden', 'border-0');
      
      if (curveClass) {
        wrapper.classList.add('rounded-table', curveClass, 'border', 'border-border');
        hoveredTable.classList.add('border-hidden');
      }
    }

    flushPreviewEdit();
  }, [hoveredTable, flushPreviewEdit]);

  React.useImperativeHandle(editorAreaRef, () => ({
    flushPreviewEdit
  }));

  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    inputTimeoutRef.current = setTimeout(() => {
      setHoveredTable(null);
      setHoveredImage(null);

      if (isAutoMarkdownEnabled && previewRef.current) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && previewRef.current.contains(sel.anchorNode)) {
             const range = sel.getRangeAt(0);
             const markerNode = document.createTextNode(CARET_MARKER);
             range.insertNode(markerNode);
             // Move caret after the marker so subsequent character insertions don't get messed up if we had to return early, though we don't return early here
             
             const parseState = {
                 scrollContainers: [] as Array<{ el: Element | Window, top: number, left: number }>
             };
             let curr: HTMLElement | null = previewRef.current.parentElement;
             while (curr && curr !== document.body) {
                 parseState.scrollContainers.push({ el: curr, top: curr.scrollTop, left: curr.scrollLeft });
                 curr = curr.parentElement;
             }
             parseState.scrollContainers.push({ el: window, top: window.scrollY, left: window.scrollX });
             
             // --- RESCUE STRIPPED CODE BLOCKS ---
             // Chrome contenteditable commonly deletes `<pre>` and `<code>` when using backspace at the start of a block.
             // Without `<pre>`, Turndown's initial collapseWhitespace pass will DESTROY all ASCII art spacing.
             // We restore the `<pre><code>` wrappers on the live DOM before reading innerHTML.
             const codeContainers = previewRef.current.querySelectorAll('.code-container');
             codeContainers.forEach((container: Element) => {
               if (!container.querySelector('pre')) {
                   // Wrap contents in <pre><code class="... whitespace-pre font-mono ...">
                   const docFrag = document.createDocumentFragment();
                   while (container.firstChild) {
                       docFrag.appendChild(container.firstChild);
                   }
                   
                   const preEl = document.createElement('pre');
                   preEl.style.cssText = "margin:0;padding:1rem 1.25rem;font-size:13px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
                   
                   const codeEl = document.createElement('code');
                   codeEl.className = "code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none] font-mono";
                   codeEl.setAttribute('contenteditable', 'plaintext-only');
                   
                   codeEl.appendChild(docFrag);
                   preEl.appendChild(codeEl);
                   container.appendChild(preEl);
               }
             });

             const htmlWithMarker = previewRef.current.innerHTML;
             let mdWithMarker = turndownService.turndown(htmlWithMarker);
             
             // Fix caret inside table separator: move caret to the end of the previous line (header) to allow table parsing
             const tableSepRegex = new RegExp(`^[ \\t]*\\|?[-: \\t]*${CARET_MARKER}[-: \\t]*\\|?[ \\t]*$`, 'm');
             if (tableSepRegex.test(mdWithMarker)) {
                 const replaceRegex = new RegExp(`([^\\n]+)\\n([ \\t]*\\|?[-: \\t]*)(${CARET_MARKER})([-: \\t]*\\|?[ \\t]*(\\n|$))`, 'g');
                 mdWithMarker = mdWithMarker.replace(replaceRegex, `$1${CARET_MARKER}\n$2$4`);
             }

             // Also fix if caret is placed exactly after pipes in header/separator line in a way that breaks regex
             const afterPipeRegex = new RegExp(`(\\n[ \\t]*\\|[-: \\t]*)(${CARET_MARKER})([-: \\t]+\\|[ \\t]*\\n)`, 'g');
             mdWithMarker = mdWithMarker.replace(afterPipeRegex, '$1$3$2');
             
             const newHtml = parseMarkdown(mdWithMarker);
             previewRef.current.innerHTML = newHtml;
             
             const markerResult = findAndRemoveMarker(previewRef.current);
             if (markerResult) {
                 const { foundNode, offset } = markerResult;
                 const newRange = document.createRange();
                 newRange.setStart(foundNode, offset);
                 newRange.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(newRange);
             }
             
             // Restore true scroll targeting
             parseState.scrollContainers.forEach(({ el, top, left }) => {
                 if (el === window) {
                     window.scrollTo(left, top);
                 } else {
                     (el as HTMLElement).scrollTop = top;
                     (el as HTMLElement).scrollLeft = left;
                 }
             });
             
             const finalHtml = previewRef.current.innerHTML;
             const finalMarkdown = turndownService.turndown(finalHtml);
             lastProcessedContent.current = finalMarkdown;
             handleContentChange(finalMarkdown);
             return;
        }
      }

      flushPreviewEdit();
    }, 150);
  }, [flushPreviewEdit, isAutoMarkdownEnabled, turndownService, handleContentChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    };
  }, []);

  const handleCursorMove = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    // If it's a mouse click
    if (e && e.type === 'click') {
      const mouseEvent = e as React.MouseEvent<HTMLDivElement>;
      const target = mouseEvent.target as HTMLElement;
      
      // Handle Eraser Mode
      if (isEraserMode) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        const editor = previewRef.current;
        if (!editor || !editor.contains(target)) return;

        let didChange = false;

        // 1. Unwrap inline tags if we clicked inside one
        let current: HTMLElement | null = target;
        while (current && current !== editor) {
          const tag = current.tagName;
          const parent = current.parentElement;
          if (!parent) break;

          if (/^(STRONG|B|EM|I|U|S|DEL|STRIKE|CODE|MARK|A|SPAN)$/i.test(tag)) {
            while (current.firstChild) {
              parent.insertBefore(current.firstChild, current);
            }
            parent.removeChild(current);
            didChange = true;
            current = parent; // continue up
            continue;
          }
          current = parent;
        }

        // 2. Identify the enclosing block
        const block = target.closest('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
        if (block && editor.contains(block)) {
          const tagName = block.tagName;
          let pNode = block;
          
          // Convert block element to P
          if (/^(H[1-6]|BLOCKQUOTE|PRE)$/i.test(tagName)) {
            pNode = document.createElement('p');
            while (block.firstChild) {
              pNode.appendChild(block.firstChild);
            }
            block.parentNode?.replaceChild(pNode, block);
            didChange = true;
          } else if (tagName === 'LI') {
            pNode = document.createElement('p');
            while (block.firstChild) {
              pNode.appendChild(block.firstChild);
            }
            const list = block.closest('ul, ol');
            if (list && list.parentElement) {
              list.parentElement.insertBefore(pNode, list);
              block.remove();
              if (list.children.length === 0) list.remove();
            }
            didChange = true;
          }

          // 3. Strip raw markdown characters (especially for empty lines or unrendered md)
          const walkAndStrip = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              let text = node.textContent || '';
              const orig = text;
              
              // Only strip block markers if it's the very beginning of the block
              if (node === pNode.firstChild || (node.previousSibling && node.previousSibling.nodeType === Node.ELEMENT_NODE && (node.previousSibling as Element).tagName === 'BR')) {
                text = text.replace(/^[#>\-*+]+\s*/, ''); // strip leading block formatting
                text = text.replace(/^\d+\.\s*/, '');      // strip numbered lists
                // If it's literally just a symbol left behind
                if (/^[#>\-*+]+$/.test(text.trim())) {
                  text = '';
                }
              }
              
              // Strip inline markdown characters
              text = text.replace(/\*\*(.*?)\*\*/g, '$1');
              text = text.replace(/__(.*?)__/g, '$1');
              text = text.replace(/\*(.*?)\*/g, '$1');
              text = text.replace(/_(.*?)_/g, '$1');
              text = text.replace(/~~(.*?)~~/g, '$1');
              text = text.replace(/`(.*?)`/g, '$1');
              
              if (text !== orig) {
                node.textContent = text;
                didChange = true;
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              Array.from(node.childNodes).forEach(walkAndStrip);
            }
          };
          
          Array.from(pNode.childNodes).forEach(walkAndStrip);
          
          // Ensure it's not totally empty so DOM doesn't collapse
          if (pNode.innerHTML === '') {
            pNode.innerHTML = '&#8203;';
            didChange = true;
          }
        }

        if (didChange) {
          flushPreviewEdit();
        }
        return;
      }
      
      // Normal click behavior: check if we clicked a link
      const linkElement = target.closest('a');
      
      // If we clicked a link and not dragging/selecting text
      if (linkElement && window.getSelection()?.isCollapsed) {
        // Allow the default link behavior
        return;
      }
    }
  }, [isEraserMode, flushPreviewEdit]);

  // Sync content when it changes externally (e.g. Undo/Redo)
  useEffect(() => {
    if (previewRef.current && content !== lastProcessedContent.current) {
      let currentOffset = -1;
      
      // Save caret position before rewriting innerHTML
      if (document.activeElement === previewRef.current) {
        try {
          currentOffset = getCaretCharacterOffsetWithin(previewRef.current);
        } catch (e) {
          console.debug("Failed to get caret offset:", e);
        }
      }

      const html = parseMarkdown(content || '');
      previewRef.current.innerHTML = html;
      lastProcessedContent.current = content;
      
      // Attempt to move caret back to exact position rather than jarringly jumping to the end
      if (currentOffset !== -1) {
        try {
          setCaretPosition(previewRef.current, currentOffset);
        } catch (e) {
          console.error("Cursor restore error after external update:", e);
        }
      }
    }
  }, [content]);

  // Reset lastProcessedContent when noteId changes
  useEffect(() => {
    lastProcessedContent.current = content;
    if (previewRef.current) {
      const html = parseMarkdown(content || '');
      previewRef.current.innerHTML = html;

      // Auto-scroll to mark when opening file
      setTimeout(() => {
        if (!previewRef.current) return;
        const marks = Array.from(previewRef.current.querySelectorAll('.bookmark-marker'));
        if (marks.length > 0) {
          // Reset to first mark when newly loading a different note
          previewRef.current.setAttribute('data-current-mark', '0');
          const targetMark = marks[0] as HTMLElement;
          targetMark.scrollIntoView({ behavior: 'auto', block: 'center' });
          
          try {
             const range = document.createRange();
             range.setStartAfter(targetMark);
             range.collapse(true);
             const selection = window.getSelection();
             selection?.removeAllRanges();
             selection?.addRange(range);
          } catch (err) {
             console.debug('Handled selection edge case during bookmark load:', err);
          }
        }
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;

    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const offset = sel.anchorOffset;
        
        let targetToDelete: Node | null = null;
        let textNodeToDelete: Node | null = null;
        
        if (node?.nodeType === Node.TEXT_NODE) {
          if (offset === 0) {
            targetToDelete = node.previousSibling;
          } else if (offset === 1 && node.textContent?.charAt(0) === '\u200B') {
            targetToDelete = node.previousSibling;
            textNodeToDelete = node;
          }
        } else if (node?.nodeType === Node.ELEMENT_NODE) {
          targetToDelete = node.childNodes[offset - 1];
        }

        if (targetToDelete && targetToDelete.nodeType === Node.ELEMENT_NODE) {
          const elTarget = targetToDelete as HTMLElement;
          if (
            elTarget.classList.contains('bookmark-marker') || 
            elTarget.classList.contains('image-wrapper') || 
            elTarget.classList.contains('code-block-wrapper') ||
            elTarget.classList.contains('table-wrapper')
          ) {
            e.preventDefault();
            
            // Reposition cursor before removing the element to prevent jumping to top
            const newRange = document.createRange();
            newRange.setStartBefore(elTarget);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            
            elTarget.remove();
            if (textNodeToDelete && textNodeToDelete.textContent === '\u200B') {
              (textNodeToDelete as ChildNode).remove();
            } else if (textNodeToDelete) {
              textNodeToDelete.textContent = textNodeToDelete.textContent?.substring(1) || '';
            }
            flushPreviewEdit();
          }
        }
      }
    }

    // Code block specific handling
    if (target.tagName === 'CODE') {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        document.execCommand('insertText', false, '\n');
        // Let the auto-update happen via the oninput handler on the code tag itself
      }
    }
  }, [flushPreviewEdit]);

  const prevAutoMarkdown = useRef(isAutoMarkdownEnabled);
  
  useEffect(() => {
    if (isAutoMarkdownEnabled && !prevAutoMarkdown.current) {
      if (previewRef.current) {
        const sel = window.getSelection();
        let markerInserted = false;
        if (sel && sel.rangeCount > 0 && previewRef.current.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            const markerNode = document.createTextNode(CARET_MARKER);
            range.insertNode(markerNode);
            markerInserted = true;
        }

        const htmlWithMarker = previewRef.current.innerHTML;
        let mdWithMarker = turndownService.turndown(htmlWithMarker);
        
        mdWithMarker = mdWithMarker.replace(new RegExp(`([^\\n]+)\\n([ \\t]*\\|?[-: \\t]*)(${CARET_MARKER})([-: \\t]*\\|?[ \\t]*(\\n|$))`, 'g'), `$1${CARET_MARKER}\n$2$4`);
        mdWithMarker = mdWithMarker.replace(new RegExp(`(\\n[ \\t]*\\|[-: \\t]*)(${CARET_MARKER})([-: \\t]+\\|[ \\t]*\\n)`, 'g'), '$1$3$2');
             
        const html = parseMarkdown(mdWithMarker);
        previewRef.current.innerHTML = html;
        
        if (markerInserted) {
            const markerResult = findAndRemoveMarker(previewRef.current);
            if (markerResult && sel) {
                const { foundNode, offset } = markerResult;
                const newRange = document.createRange();
                newRange.setStart(foundNode, offset);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
            }
        }
        flushPreviewEdit();
      }
    }
    prevAutoMarkdown.current = isAutoMarkdownEnabled;
  }, [isAutoMarkdownEnabled, content, flushPreviewEdit, turndownService]);

  const handleSelectionChange = useCallback(() => {
    // Disabled text selection hover based on user request
    if (!previewRef.current || isViewMode) return;
    
    setSelectedColIndex(null);
    setSelectedRowIndex(null);
    
    // Process active table row for floating delete icon
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) {
      setActiveTableRow(null);
      return;
    }
    const node = sel.anchorNode;
    if (!previewRef.current.contains(node)) {
      setActiveTableRow(null);
      return;
    }
    const tr = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element)?.closest('tr');
    if (tr && previewRef.current.contains(tr)) {
      setActiveTableRow(tr as HTMLTableRowElement);
      const rect = tr.getBoundingClientRect();
      const parentRect = previewRef.current.parentElement!.getBoundingClientRect();
      setActiveTableRowRect({
        top: rect.top - parentRect.top,
        left: rect.left - parentRect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setActiveTableRow(null);
    }
  }, [isViewMode]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  useEffect(() => {
    if (!activeTableRow || !previewRef.current) return;
    const observer = new ResizeObserver(() => {
      const parentRect = previewRef.current!.parentElement?.getBoundingClientRect();
      const rect = activeTableRow.getBoundingClientRect();
      if (parentRect) {
        setActiveTableRowRect({
          top: rect.top - parentRect.top,
          left: rect.left - parentRect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    });

    observer.observe(activeTableRow);
    return () => observer.disconnect();
  }, [activeTableRow]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const handleBeforeInput = (e: InputEvent) => {
      if (e.inputType === 'deleteContentBackward') {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && sel.rangeCount > 0) {
          const node = sel.anchorNode;
          const offset = sel.anchorOffset;
          
          let targetToDelete: Node | null = null;
          let textNodeToDelete: Node | null = null;
          
          if (node?.nodeType === Node.TEXT_NODE) {
            if (offset === 0) {
              targetToDelete = node.previousSibling;
            } else if (offset === 1 && node.textContent?.charAt(0) === '\u200B') {
              targetToDelete = node.previousSibling;
              textNodeToDelete = node;
            }
          } else if (node?.nodeType === Node.ELEMENT_NODE) {
            targetToDelete = node.childNodes[offset - 1];
          }

          if (targetToDelete && targetToDelete.nodeType === Node.ELEMENT_NODE) {
            const elTarget = targetToDelete as HTMLElement;
            if (
              elTarget.classList.contains('bookmark-marker') || 
              elTarget.tagName.toLowerCase() === 'img' || 
              elTarget.classList.contains('code-block-wrapper') ||
              elTarget.tagName.toLowerCase() === 'table'
            ) {
              e.preventDefault();
              elTarget.remove();
              if (textNodeToDelete && textNodeToDelete.textContent === '\u200B') {
                (textNodeToDelete as ChildNode).remove();
              } else if (textNodeToDelete) {
                textNodeToDelete.textContent = textNodeToDelete.textContent?.substring(1) || '';
              }
              flushPreviewEdit();
            }
          }
        }
      }
    };

    el.addEventListener('beforeinput', handleBeforeInput as EventListener);
    return () => el.removeEventListener('beforeinput', handleBeforeInput as EventListener);
  }, [flushPreviewEdit]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const file = e.clipboardData.files[i];
        if (file.type.indexOf('image/') === 0) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            document.execCommand('insertHTML', false, `<img src="${base64String}" alt="Pasted Image" style="max-width: 100%;" /><p>&#8203;</p>`);
            flushPreviewEdit();
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    }

    const text = e.clipboardData.getData('text/plain');
    if (text) {
      // Check if it's an image URL
      if (text.match(/\.(jpeg|jpg|gif|png|webp|avif|svg)$/i) || text.startsWith('data:image/')) {
         e.preventDefault();
         document.execCommand('insertHTML', false, `<img src="${text}" alt="Pasted Image" style="max-width: 100%;" /><p>&#8203;</p>`);
         flushPreviewEdit();
         return;
      }

      e.preventDefault();
      
      const node = window.getSelection()?.anchorNode;
      const isInsideCodeBlock = (node instanceof Element ? node : node?.parentElement)?.closest('.code-block-wrapper');

      if (isInsideCodeBlock) {
          document.execCommand('insertText', false, text.replace(/\r\n/g, '\n'));
      } else if (isAutoMarkdownEnabled) {
          // Parse pasted text for triple backtick code blocks
          const parts = [];
          const remaining = text.replace(/\r\n/g, '\n');
          const regex = /`{3,}([a-zA-Z0-9_+-]*)[ \t]*\n([\s\S]*?)`{3,}/g;
          
          let lastIndex = 0;
          let match;
          
          while ((match = regex.exec(remaining)) !== null) {
              if (match.index > lastIndex) {
                  parts.push({ type: 'text', content: remaining.slice(lastIndex, match.index) });
              }
              parts.push({ type: 'code', language: match[1] || 'text', content: match[2] });
              lastIndex = regex.lastIndex;
          }
          if (lastIndex < remaining.length) {
              parts.push({ type: 'text', content: remaining.slice(lastIndex) });
          }

          let finalHtml = '';
          for (const part of parts) {
              if (part.type === 'code') {
                  const codeContent = part.content
                     .replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
                  const codeHtml = `<pre style="margin:0;padding:1rem 1.25rem;font-size:13px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;"><code class="code-element outline-none block min-h-[20px] whitespace-pre [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${codeContent}</code></pre>`;
                  finalHtml += `<div class="code-block-wrapper border border-[#e5e7eb] dark:border-[#374151] rounded-md my-4 overflow-hidden not-prose shadow-sm max-w-full relative" contenteditable="false"><div class="bg-[#f8f9fa] dark:bg-[#1f2937] border-b border-[#e5e7eb] dark:border-[#374151] px-4 py-2 flex justify-between items-center text-[13px]"><div class="font-semibold text-[#6366f1] dark:text-[#818cf8] language-label flex items-center">${part.language}</div><div class="flex items-center gap-4"><button class="flex items-center gap-1 text-[#6366f1] dark:text-[#818cf8] hover:opacity-80 transition-opacity bg-transparent border-none cursor-pointer"><span class="text-xs">»</span> Open</button><button class="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity bg-transparent border-none cursor-pointer copy-btn"><span class="copy-text">Copy</span></button><button class="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-opacity bg-transparent border-none cursor-pointer delete-btn" title="Delete code block"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div></div><div class="bg-[#f4f7f9] dark:bg-[#0d1117] overflow-x-auto overflow-y-auto max-h-[500px] w-full max-w-full code-container whitespace-pre font-mono m-0 text-slate-800 dark:text-slate-200">${codeHtml}</div></div>`;
              } else {
                  const paragraphs = part.content.split(/\r?\n\r?\n/);
                  if (paragraphs.length === 1) {
                      const textContent = paragraphs[0]
                         .replace(/&/g, '&amp;')
                         .replace(/</g, '&lt;')
                         .replace(/>/g, '&gt;')
                         .replace(/\r?\n/g, '<br>')
                         .replace(/ {2}/g, '&nbsp; ');
                      finalHtml += `<span>${textContent}</span>`;
                  } else {
                      const htmlText = paragraphs.map(p => {
                          const inner = p
                              .replace(/&/g, '&amp;')
                              .replace(/</g, '&lt;')
                              .replace(/>/g, '&gt;')
                              .replace(/\r?\n/g, '<br>')
                              .replace(/ {2}/g, '&nbsp; ');
                          return `<p>${inner}</p>`;
                      }).join('');
                      finalHtml += htmlText;
                  }
              }
          }
          
          document.execCommand('insertHTML', false, finalHtml);
      } else {
          // If auto markdown is off, just paste as plain text (but keep spaces using nbsp to prevent collapse)
          const paragraphs = text.split(/\r?\n\r?\n/);
          let htmlText = '';
          if (paragraphs.length === 1) {
              const inner = paragraphs[0]
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\r?\n/g, '<br>')
                  .replace(/ {2}/g, '&nbsp; ');
              htmlText = `<span>${inner}</span>`;
          } else {
              htmlText = paragraphs.map(p => {
                  const inner = p
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/\r?\n/g, '<br>')
                      .replace(/ {2}/g, '&nbsp; ');
                  return `<p>${inner}</p>`;
              }).join('');
          }
          document.execCommand('insertHTML', false, htmlText);
      }
      
      if (isAutoMarkdownEnabled) {
        flushPreviewEdit();
      }
    }
  }, [isAutoMarkdownEnabled, flushPreviewEdit]);

  return (
    <div className="relative w-full max-w-full group/editor">
      <div 
        ref={previewRef}
        contentEditable={!isViewMode}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onCompositionStart={() => isComposing.current = true}
        onCompositionEnd={() => {
          isComposing.current = false;
          handleInput();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onKeyDown={handleKeyDown}
        onKeyUp={handleCursorMove}
        onClick={handleCursorMove}
        onPaste={handlePaste}
        className={cn(
          "prose prose-slate dark:prose-invert w-full min-w-0 max-w-full overflow-x-hidden break-words pb-[40vh] text-lg prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800/80 prose-code:border prose-code:border-slate-200 dark:prose-code:border-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.85em] prose-code:font-medium prose-code:shadow-[0_1px_2px_rgba(0,0,0,0.05)] prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl prose-table:border-collapse prose-table:w-full prose-table:m-0 prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted/50 prose-th:font-semibold prose-td:border prose-td:border-border prose-td:p-3 outline-none focus:ring-0 min-h-[500px]",
          isEraserMode && "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23f43f5e\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\"/><path d=\"M22 21H7\"/><path d=\"m5 11 9 9\"/></svg>'),_crosshair]"
        )}
        role="textbox"
        aria-multiline="true"
        aria-label="Editor content"
      />
      {!isViewMode && hoveredTable && tableRect && (
         <>
           {colRects.map((cr, i) => (
             <div 
               key={`col-${i}`}
               contentEditable={false}
               className={cn("absolute -top-3 h-3 hover:bg-slate-500/20 cursor-s-resize z-20 group transition-colors", selectedColIndex === i && "bg-slate-500/20")}
               style={{ left: cr.left, width: cr.width, top: tableRect.top - 12 }}
               onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColIndex(i); setSelectedRowIndex(null); }}
             >
               <div className="hidden group-hover:block mx-auto w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-transparent border-t-slate-600 dark:border-t-slate-400 mt-0.5" />
             </div>
           ))}
           {selectedColIndex !== null && colRects[selectedColIndex] && (
             <div 
                className="absolute bg-blue-500/10 pointer-events-none z-10 border-x border-blue-500/30"
                style={{ top: tableRect.top, left: colRects[selectedColIndex].left, width: colRects[selectedColIndex].width, height: tableRect.height }}
             />
           )}
           {rowRects.map((rr, i) => (
             <div 
               key={`row-${i}`}
               contentEditable={false}
               className={cn("absolute -left-3 w-3 hover:bg-slate-500/20 cursor-e-resize z-20 group transition-colors flex items-center", selectedRowIndex === i && "bg-slate-500/20")}
               style={{ top: rr.top, height: rr.height, left: tableRect.left - 12 }}
               onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedRowIndex(i); setSelectedColIndex(null); }}
             >
               <div className="hidden group-hover:block ml-0.5 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[5px] border-transparent border-l-slate-600 dark:border-l-slate-400" />
             </div>
           ))}
           {selectedRowIndex !== null && rowRects[selectedRowIndex] && (
             <div 
                className="absolute bg-blue-500/10 pointer-events-none z-10 border-y border-blue-500/30"
                style={{ left: tableRect.left, top: rowRects[selectedRowIndex].top, height: rowRects[selectedRowIndex].height, width: tableRect.width }}
             />
           )}
         </>
      )}
      {!isViewMode && activeTableRow && activeTableRowRect && !selectedColIndex && !selectedRowIndex && (
        <>
          <div 
            className="table-floating-toolbar absolute z-[1] flex items-center justify-center gap-0.5 bg-background border border-border rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] pointer-events-auto px-0.5 py-0.5"
            style={{ 
              top: activeTableRowRect.top, 
              left: activeTableRowRect.left,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <button 
              onClick={(e) => { e.preventDefault(); setIsTableEditDialogOpen(true); }}
              className="p-1 px-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
              title="Table Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <div 
            className="table-floating-toolbar absolute z-[1] flex items-center justify-center bg-background border border-border rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] pointer-events-auto px-0.5 py-0.5"
            style={{ 
              top: activeTableRowRect.top, 
              left: activeTableRowRect.left + activeTableRowRect.width,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <button 
              onClick={(e) => { 
                  e.preventDefault(); 
                  const table = activeTableRow.closest('table');
                  activeTableRow.remove();
                  if (table && table.querySelectorAll('tr').length === 0) {
                     const wrapper = table.closest('.table-wrapper');
                     if (wrapper) wrapper.remove();
                     else table.remove();
                     setHoveredTable(null);
                  }
                  flushPreviewEdit();
                  setActiveTableRow(null);
              }}
              className="p-1 px-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              title="Delete Row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {selectedColIndex !== null && colRects[selectedColIndex] && hoveredTable && tableRect && (
          <div 
            className="table-floating-toolbar absolute z-30 flex items-center justify-center gap-0.5 bg-background border border-border rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] pointer-events-auto px-0.5 py-0.5"
            style={{ 
              top: tableRect.top - 16, 
              left: colRects[selectedColIndex].left + colRects[selectedColIndex].width / 2,
              transform: 'translate(-50%, -100%)'
            }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                if (!hoveredTable) return;
                const trs = hoveredTable.querySelectorAll('tr');
                trs.forEach(tr => {
                  if (tr.children[selectedColIndex]) tr.children[selectedColIndex].remove();
                });
                if (hoveredTable.querySelectorAll('tr')[0]?.children.length === 0) {
                     const wrapper = hoveredTable.closest('.table-wrapper');
                     if (wrapper) wrapper.remove();
                     else hoveredTable.remove();
                     setHoveredTable(null);
                }
                flushPreviewEdit();
                setSelectedColIndex(null);
              }}
              className="p-1 px-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              title="Delete Column"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            {['left', 'center', 'right'].map(align => (
              <button
                 key={align}
                 onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!hoveredTable) return;
                    const trs = hoveredTable.querySelectorAll('tr');
                    trs.forEach(tr => {
                      if (tr.children[selectedColIndex]) tr.children[selectedColIndex].setAttribute('align', align);
                    });
                    flushPreviewEdit();
                 }}
                 className="p-1 px-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
                 title={`Align ${align}`}
              >
                 {align === 'left' && <AlignLeft className="w-4 h-4" />}
                 {align === 'center' && <AlignCenter className="w-4 h-4" />}
                 {align === 'right' && <AlignRight className="w-4 h-4" />}
              </button>
            ))}
          </div>
      )}
      {selectedRowIndex !== null && rowRects[selectedRowIndex] && hoveredTable && tableRect && (
          <div 
            className="table-floating-toolbar absolute z-30 flex items-center justify-center gap-0.5 bg-background border border-border rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.08)] pointer-events-auto px-0.5 py-0.5"
            style={{ 
              top: rowRects[selectedRowIndex].top + rowRects[selectedRowIndex].height / 2, 
              left: tableRect.left - 16,
              transform: 'translate(-100%, -50%)'
            }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button 
              onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation();
                  if (!hoveredTable) return;
                  const trs = hoveredTable.querySelectorAll('tr');
                  if (trs[selectedRowIndex]) trs[selectedRowIndex].remove();
                  if (hoveredTable.querySelectorAll('tr').length === 0) {
                     const wrapper = hoveredTable.closest('.table-wrapper');
                     if (wrapper) wrapper.remove();
                     else hoveredTable.remove();
                     setHoveredTable(null);
                  }
                  flushPreviewEdit();
                  setSelectedRowIndex(null);
              }}
              className="p-1 px-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
              title="Delete Row"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
      )}

      <TableEditDialog 
        isOpen={isTableEditDialogOpen}
        onClose={() => setIsTableEditDialogOpen(false)}
        table={hoveredTable}
        onConfirm={handleTableEditConfirm}
      />
      {!isViewMode && hoveredImage && imageRect && (
        <>
          <div 
            className="absolute z-40 border-2 border-indigo-500 pointer-events-none"
            style={{
              top: imageRect.top,
              left: imageRect.left,
              width: imageRect.width,
              height: imageRect.height,
            }}
          />
          <div
            className="absolute z-50 w-3 h-3 bg-white border-2 border-indigo-500 cursor-nwse-resize rounded-sm"
            style={{ top: imageRect.top - 6, left: imageRect.left - 6 }}
            onMouseDown={(e) => handleImageResizeStart(e, 'nw')}
          />
          <div
            className="absolute z-50 w-3 h-3 bg-white border-2 border-indigo-500 cursor-nesw-resize rounded-sm"
            style={{ top: imageRect.top - 6, left: imageRect.left + imageRect.width - 6 }}
            onMouseDown={(e) => handleImageResizeStart(e, 'ne')}
          />
          <div
            className="absolute z-50 w-3 h-3 bg-white border-2 border-indigo-500 cursor-nesw-resize rounded-sm"
            style={{ top: imageRect.top + imageRect.height - 6, left: imageRect.left - 6 }}
            onMouseDown={(e) => handleImageResizeStart(e, 'sw')}
          />
          <div
            className="absolute z-50 w-3 h-3 bg-white border-2 border-indigo-500 cursor-nwse-resize rounded-sm"
            style={{ top: imageRect.top + imageRect.height - 6, left: imageRect.left + imageRect.width - 6 }}
            onMouseDown={(e) => handleImageResizeStart(e, 'se')}
          />
          <div 
            className="image-floating-toolbar absolute z-50 flex items-center justify-center"
            style={{ 
              top: imageRect.top - 36, 
              left: imageRect.left,
            }}
          >
            <button 
              onClick={() => setIsImageEditDialogOpen(true)}
              className="p-1.5 bg-background border border-border text-muted-foreground hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md shadow-sm transition-colors"
              title="Edit Image"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <div 
            className="image-floating-toolbar absolute z-50 flex items-center justify-center gap-1"
            style={{ 
              top: imageRect.top - 36, 
              left: imageRect.left + 36,
            }}
          >
            <button 
              onClick={deleteImage}
              className="p-1.5 bg-background border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md shadow-sm transition-colors"
              title="Delete Image"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
      
      {!isViewMode && hoveredLink && linkRect && (
        <div 
          className="link-floating-toolbar absolute z-50 flex items-center justify-center gap-1"
          style={{ 
            top: linkRect.top - 36, 
            left: linkRect.left,
          }}
        >
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(hoveredLink.href, '_blank'); }}
            className="px-2 py-1.5 bg-background border border-border text-xs font-medium text-muted-foreground hover:text-cyan-500 hover:border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-md shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
            title="Open Link in new tab"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="max-w-[200px] truncate">{hoveredLink.href}</span>
          </button>
        </div>
      )}
      
      <ImageEditDialog
        isOpen={isImageEditDialogOpen}
        onClose={() => setIsImageEditDialogOpen(false)}
        image={hoveredImage}
        onConfirm={handleImageEditConfirm}
      />
    </div>
  );
};
