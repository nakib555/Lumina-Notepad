import React, { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-light.css';
import { Sparkles, Trash2, Settings2 } from "lucide-react";
import { TableEditDialog } from './table-edit-dialog';
import { ImageEditDialog } from './image-edit-dialog';

const renderer = new marked.Renderer();
const originalTable = renderer.table;
renderer.table = function(token) {
  const html = originalTable.call(this, token);
  // Add w-full and m-0 to the table itself
  const styledHtml = html.replace('<table>', '<table class="w-full m-0">');
  return `<div class="overflow-x-auto w-full table-wrapper my-8">\n${styledHtml}</div>\n`;
};

renderer.image = function(token) {
  const src = token.href;
  const alt = token.text;
  const title = token.title ? ` title="${token.title}"` : '';
  
  return `<span class="image-wrapper inline-block relative max-w-full my-4"><img src="${src}" alt="${alt}"${title} class="rounded-lg max-w-full h-auto cursor-pointer border border-transparent hover:border-indigo-500 transition-colors" /></span>`;
};

renderer.code = function(token) {
  const code = token.text;
  const lang = (token.lang || '').match(/\S*/)?.[0] || '';
  
  let highlighted = code;
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang }).value;
    } catch (e) {}
  } else {
    try {
      highlighted = hljs.highlightAuto(code).value;
    } catch (e) {}
  }
  
  const displayLang = lang ? lang.toUpperCase() : 'CODE';

  return `
<div class="code-block-wrapper border border-slate-200 rounded-xl my-6 overflow-hidden not-prose shadow-sm" contenteditable="false">
  <div class="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-200">
    <span class="text-xs font-bold text-slate-500 tracking-wider uppercase language-label">${displayLang}</span>
    <button class="bg-white border border-slate-200 text-indigo-500 px-3 py-1 rounded-md text-xs font-medium shadow-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.querySelector('code').textContent); this.textContent='Copied!'; setTimeout(() => this.textContent='Source', 2000);">Source</button>
  </div>
  <div class="flex bg-[#f8fafc] m-0 items-stretch">
    <div class="line-numbers py-4 pl-4 pr-3 text-right text-slate-400 select-none font-mono text-[13px] leading-[1.6] min-w-[3rem] italic border-r border-slate-200/50">
      ${Array.from({ length: code.split('\n').length || 1 }, (_, i) => i + 1).join('<br/>')}
    </div>
    <pre class="py-4 px-0 overflow-x-auto m-0 w-full"><code class="hljs language-${lang} bg-transparent px-4 py-0 text-[13px] leading-[1.6] font-mono text-slate-800 border-none outline-none block" contenteditable="true" oninput="this.parentElement.previousElementSibling.innerHTML = Array.from({ length: (this.innerText.match(/\\n/g) || []).length + 1 }, (_, i) => i + 1).join('<br/>')">${highlighted}</code></pre>
  </div>
</div>
`;
};

const parseMarkdown = (text: string) => {
  return marked.parse(text, { renderer }) as string;
};

export interface EditorAreaRef {
  flushPreviewEdit: () => void;
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
}

export const EditorArea = ({
  content,
  handleContentChange,
  handleDrop,
  handleDragOver,
  editorAreaRef,
  noteId,
  textareaRef,
  isAutoMarkdownEnabled
}: EditorAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [tableRect, setTableRect] = useState<{ top: number, left: number, width: number } | null>(null);
  const [isTableEditDialogOpen, setIsTableEditDialogOpen] = useState(false);

  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null);
  const [imageRect, setImageRect] = useState<{ top: number, left: number, width: number } | null>(null);
  const [isImageEditDialogOpen, setIsImageEditDialogOpen] = useState(false);

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
      width: imgRect.width
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
      const isHoveringToolbar = target.closest('.table-floating-toolbar') || target.closest('.image-floating-toolbar') || target.closest('[role="dialog"]');
      
      if (table && previewRef.current.contains(table)) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredTable !== table) {
          setHoveredTable(table);
        }
        updateTableRect(table);
        setHoveredImage(null);
      } else if (img && previewRef.current.contains(img)) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredImage !== img) {
          setHoveredImage(img as HTMLImageElement);
        }
        updateImageRect(img as HTMLImageElement);
        setHoveredTable(null);
      } else if (isHoveringToolbar) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        if (!timeoutRef.current && (hoveredTable || hoveredImage)) {
          timeoutRef.current = setTimeout(() => {
            setHoveredTable(null);
            setHoveredImage(null);
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
  }, [hoveredTable, updateTableRect, isTableEditDialogOpen, hoveredImage, updateImageRect, isImageEditDialogOpen]);

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
    
    service.use(gfm as import('turndown').Plugin);

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
        const width = (node as HTMLElement).getAttribute('width') || (node as HTMLElement).style.width;
        const height = (node as HTMLElement).getAttribute('height') || (node as HTMLElement).style.height;
        
        if (width || height) {
          let style = '';
          if (width) style += `width: ${width}; `;
          if (height) style += `height: ${height};`;
          const titleAttr = title ? ` title="${title}"` : '';
          return `<img src="${src}" alt="${alt}"${titleAttr} style="${style.trim()}" />`;
        }
        
        const titlePart = title ? ' "' + title + '"' : '';
        return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
      }
    });

    return service;
  }, []);

  const lastProcessedContent = useRef(content);

  const flushPreviewEdit = useCallback(() => {
    if (previewRef.current) {
      const htmlContent = previewRef.current.innerHTML;
      let markdown = turndownService.turndown(htmlContent);
      markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
      lastProcessedContent.current = markdown;
      handleContentChange(markdown);
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

  const deleteImage = useCallback(() => {
    if (hoveredImage && hoveredImage.parentNode) {
      hoveredImage.remove();
      setHoveredImage(null);
      flushPreviewEdit();
    }
  }, [hoveredImage, flushPreviewEdit]);

  const handleImageEditConfirm = useCallback((newSrc: string, width: string, height: string) => {
    if (!hoveredImage) return;
    
    hoveredImage.src = newSrc;
    if (width) hoveredImage.style.width = width;
    if (height) hoveredImage.style.height = height;
    
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

  const handleTableEditConfirm = useCallback((targetRows: number, targetCols: number, curveClass: string) => {
    if (!hoveredTable) return;

    const tbody = hoveredTable.querySelector('tbody');
    const thead = hoveredTable.querySelector('thead');
    if (!tbody || !thead) return;

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

    // Adjust rows (targetRows includes the header row, so body rows = targetRows - 1)
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
      flushPreviewEdit();
    }, 500);
  }, [flushPreviewEdit]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    };
  }, []);

  const handleCursorMove = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    // Only center if the cursor is actually inside the editor
    if (previewRef.current && !previewRef.current.contains(selection.anchorNode)) return;
    
    const range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) {
      const span = document.createElement('span');
      span.textContent = '\u200b';
      range.insertNode(span);
      rect = span.getBoundingClientRect();
      if (span.parentNode) {
        span.parentNode.removeChild(span);
      }
    }
    
    if (rect.top === 0 && rect.bottom === 0) return;
    
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const cursorY = rect.top - containerRect.top;
      const targetY = containerRect.height / 2;
      
      scrollContainer.scrollBy({
        top: cursorY - targetY,
        behavior: 'smooth'
      });
    }
  }, []);

  // Sync content when it changes externally (e.g. Undo/Redo)
  useEffect(() => {
    if (previewRef.current && content !== lastProcessedContent.current) {
      const html = parseMarkdown(content || '');
      previewRef.current.innerHTML = html;
      lastProcessedContent.current = content;
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && isAutoMarkdownEnabled) {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed) return;

      const node = selection.anchorNode;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;

      const text = node.textContent || '';
      const offset = selection.anchorOffset;
      const textBeforeCursor = text.slice(0, offset);

      // Block formatting
      const isAtStart = !node.previousSibling || (node.previousSibling.nodeType === Node.TEXT_NODE && node.previousSibling.textContent === '');
      
      if (isAtStart) {
        const codeBlockMatch = textBeforeCursor.match(/^```([a-zA-Z]*)$/);
        if (codeBlockMatch) {
          e.preventDefault();
          
          const lang = codeBlockMatch[1] || '';
          const displayLang = lang ? lang.toUpperCase() : 'CODE';
          
          const wrapper = document.createElement('div');
          wrapper.className = "code-block-wrapper border border-slate-200 rounded-xl my-6 overflow-hidden not-prose shadow-sm";
          wrapper.contentEditable = "false";
          
          wrapper.innerHTML = `
            <div class="bg-slate-50 px-4 py-2.5 flex justify-between items-center border-b border-slate-200">
              <span class="text-xs font-bold text-slate-500 tracking-wider uppercase language-label">${displayLang}</span>
              <button class="bg-white border border-slate-200 text-indigo-500 px-3 py-1 rounded-md text-xs font-medium shadow-sm hover:bg-slate-50 transition-colors copy-btn" onclick="navigator.clipboard.writeText(this.parentElement.nextElementSibling.querySelector('code').textContent); this.textContent='Copied!'; setTimeout(() => this.textContent='Source', 2000);">Source</button>
            </div>
            <div class="flex bg-[#f8fafc] m-0 items-stretch">
              <div class="line-numbers py-4 pl-4 pr-3 text-right text-slate-400 select-none font-mono text-sm min-w-[3rem] italic">
                1
              </div>
              <pre class="py-4 pr-4 pl-1 overflow-x-auto m-0 w-full"><code class="hljs language-${lang} bg-transparent p-0 text-sm font-mono text-slate-800 border-none outline-none block" contenteditable="true" oninput="this.parentElement.previousElementSibling.innerHTML = Array.from({ length: (this.innerText.match(/\\n/g) || []).length + 1 }, (_, i) => i + 1).join('<br/>')">\u200B</code></pre>
            </div>
          `;

          const range = selection.getRangeAt(0);
          range.setStart(node, offset - codeBlockMatch[0].length);
          range.setEnd(node, offset);
          range.deleteContents();

          range.insertNode(wrapper);
          
          const codeNode = wrapper.querySelector('code');
          if (codeNode) {
            range.setStart(codeNode, 1);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
          
          flushPreviewEdit();
          return;
        }

        // Only trigger other block formats on Space
        if (e.key === ' ') {
          let formatBlock = '';
          if (textBeforeCursor === '#') formatBlock = 'H1';
          else if (textBeforeCursor === '##') formatBlock = 'H2';
          else if (textBeforeCursor === '###') formatBlock = 'H3';
          else if (textBeforeCursor === '####') formatBlock = 'H4';
          else if (textBeforeCursor === '#####') formatBlock = 'H5';
          else if (textBeforeCursor === '######') formatBlock = 'H6';
          else if (textBeforeCursor === '>') formatBlock = 'BLOCKQUOTE';

          if (formatBlock) {
            e.preventDefault();
            node.textContent = text.slice(offset);
            document.execCommand('formatBlock', false, formatBlock);
            flushPreviewEdit();
            return;
          }

          if (textBeforeCursor === '-' || textBeforeCursor === '*') {
            e.preventDefault();
            node.textContent = text.slice(offset);
            document.execCommand('insertUnorderedList');
            flushPreviewEdit();
            return;
          }

          if (textBeforeCursor === '1.') {
            e.preventDefault();
            node.textContent = text.slice(offset);
            document.execCommand('insertOrderedList');
            flushPreviewEdit();
            return;
          }
          
          if (textBeforeCursor === '---') {
            e.preventDefault();
            node.textContent = text.slice(offset);
            document.execCommand('insertHorizontalRule');
            flushPreviewEdit();
            return;
          }
        }
      }

      // Inline formatting (only on Space)
      if (e.key === ' ') {
        const applyInlineFormat = (matchedText: string, innerText: string, tagName: string) => {
          e.preventDefault();
          const range = selection.getRangeAt(0);
          range.setStart(node, offset - matchedText.length);
          range.setEnd(node, offset);
          range.deleteContents();

          const formatNode = document.createElement(tagName);
          formatNode.textContent = innerText;
          range.insertNode(formatNode);

          range.setStartAfter(formatNode);
          range.setEndAfter(formatNode);
          const spaceNode = document.createTextNode('\u00A0');
          range.insertNode(spaceNode);
          range.setStartAfter(spaceNode);
          range.setEndAfter(spaceNode);
          selection.removeAllRanges();
          selection.addRange(range);
          flushPreviewEdit();
        };

        const boldMatch = textBeforeCursor.match(/\*\*(.+?)\*\*$/);
        if (boldMatch) {
          applyInlineFormat(boldMatch[0], boldMatch[1], 'strong');
          return;
        }

        const italicMatch = textBeforeCursor.match(/(?<!\*)\*(.+?)\*$/) || textBeforeCursor.match(/_(.+?)_$/);
        if (italicMatch) {
          applyInlineFormat(italicMatch[0], italicMatch[1], 'em');
          return;
        }

        const codeMatch = textBeforeCursor.match(/`(.+?)`$/);
        if (codeMatch) {
          applyInlineFormat(codeMatch[0], codeMatch[1], 'code');
          return;
        }

        const strikeMatch = textBeforeCursor.match(/~~(.+?)~~$/);
        if (strikeMatch) {
          applyInlineFormat(strikeMatch[0], strikeMatch[1], 'del');
          return;
        }
      }
    }
  }, [isAutoMarkdownEnabled, flushPreviewEdit]);

  return (
    <div className="relative w-full group/editor">
      <div 
        ref={previewRef}
        contentEditable={true}
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
        className="prose prose-slate dark:prose-invert w-full min-w-0 max-w-full overflow-x-hidden break-words pb-[40vh] text-lg prose-p:leading-[1.8] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-strong:font-semibold prose-strong:text-foreground prose-li:marker:text-muted-foreground prose-hr:border-border prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:rounded-r-lg prose-code:text-foreground prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.9em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl prose-table:border-collapse prose-table:w-full prose-table:m-0 prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted/50 prose-th:text-left prose-th:font-semibold prose-td:border prose-td:border-border prose-td:p-3 outline-none focus:ring-0 min-h-[500px]"
        role="textbox"
        aria-multiline="true"
        aria-label="Editor content"
      />
      {hoveredTable && tableRect && (
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
      <TableEditDialog 
        isOpen={isTableEditDialogOpen}
        onClose={() => setIsTableEditDialogOpen(false)}
        table={hoveredTable}
        onConfirm={handleTableEditConfirm}
      />
      {hoveredImage && imageRect && (
        <>
          <div 
            className="image-floating-toolbar absolute z-50 flex items-center justify-center"
            style={{ 
              top: imageRect.top - 12, 
              left: imageRect.left - 12,
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
              top: imageRect.top - 12, 
              left: imageRect.left + imageRect.width - 28,
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
      <ImageEditDialog
        isOpen={isImageEditDialogOpen}
        onClose={() => setIsImageEditDialogOpen(false)}
        image={hoveredImage}
        onConfirm={handleImageEditConfirm}
      />
    </div>
  );
};
