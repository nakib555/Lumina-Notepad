import React, { useRef, useCallback, useEffect, useState } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import { Sparkles, Trash2, Plus, GripHorizontal, GripVertical, Settings2 } from "lucide-react";
import { TableEditDialog } from './table-edit-dialog';

const renderer = new marked.Renderer();
renderer.table = function(header, body) {
  return `<div class="overflow-x-auto w-full"><table class="w-full">\n<thead>\n${header}</thead>\n<tbody>\n${body}</tbody>\n</table></div>\n`;
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
}

export const EditorArea = ({
  content,
  handleContentChange,
  handleDrop,
  handleDragOver,
  editorAreaRef,
  noteId,
  textareaRef
}: EditorAreaProps) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [tableRect, setTableRect] = useState<{ top: number, left: number, width: number } | null>(null);
  const [isTableEditDialogOpen, setIsTableEditDialogOpen] = useState(false);

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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isTableEditDialogOpen) return;
      if (!previewRef.current) return;
      
      const target = e.target as HTMLElement;
      const table = target.closest('table');
      const isHoveringToolbar = target.closest('.table-floating-toolbar') || target.closest('[role="dialog"]');
      
      if (table && previewRef.current.contains(table)) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredTable !== table) {
          setHoveredTable(table);
        }
        // Always update rect in case table moved (e.g. from typing above it)
        updateTableRect(table);
      } else if (isHoveringToolbar) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        if (!timeoutRef.current && hoveredTable) {
          timeoutRef.current = setTimeout(() => {
            setHoveredTable(null);
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
  }, [hoveredTable, updateTableRect, isTableEditDialogOpen]);

  useEffect(() => {
    if (!hoveredTable) return;
    
    const observer = new ResizeObserver(() => {
      updateTableRect(hoveredTable);
    });
    
    observer.observe(hoveredTable);
    return () => observer.disconnect();
  }, [hoveredTable, updateTableRect]);

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
        return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('not-prose') && (node as HTMLElement).querySelector('.capitalize') !== null;
      },
      replacement: function (_content, node) {
        const languageSpan = (node as HTMLElement).querySelector('.capitalize');
        const language = languageSpan ? languageSpan.textContent?.trim() : '';
        const codeContainer = (node as HTMLElement).querySelector('.overflow-x-auto');
        const code = codeContainer ? codeContainer.textContent : '';
        const lang = language === 'text' ? '' : language;
        return `\`\`\`${lang}\n${code}\n\`\`\``;
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
          return `\n\n<div class="overflow-x-auto w-full rounded-table rounded-xl border border-border">\n${table.outerHTML}\n</div>\n\n`;
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
          return `[${content}]{${match[1].trim()}}`;
        }
        return content;
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

  const sparkleTable = useCallback(() => {
    if (hoveredTable) {
      hoveredTable.style.transition = 'all 0.5s ease';
      hoveredTable.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.5)';
      setTimeout(() => {
        hoveredTable.style.boxShadow = 'none';
      }, 1000);
    }
  }, [hoveredTable]);

  const handleTableEditConfirm = useCallback((targetRows: number, targetCols: number, rounded: boolean) => {
    if (!hoveredTable) return;

    const tbody = hoveredTable.querySelector('tbody');
    const thead = hoveredTable.querySelector('thead');
    if (!tbody || !thead) return;

    const currentRows = hoveredTable.querySelectorAll('tr').length;
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
      if (rounded) {
        wrapper.classList.add('rounded-table');
        wrapper.classList.add('rounded-xl');
        wrapper.classList.add('border');
        wrapper.classList.add('border-border');
        // Add a class to the table to remove its outer borders so they don't double up with the wrapper
        hoveredTable.classList.add('border-0');
      } else {
        wrapper.classList.remove('rounded-table');
        wrapper.classList.remove('rounded-xl');
        wrapper.classList.remove('border');
        wrapper.classList.remove('border-border');
        hoveredTable.classList.remove('border-0');
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
      span.parentNode?.removeChild(span);
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
      const preProcessedContent = (content || '').replace(/\[(.*?)\]\{([^}]+)\}/g, '<span style="font-size: $2">$1</span>');
      const html = parseMarkdown(preProcessedContent);
      previewRef.current.innerHTML = html;
      lastProcessedContent.current = content;
    }
  }, [content]);

  // Reset lastProcessedContent when noteId changes
  useEffect(() => {
    lastProcessedContent.current = content;
    if (previewRef.current) {
      const preProcessedContent = (content || '').replace(/\[(.*?)\]\{([^}]+)\}/g, '<span style="font-size: $2">$1</span>');
      const html = parseMarkdown(preProcessedContent);
      previewRef.current.innerHTML = html;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

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
        onKeyUp={handleCursorMove}
        onClick={handleCursorMove}
        className="prose prose-slate dark:prose-invert max-w-full overflow-x-hidden break-words pb-[40vh] text-lg prose-p:leading-[1.8] prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-strong:font-semibold prose-strong:text-foreground prose-li:marker:text-muted-foreground prose-hr:border-border prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/20 prose-blockquote:px-6 prose-blockquote:py-3 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-blockquote:rounded-r-lg prose-code:text-foreground prose-code:bg-muted/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.9em] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted/50 prose-th:text-left prose-th:font-semibold prose-td:border prose-td:border-border prose-td:p-3 outline-none focus:ring-0 min-h-[500px]"
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
    </div>
  );
};
