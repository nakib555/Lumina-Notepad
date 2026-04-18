import React, { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
import { Sparkles, Trash2, Settings2, ExternalLink, Bold, Italic, Strikethrough, Heading1, Link as LinkIcon, Code } from "lucide-react";
import { TableEditDialog } from './table-edit-dialog';
import { ImageEditDialog } from './image-edit-dialog';
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import { cn } from "@/lib/utils";

marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

const renderer = new marked.Renderer();
const originalTable = renderer.table;
renderer.table = function(token) {
  const html = originalTable.call(this, token);
  // Add w-full and m-0 to the table itself
  const styledHtml = html.replace('<table>', '<table class="w-full m-0">');
  return `<div class="overflow-x-auto max-w-full w-full table-wrapper my-8">\n${styledHtml}</div>\n`;
};

renderer.tablecell = function (token) {
  const html = marked.Renderer.prototype.tablecell.call(this, token);
  // Convert align="xxx" to inline style so Tailwind's prose doesn't override it
  if (token.align) {
    return html.replace(/^<(t[hd])/, `<$1 style="text-align: ${token.align};"`);
  }
  return html;
};

renderer.image = function(token) {
  const src = token.href;
  const alt = token.text;
  const title = token.title ? ` title="${token.title}"` : '';
  
  return `<span class="image-wrapper block relative max-w-full my-4"><img src="${src}" alt="${alt}"${title} class="rounded-lg max-w-full h-auto cursor-pointer border border-transparent hover:border-indigo-500 transition-colors" /></span>`;
};

renderer.html = function(token) {
  const html = token.text;
  if (html.trim().startsWith('<img')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const img = doc.querySelector('img');
      if (img) {
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') ? ` title="${img.getAttribute('title')}"` : '';
        const style = img.getAttribute('style') ? ` style="${img.getAttribute('style')}"` : '';
        const width = img.getAttribute('width') ? ` width="${img.getAttribute('width')}"` : '';
        const height = img.getAttribute('height') ? ` height="${img.getAttribute('height')}"` : '';
        
        return `<span class="image-wrapper block relative max-w-full my-4"><img src="${src}" alt="${alt}"${title}${style}${width}${height} class="rounded-lg max-w-full h-auto cursor-pointer border border-transparent hover:border-indigo-500 transition-colors" /></span>`;
      }
    } catch { /* ignore */ }
  }
  return html;
};

renderer.code = function(token) {
  const code = token.text;
  const lang = (token.lang || '').match(/\S*/)?.[0] || '';
  
  let highlighted = code;
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } catch { /* ignore */ }
  } else {
    try {
      highlighted = hljs.highlightAuto(code).value;
    } catch { /* ignore */ }
  }
  
  const displayLang = lang ? lang.toUpperCase() : 'CODE';

  return `
<div class="code-block-wrapper border border-slate-200 dark:border-slate-800/80 rounded-xl my-6 overflow-hidden not-prose shadow-sm" contenteditable="false">
  <div class="bg-slate-100/50 dark:bg-slate-900/50 px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-sm">
    <div class="flex items-center gap-3">
      <div class="flex gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
        <div class="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
        <div class="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
      </div>
      <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase language-label">${displayLang}</span>
    </div>
    <div class="flex items-center gap-2">
      <button class="bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('code').textContent); this.textContent='COPIED!'; setTimeout(() => this.textContent='COPY', 2000);">COPY</button>
      <button class="bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-95" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  </div>
  <div class="flex bg-slate-50/50 dark:bg-[#0d1117] m-0 items-stretch">
    <pre class="line-numbers py-4 pl-4 pr-3 text-right text-slate-400 dark:text-slate-500/50 select-none font-mono text-[13px] leading-[1.6] min-w-[3rem] border-r border-slate-200/40 dark:border-slate-800/40 m-0 overflow-hidden bg-transparent">
      ${Array.from({ length: code.split('\\n').length || 1 }, (_, i) => i + 1).join('\\n')}
    </pre>
    <pre class="py-4 px-0 overflow-x-auto m-0 w-full bg-transparent"><code class="hljs language-${lang} bg-transparent px-4 py-0 text-[13px] leading-[1.6] font-mono text-slate-800 dark:text-slate-200 border-none outline-none block" contenteditable="true" oninput="this.parentElement.previousElementSibling.innerText = Array.from({ length: (this.innerText.match(/\\n/g) || []).length + 1 }, (_, i) => i + 1).join('\\n')">${highlighted}</code></pre>
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
  const [tableRect, setTableRect] = useState<{ top: number, left: number, width: number } | null>(null);
  const [isTableEditDialogOpen, setIsTableEditDialogOpen] = useState(false);

  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null);
  const [imageRect, setImageRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [isImageEditDialogOpen, setIsImageEditDialogOpen] = useState(false);
  const [isResizingImage, setIsResizingImage] = useState(false);
  
  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
  const [linkRect, setLinkRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  
  const resizeStartData = useRef<{ startX: number, startY: number, startWidth: number, startHeight: number, startLeft: number, startTop: number, direction: string } | null>(null);

  // Sync previewRef with textareaRef if provided
  useEffect(() => {
    if (textareaRef && previewRef.current) {
      (textareaRef as React.MutableRefObject<HTMLDivElement | null>).current = previewRef.current;
    }
  }, [textareaRef]);

  const updateTableRect = useCallback((table: HTMLTableElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    
    const tableRect = table.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setTableRect({
      top: tableRect.top - parentRect.top,
      left: tableRect.left - parentRect.left,
      width: tableRect.width
    });
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
        const codeContainer = (node as HTMLElement).querySelector('code');
        const code = codeContainer ? codeContainer.textContent : '';
        const lang = language === 'code' ? '' : language;
        return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
      }
    });

    service.addRule('caretMarker', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'SPAN' && (node as HTMLElement).id === 'caret-marker';
      },
      replacement: function () {
        return '<span id="caret-marker"></span>';
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

    service.addRule('preserveCaret', {
      filter: function (node) {
        return node.nodeName === 'SPAN' && (node as HTMLElement).id === 'caret-marker';
      },
      replacement: function (_content, node) {
        return (node as HTMLElement).outerHTML;
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

  const deleteTable = useCallback(() => {
    if (hoveredTable && hoveredTable.parentNode) {
      const wrapper = hoveredTable.closest('.table-wrapper');
      if (wrapper) {
        wrapper.remove();
      } else {
        hoveredTable.remove();
      }
      setHoveredTable(null);
      flushPreviewEdit();
    }
  }, [hoveredTable, flushPreviewEdit]);

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
    
    hoveredImage.src = newSrc;
    if (width) hoveredImage.style.width = width;
    if (height) hoveredImage.style.height = height;
    hoveredImage.alt = alt;
    hoveredImage.title = alt; // Use alt as caption title

    const wrapper = hoveredImage.parentElement;
    if (wrapper) {
      if (align === 'left') {
        wrapper.style.textAlign = 'left';
        wrapper.style.justifyContent = 'flex-start';
      } else if (align === 'right') {
        wrapper.style.textAlign = 'right';
        wrapper.style.justifyContent = 'flex-end';
      } else {
        wrapper.style.textAlign = 'center';
        wrapper.style.justifyContent = 'center';
      }
    }
    
    flushPreviewEdit();
  }, [hoveredImage, flushPreviewEdit]);

  const sparkleTable = useCallback(() => {
    if (hoveredTable) {
      hoveredTable.style.transition = 'all 0.5s ease';
      hoveredTable.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.5)';
      setTimeout(() => {
        hoveredTable.style.boxShadow = 'none';
      }, 1000);
    }
  }, [hoveredTable]);

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
             const marker = document.createElement('span');
             marker.id = "caret-marker";
             range.insertNode(marker);
             
             const parseState = {
                 scrollContainers: [] as Array<{ el: Element | Window, top: number, left: number }>
             };
             let curr: HTMLElement | null = previewRef.current.parentElement;
             while (curr && curr !== document.body) {
                 parseState.scrollContainers.push({ el: curr, top: curr.scrollTop, left: curr.scrollLeft });
                 curr = curr.parentElement;
             }
             parseState.scrollContainers.push({ el: window, top: window.scrollY, left: window.scrollX });
             
             const htmlWithMarker = previewRef.current.innerHTML;
             let mdWithMarker = turndownService.turndown(htmlWithMarker);
             
             // Fix caret inside table separator: move caret to the end of the previous line (header) to allow table parsing
             if (/^[ \t]*\|?[-: \t]*<span id="caret-marker"><\/span>[-: \t]*\|?[ \t]*$/m.test(mdWithMarker)) {
                 mdWithMarker = mdWithMarker.replace(/([^\n]+)\n([ \t]*\|?[-: \t]*)(<span id="caret-marker"><\/span>)([-: \t]*\|?[ \t]*(\n|$))/g, '$1<span id="caret-marker"></span>\n$2$4');
             }

             // Also fix if caret is placed exactly after pipes in header/separator line in a way that breaks regex
             mdWithMarker = mdWithMarker.replace(/(\n[ \t]*\|[-: \t]*)(<span id="caret-marker"><\/span>)([-: \t]+\|[ \t]*\n)/g, '$1$3$2');
             
             const newHtml = parseMarkdown(mdWithMarker);
             previewRef.current.innerHTML = newHtml;
             
             const newMarker = previewRef.current.querySelector('#caret-marker');
             if (newMarker) {
                 const newRange = document.createRange();
                 // Safer caret restoration: place it immediately after the marker.
                 newRange.setStartAfter(newMarker);
                 newRange.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(newRange);
                 newMarker.remove();
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
          let tagName = block.tagName;
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
                text = text.replace(/^[#>\-\*+]+\s*/, ''); // strip leading block formatting
                text = text.replace(/^\d+\.\s*/, '');      // strip numbered lists
                // If it's literally just a symbol left behind
                if (/^[#>\-\*+]+$/.test(text.trim())) {
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
      const html = parseMarkdown(content || '');
      previewRef.current.innerHTML = html;
      lastProcessedContent.current = content;
      
      // Attempt to move caret to end to avoid a jarring reset to start
      if (document.activeElement === previewRef.current) {
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(previewRef.current);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch (e) {
          console.error("Cursor restore error:", e);
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const handleKeyDown = useCallback(() => {
    // We removed the auto-formatting on Space/Enter based on user request.
    // The markdown rendering is now handled entirely by the Auto Markdown toggle button
    // and the paste handler.
  }, []);

  const prevAutoMarkdown = useRef(isAutoMarkdownEnabled);
  
  useEffect(() => {
    if (isAutoMarkdownEnabled && !prevAutoMarkdown.current) {
      if (previewRef.current) {
        const html = parseMarkdown(content || '');
        previewRef.current.innerHTML = html;
        flushPreviewEdit();
      }
    }
    prevAutoMarkdown.current = isAutoMarkdownEnabled;
  }, [isAutoMarkdownEnabled, content, flushPreviewEdit]);

  const [textSelectionRect, setTextSelectionRect] = useState<{top: number, left: number, width: number} | null>(null);

  const handleSelectionChange = useCallback(() => {
    if (isViewMode) {
      setTextSelectionRect(null);
      return;
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && previewRef.current?.contains(selection.anchorNode)) {
      if (document.activeElement !== previewRef.current) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const editorRect = previewRef.current.getBoundingClientRect();
      if (hoveredImage || hoveredTable || isTableEditDialogOpen || isImageEditDialogOpen) {
        setTextSelectionRect(null);
        return;
      }
      setTextSelectionRect({
        top: rect.top - editorRect.top + previewRef.current.scrollTop - 40,
        left: rect.left - editorRect.left + previewRef.current.scrollLeft + (rect.width / 2),
        width: rect.width
      });
    } else {
      setTextSelectionRect(null);
    }
  }, [isViewMode, hoveredImage, hoveredTable, isTableEditDialogOpen, isImageEditDialogOpen]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  const execFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    flushPreviewEdit();
  };

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

      if (isAutoMarkdownEnabled) {
        e.preventDefault();
        let html = parseMarkdown(text);
        
        if (!text.includes('\n') && html.startsWith('<p>') && html.endsWith('</p>\n')) {
          html = html.substring(3, html.length - 5);
        }
        
        document.execCommand('insertHTML', false, html);
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
          "prose prose-slate dark:prose-invert w-full min-w-0 max-w-full overflow-x-hidden break-words pb-[40vh] text-lg prose-p:leading-[1.8] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-strong:font-semibold prose-strong:text-foreground prose-li:marker:text-muted-foreground prose-hr:border-border prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:rounded-r-lg prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800/80 prose-code:border prose-code:border-slate-200 dark:prose-code:border-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.85em] prose-code:font-medium prose-code:shadow-[0_1px_2px_rgba(0,0,0,0.05)] prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl prose-table:border-collapse prose-table:w-full prose-table:m-0 prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted/50 prose-th:font-semibold prose-td:border prose-td:border-border prose-td:p-3 outline-none focus:ring-0 min-h-[500px]",
          isEraserMode && "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23f43f5e\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\"/><path d=\"M22 21H7\"/><path d=\"m5 11 9 9\"/></svg>'),_crosshair]"
        )}
        role="textbox"
        aria-multiline="true"
        aria-label="Editor content"
      />
      {!isViewMode && hoveredTable && tableRect && (
        <>
          <div 
            className="table-floating-toolbar absolute z-50 flex items-center justify-center"
            style={{ 
              top: tableRect.top - 12, 
              left: tableRect.left - 12,
            }}
          >
            <button 
              onClick={() => setIsTableEditDialogOpen(true)}
              className="p-1.5 bg-background border border-border text-muted-foreground hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md shadow-sm transition-colors"
              title="Edit Table Dimensions"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <div 
            className="table-floating-toolbar absolute z-50 flex items-center justify-center gap-1"
            style={{ 
              top: tableRect.top - 12, 
              left: tableRect.left + tableRect.width - 50,
            }}
          >
            <button 
              onClick={sparkleTable}
              className="p-1.5 bg-background border border-border text-muted-foreground hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md shadow-sm transition-colors"
              title="Magic Format"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button 
              onClick={deleteTable}
              className="p-1.5 bg-background border border-border text-muted-foreground hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md shadow-sm transition-colors"
              title="Delete Table"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
      {!isViewMode && textSelectionRect && !hoveredImage && !hoveredTable && (
        <div 
          className="text-floating-toolbar absolute z-50 flex items-center justify-center gap-0.5 p-1 bg-background border border-border rounded-lg shadow-md animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: textSelectionRect.top, 
            left: textSelectionRect.left,
            transform: 'translateX(-50%)'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <button onClick={() => execFormatting('bold')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
          <button onClick={() => execFormatting('italic')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
          <button onClick={() => execFormatting('strikeThrough')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <button onClick={() => execFormatting('formatBlock', 'H1')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Heading"><Heading1 className="w-4 h-4" /></button>
          <button onClick={() => {
            const url = window.prompt("Enter link URL:");
            if (url) execFormatting('createLink', url);
          }} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
          <button onClick={() => execFormatting('formatBlock', 'PRE')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors" title="Code Block"><Code className="w-4 h-4" /></button>
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
