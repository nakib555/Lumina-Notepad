/* eslint-disable react-compiler/react-compiler */
import React, { useRef, useCallback, useEffect, useState, Suspense, lazy } from 'react';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { marked } from 'marked';
import { renderToStaticMarkup } from 'react-dom/server';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  Trash2,
  Settings2, 
  ExternalLink} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import { cn } from "@/lib/utils";
import { PenTool, Loader2 } from 'lucide-react';
import {
  ITableCell,
  ITableModel,
  PatchType,
  ITableDOMPatch,
  TableController,
  ITableSelection
} from './table-model';

const SketchDialog = lazy(() => import('./sketch-dialog').then(module => ({ default: module.SketchDialog })));
const TableEditDialog = lazy(() => import('./table-edit-dialog').then(module => ({ default: module.TableEditDialog })));
const ImageEditDialog = lazy(() => import('./image-edit-dialog').then(module => ({ default: module.ImageEditDialog })));

const CARET_MARKER = '%%%%CARETMARKER%%%%';

const getCaretCharacterOffsetWithin = (element: HTMLElement) => {
    let caretOffset = 0;
    const doc = element.ownerDocument;
    const win = doc.defaultView;
    const sel = win?.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
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

// We use standard selection finding without custom recursive text marker finders

marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

const renderer = new marked.Renderer();

const CUSTOM_STYLE = {
  margin: '0',
  padding: '0.5rem 1.5rem 0.5rem 1.25rem',
  fontSize: '14px',
  lineHeight: '1.5',
  fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  background: 'transparent'};

renderer.code = function(token) {
  const code = token.text.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
  let rawLang = (token.lang || '').match(/\S*/)?.[0]?.toLowerCase() || '';
  if (!rawLang) {
    rawLang = 'text';
  }
  
  const langAliases: Record<string, string> = { text: 'text', plaintext: 'text', txt: 'text', raw: 'text' };
  const lang = langAliases[rawLang] || rawLang;
  
  const displayLang = !lang ? 'Code' : lang === 'text' ? 'Text' : lang.charAt(0).toUpperCase() + lang.slice(1);

  let highlightedContent = '';
  if (!lang || lang === 'text') {
    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };
    
    // Fallback style converted to inline CSS for the pre tag
    const inlineStyle = "margin:0;padding:0.5rem 1.5rem 0.5rem 1.25rem;font-size: 14px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
    
    highlightedContent = `<pre style="${inlineStyle}"><code class="code-element outline-none block min-h-[20px] whitespace-pre print:whitespace-pre-wrap [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${escapeHtml(code)}</code></pre>`;
  } else {
    try {
      highlightedContent = renderToStaticMarkup(
        <SyntaxHighlighter
          language={lang}
          useInlineStyles={true}
          customStyle={CUSTOM_STYLE}
          PreTag="div"
          codeTagProps={{
            className: "code-element outline-none block min-h-[20px] whitespace-pre print:whitespace-pre-wrap [font-variant-ligatures:none] font-mono",
            style: { padding: 0, margin: 0, background: 'transparent' }
          }}
        >
          {code}
        </SyntaxHighlighter>
      );
      // Inject contenteditable into the code tag after generation
      highlightedContent = highlightedContent.replace('<code', '<code contenteditable="plaintext-only"');
    } catch {
      const inlineStyle = "margin:0;padding:0.5rem 1.5rem 0.5rem 1.25rem;font-size: 14px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
      const escapeHtml = (unsafe: string) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      highlightedContent = `<pre style="${inlineStyle}"><code class="code-element outline-none block min-h-[20px] whitespace-pre print:whitespace-pre-wrap [font-variant-ligatures:none] font-mono" contenteditable="plaintext-only">${escapeHtml(code)}</code></pre>`;
    }
  }

  return `<div class="code-block-wrapper not-prose my-6" contenteditable="false"><div class="rounded-xl font-sans group transition-colors duration-300 border border-border relative overflow-hidden bg-muted/10"><div class="sticky top-0 z-10 flex justify-between items-center px-5 py-2.5 border-b border-border select-none bg-muted/30"><div class="flex items-center gap-3"><span class="text-[13px] font-semibold text-muted-foreground font-mono capitalize language-label">${displayLang}</span></div><div class="flex items-center gap-4"><button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400" title="Run Code"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>Run</button><button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all" title="Open in Side Panel"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>Open</button><button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95 copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block-wrapper').querySelector('.code-element').textContent); const span = this.querySelector('.copy-text'); span.textContent='Copied'; setTimeout(() => span.textContent='', 2000);" title="code"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="copy-text"></span></button><button class="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 delete-btn" onclick="const wrapper = this.closest('.code-block-wrapper'); const next = wrapper.nextElementSibling; if(next && next.tagName === 'P' && next.innerHTML.includes('&#8203;')) next.remove(); wrapper.remove();" title="Delete code block"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button></div></div><div class="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-transparent code-container whitespace-pre print:whitespace-pre-wrap font-mono m-0 text-slate-800 dark:text-slate-200">${highlightedContent}</div></div></div>`;
};
renderer.table = function(token: import('marked').Tokens.Table) {
  let html = marked.Renderer.prototype.table.call(this, token);
  html = html.replace('<table>', '<table class="border-hidden m-0 w-full">');
  return `\n<div class="overflow-x-auto overflow-hidden w-full table-wrapper my-8 rounded-xl rounded-table border border-[var(--border)]">\n${html}\n</div>\n`;
};

renderer.listitem = function(token: import('marked').Tokens.ListItem) {
  let html = marked.Renderer.prototype.listitem.call(this, token);
  if (token.task) {
    html = html.replace(/^<li>/, '<li class="task-list-item" style="list-style-type: none;">');
    html = html.replace(/<input([^>]*?)type="checkbox"([^>]*?)>/, '<input$1type="checkbox"$2 style="margin-right: 0.5rem; margin-top: 0.25rem;">');
  }
  return html;
};

renderer.list = function(token: import('marked').Tokens.List) {
  let html = marked.Renderer.prototype.list.call(this, token);
  if (token.items.some(item => item.task)) {
    html = html.replace(/^<ul([^>]*)>/, '<ul$1 class="contains-task-list" style="list-style-type: none; padding-left: 0;">');
  }
  return html;
};

renderer.image = function(token: import('marked').Tokens.Image) {
  let html = marked.Renderer.prototype.image.call(this, token);
  html = html.replace(/^<img /, '<img draggable="false" ');
  return html;
};

export const parseMarkdown = (text: string) => {
  // Strip zero-width characters that cause KaTeX console warnings
  // \u200B: Zero-width space, \u2061: Function application
  // Also convert non-breaking spaces to standard spaces or marked won't parse headings/lists correctly
  const cleanText = text.replace(/[\u200B\u2061]/g, '').replace(/\xA0/g, ' ');
  // Append zero-width non-joiner so marked doesn't strip trailing newlines
  const html = marked.parse(cleanText + '\u200C', { renderer, breaks: true, gfm: true }) as string;
  
  // Replace the zero-width non-joiner
  let finalHtml = html.replace('\u200C', '');
  
  // Natively in Chromium/Firefox empty <p></p> collapses to 0 height, making trailing newlines disappear visually.
  // We insert a <br> inside empty paragraphs so they render visually exactly as a newline.
  finalHtml = finalHtml.replace(/<p><\/p>/g, '<p><br></p>');

  // Ensure empty table cells have a <br> inside so they do not collapse in height and are clickable/editable
  finalHtml = finalHtml.replace(/<td([^>]*)>\s*<\/td>/gi, '<td$1><br></td>');
  finalHtml = finalHtml.replace(/<th([^>]*)>\s*<\/th>/gi, '<th$1><br></th>');
  
  // To ensure the cursor can always explicitly leave a completely trailing contenteditable="false" block (like CodeBlock or Table)
  // We forcibly append an editable empty paragraph at the very end if the html does not end with one.
  if (!finalHtml.trim().endsWith('</p>')) {
      finalHtml += '<p><br></p>';
  }
  
  return finalHtml;
};

const focusCell = (cell: HTMLElement, atEnd: boolean = true) => {
  cell.focus();
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(!atEnd);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

const getCellIndices = (cell: HTMLElement) => {
  const tr = cell.closest('tr');
  const table = cell.closest('table');
  if (!tr || !table) return null;
  const allRows = Array.from(table.querySelectorAll('tr'));
  const r = allRows.indexOf(tr);
  const cells = Array.from(tr.children);
  const c = cells.indexOf(cell);
  return { r, c, table, tr };
};

const parseTableDOM = (table: HTMLTableElement): ITableModel => {
  const rows = Array.from(table.querySelectorAll('tr'));
  const cells: ITableCell[][] = rows.map((tr) => {
    return Array.from(tr.children).map((cell) => {
      const alignment = cell.getAttribute('align') as 'left' | 'center' | 'right' | null || 'left';
      return {
        value: cell.innerHTML === '<br>' ? '' : cell.innerHTML,
        style: { alignment }
      };
    });
  });
  return {
    id: table.id || 'table_' + Math.random().toString(36).substring(2, 9),
    cells,
    rowCount: cells.length,
    colCount: cells[0]?.length || 0
  };
};

const applyDOMPatchesSynchronously = (table: HTMLTableElement, controller: TableController, domPatches: ITableDOMPatch[]) => {
  const model = controller.getModel();
  
  const rebuildTable = () => {
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    model.cells.forEach((row, rIdx) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const isHeader = rIdx === 0;
        const cellEl = document.createElement(isHeader ? 'th' : 'td');
        cellEl.innerHTML = cell.value === '' ? '<br>' : cell.value;
        if (cell.style.alignment) {
          cellEl.setAttribute('align', cell.style.alignment);
          cellEl.style.textAlign = cell.style.alignment;
        }
        tr.appendChild(cellEl);
      });
      if (rIdx === 0) {
        thead.appendChild(tr);
      } else {
        tbody.appendChild(tr);
      }
    });
    table.appendChild(thead);
    table.appendChild(tbody);
  };

  const hasRebuild = domPatches.some(p => p.type === 'REBUILD_TABLE');
  if (hasRebuild) {
    rebuildTable();
    return;
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  domPatches.forEach(patch => {
    if (patch.type === 'UPDATE_CELL_HTML' && patch.targetCell) {
      const { r, c } = patch.targetCell;
      const tr = rows[r];
      const cellEl = tr?.children[c] as HTMLElement;
      if (cellEl) {
        cellEl.innerHTML = patch.html === '' ? '<br>' : (patch.html || '<br>');
        if (patch.style?.alignment) {
          cellEl.setAttribute('align', patch.style.alignment);
          cellEl.style.textAlign = patch.style.alignment;
        }
      }
    } else if (patch.type === 'UPDATE_CELL_STYLE' && patch.targetCell) {
      const { r, c } = patch.targetCell;
      const tr = rows[r];
      const cellEl = tr?.children[c] as HTMLElement;
      if (cellEl && patch.style?.alignment) {
        cellEl.setAttribute('align', patch.style.alignment);
        cellEl.style.textAlign = patch.style.alignment;
      }
    }
  });
};

type FlushFn = () => void;
interface TableMutationTask {
  table: HTMLTableElement;
  controller: TableController;
  domPatches: ITableDOMPatch[];
  flushFn?: FlushFn;
}

const tableMutationQueue: TableMutationTask[] = [];
let isTableMutationScheduled = false;

const renderDOMPatches = (table: HTMLTableElement, controller: TableController, domPatches: ITableDOMPatch[], flushFn?: FlushFn) => {
  tableMutationQueue.push({ table, controller, domPatches, flushFn });
  if (!isTableMutationScheduled) {
    isTableMutationScheduled = true;
    requestAnimationFrame(() => {
      isTableMutationScheduled = false;
      const tasks = [...tableMutationQueue];
      tableMutationQueue.length = 0;
      
      const tasksByTable = new Map<HTMLTableElement, TableMutationTask[]>();
      tasks.forEach(task => {
        if (!tasksByTable.has(task.table)) {
          tasksByTable.set(task.table, []);
        }
        tasksByTable.get(task.table)!.push(task);
      });
      
      tasksByTable.forEach((tableTasks, table) => {
        const lastTask = tableTasks[tableTasks.length - 1];
        const allPatches = tableTasks.flatMap(t => t.domPatches);
        const hasRebuild = allPatches.some(p => p.type === 'REBUILD_TABLE');
        
        if (hasRebuild) {
          applyDOMPatchesSynchronously(table, lastTask.controller, [{ type: 'REBUILD_TABLE' }]);
        } else {
          applyDOMPatchesSynchronously(table, lastTask.controller, allPatches);
        }
      });
      
      const flushFns = new Set(tasks.map(t => t.flushFn).filter(Boolean) as FlushFn[]);
      flushFns.forEach(fn => fn());
    });
  }
};

const getTableController = (table: HTMLTableElement, selection: ITableSelection | null = null): TableController => {
  const model = parseTableDOM(table);
  const controller = new TableController(model);
  if (selection) {
    controller.setSelection(selection);
  }
  return controller;
};

const highlightTableCells = (
  table: HTMLTableElement | null,
  hovered: { r: number, c: number } | null,
  active: { r: number, c: number } | null
) => {
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tr'));
  
  rows.forEach((tr, rIndex) => {
    const cells = Array.from(tr.children) as HTMLElement[];
    cells.forEach((cell, cIndex) => {
      // Clear previous custom highlights
      cell.classList.remove(
        'bg-slate-100/50', 'dark:bg-slate-800/30',
        'bg-blue-50/10', 'dark:bg-blue-950/10',
        'bg-slate-200/50', 'dark:bg-slate-700/50',
        'bg-blue-100/20', 'dark:bg-blue-900/20',
        'ring-2', 'ring-blue-500', 'z-10', 'relative', 'active-cell'
      );

      // 1. Active Cell
      if (active && active.r === rIndex && active.c === cIndex) {
        cell.classList.add('ring-2', 'ring-blue-500', 'z-10', 'relative', 'active-cell');
      }
      // 2. Active Row / Column
      else if (active && active.r === rIndex) {
        cell.classList.add('bg-slate-200/50', 'dark:bg-slate-700/50');
      } else if (active && active.c === cIndex) {
        cell.classList.add('bg-blue-100/20', 'dark:bg-blue-900/20');
      }
      // 3. Hovered Row / Column
      else if (hovered && hovered.r === rIndex) {
        cell.classList.add('bg-slate-100/50', 'dark:bg-slate-800/30');
      } else if (hovered && hovered.c === cIndex) {
        cell.classList.add('bg-blue-50/10', 'dark:bg-blue-950/10');
      }
    });
  });
};

  export interface EditorAreaRef {
    flushPreviewEdit: () => string | undefined;
  }

interface EditorAreaProps {
  content: string;
  theme: string;
  handleContentChange: (content: string, immediate?: boolean) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  editorAreaRef?: React.RefObject<EditorAreaRef | null>;
  noteId?: string;
  textareaRef?: React.RefObject<HTMLDivElement | null>;
  isAutoMarkdownEnabled?: boolean;
  isViewMode?: boolean;
  isMode?: boolean;
  powerSaver?: boolean;
  baseFontSize?: string;
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
  isMode,
  powerSaver,
  baseFontSize}: EditorAreaProps) => {
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
  const [deletePromptInfo, setDeletePromptInfo] = useState<{ isOpen: boolean, targetRow: HTMLTableRowElement | null, targetTable: HTMLTableElement | null }>({ isOpen: false, targetRow: null, targetTable: null });
  const [deletePromptOption, setDeletePromptOption] = useState<'row' | 'table'>('row');

  const [hoveredCell, setHoveredCell] = useState<{ r: number, c: number } | null>(null);
  const [activeCell, setActiveCell] = useState<{ r: number, c: number } | null>(null);

  const [hoveredImage, setHoveredImage] = useState<HTMLImageElement | null>(null);
  const [imageRect, setImageRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [isImageEditDialogOpen, setIsImageEditDialogOpen] = useState(false);

  const [hoveredSketch, setHoveredSketch] = useState<HTMLElement | null>(null);
  const [sketchRect, setSketchRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  const [isSketchEditDialogOpen, setIsSketchEditDialogOpen] = useState(false);

  const [hoveredLink, setHoveredLink] = useState<HTMLAnchorElement | null>(null);
  const [linkRect, setLinkRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);
  


  // Sync previewRef with textareaRef if provided
  useEffect(() => {
    if (textareaRef && previewRef.current) {
      if (typeof textareaRef === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (textareaRef as any)(previewRef.current);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (textareaRef as any).current = previewRef.current;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTableRect = useCallback((table: HTMLTableElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    if (!table || !table.getBoundingClientRect) return;
    const tRect = table.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setTableRect(prev => {
      const top = tRect.top - parentRect.top;
      const left = tRect.left - parentRect.left;
      if (prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1 && prev.width === tRect.width && prev.height === tRect.height) return prev;
      return { top, left, width: tRect.width, height: tRect.height };
    });

    const firstRow = table.querySelector('tr');
    if (firstRow) {
      const tds = Array.from(firstRow.children) as HTMLElement[];
      setColRects(prev => {
        const next = tds.map(td => {
           if (!td || !td.getBoundingClientRect) return { left: 0, width: 0 };
           const r = td.getBoundingClientRect();
           return { left: r.left - parentRect.left, width: r.width };
        });
        if (prev.length === next.length && prev.every((p, i) => Math.abs(p.left - next[i].left) < 1 && p.width === next[i].width)) return prev;
        return next;
      });
    }

    const trs = Array.from(table.querySelectorAll('tr'));
    setRowRects(prev => {
      const next = trs.map(tr => {
         if (!tr || !tr.getBoundingClientRect) return { top: 0, height: 0 };
         const r = tr.getBoundingClientRect();
         return { top: r.top - parentRect.top, height: r.height };
      });
      if (prev.length === next.length && prev.every((p, i) => Math.abs(p.top - next[i].top) < 1 && p.height === next[i].height)) return prev;
      return next;
    });
  }, []);

  const updateSketchRect = useCallback((sketch: HTMLElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    if (!sketch || !sketch.getBoundingClientRect) return;
    const sRect = sketch.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setSketchRect(prev => {
      const top = sRect.top - parentRect.top;
      const left = sRect.left - parentRect.left;
      if (prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1 && prev.width === sRect.width && prev.height === sRect.height) return prev;
      return { top, left, width: sRect.width, height: sRect.height };
    });
  }, []);

  const updateImageRect = useCallback((img: HTMLImageElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    if (!img || !img.getBoundingClientRect) return;
    const imgRect = img.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setImageRect(prev => {
      const top = imgRect.top - parentRect.top;
      const left = imgRect.left - parentRect.left;
      if (prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1 && prev.width === imgRect.width && prev.height === imgRect.height) return prev;
      return { top, left, width: imgRect.width, height: imgRect.height };
    });
  }, []);

  const updateLinkRect = useCallback((link: HTMLAnchorElement) => {
    if (!previewRef.current || !previewRef.current.parentElement) return;
    if (!link || !link.getBoundingClientRect) return;
    const lRect = link.getBoundingClientRect();
    const parentRect = previewRef.current.parentElement.getBoundingClientRect();
    
    setLinkRect(prev => {
      const top = lRect.top - parentRect.top;
      const left = lRect.left - parentRect.left;
      if (prev && Math.abs(prev.top - top) < 1 && Math.abs(prev.left - left) < 1 && prev.width === lRect.width && prev.height === lRect.height) return prev;
      return { top, left, width: lRect.width, height: lRect.height };
    });
  }, []);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMouseMoveTime = useRef<number>(0);

  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        
        if (powerSaver) {
          const now = Date.now();
          if (now - lastMouseMoveTime.current < 200) return;
          lastMouseMoveTime.current = now;
        }

        if (isTableEditDialogOpen || isImageEditDialogOpen || isSketchEditDialogOpen) return;
        if (!previewRef.current) return;
        
        const target = e.target as HTMLElement;
        const table = target.closest('table');
        const sketch = target.closest('.sketch-container') as HTMLElement | null;
        const img = sketch ? null : target.closest('img');
        const link = target.closest('a');
        const isHoveringToolbar = target.closest('.table-floating-toolbar') || target.closest('.image-floating-toolbar') || target.closest('.sketch-floating-toolbar') || target.closest('.link-floating-toolbar') || target.closest('[role="dialog"]') || target.closest('.table-overlay-btn');
        
        // Inside table checking
        if (table && previewRef.current.contains(table) && !target.closest('.table-floating-toolbar')) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          // if (hoveredTable !== table) setHoveredTable(table);
          
          // Update active table row based on mouse cursor position
          const tr = target.closest('tr');
          if (tr) {
            setActiveTableRow(tr as HTMLTableRowElement);
          }
          
          // Only update rect if it's already hovered (e.g. from click)
          if (hoveredTable === table) {
             updateTableRect(table);
          }
          setHoveredImage(null);
          setHoveredSketch(null);
          setHoveredLink(null);
        } else if (sketch && previewRef.current.contains(sketch) && !target.closest('.sketch-floating-toolbar')) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (hoveredSketch !== sketch) setHoveredSketch(sketch);
          updateSketchRect(sketch);
          setHoveredTable(null);
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
          setHoveredSketch(null);
          setHoveredLink(null);
        } else if (link && previewRef.current.contains(link) && !target.closest('.link-floating-toolbar')) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (hoveredLink !== link) setHoveredLink(link as HTMLAnchorElement);
          updateLinkRect(link as HTMLAnchorElement);
          setHoveredImage(null);
          setHoveredSketch(null);
          setHoveredTable(null);
        } else if (isHoveringToolbar) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        } else {
          if (!timeoutRef.current && (hoveredTable || hoveredImage || hoveredSketch || hoveredLink)) {
            timeoutRef.current = setTimeout(() => {
              const sel = window.getSelection();
              const caretInsideHoveredTable = hoveredTable && sel && sel.anchorNode && hoveredTable.contains(sel.anchorNode);
              const focusInsideHoveredTable = hoveredTable && (hoveredTable.contains(document.activeElement) || activeCell !== null);
              
              if (caretInsideHoveredTable || focusInsideHoveredTable) {
                timeoutRef.current = null;
                return;
              }

              setHoveredTable(null);
              setHoveredImage(null);
              setHoveredSketch(null);
              setHoveredLink(null);
              timeoutRef.current = null;
            }, 150);
          }
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [hoveredTable, updateTableRect, isTableEditDialogOpen, hoveredImage, updateImageRect, isImageEditDialogOpen, hoveredSketch, updateSketchRect, isSketchEditDialogOpen, hoveredLink, updateLinkRect, powerSaver, activeCell]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement | null;
      if (cell && el.contains(cell)) {
        const indices = getCellIndices(cell);
        if (indices) {
          setHoveredCell({ r: indices.r, c: indices.c });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement | null;
      if (cell && el.contains(cell)) {
        setHoveredCell(null);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement | null;
      if (cell && el.contains(cell)) {
        const indices = getCellIndices(cell);
        if (indices) {
          setActiveCell({ r: indices.r, c: indices.c });
          setActiveTableRow(indices.tr as HTMLTableRowElement);
          if (hoveredTable !== indices.table) {
            setHoveredTable(indices.table);
            updateTableRect(indices.table);
          }
        }
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (relatedTarget && (
        relatedTarget.closest('td, th') || 
        relatedTarget.closest('.table-floating-toolbar') || 
        relatedTarget.closest('.table-overlay-btn') || 
        relatedTarget.closest('[role="dialog"]')
      )) {
        return;
      }
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (activeEl && (
          activeEl.closest('td, th') || 
          activeEl.closest('.table-floating-toolbar') || 
          activeEl.closest('.table-overlay-btn') || 
          activeEl.closest('[role="dialog"]')
        )) {
          return;
        }
        setActiveCell(null);
      }, 150);
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const cell = target.closest('td, th') as HTMLElement | null;
      if (cell && el.contains(cell)) {
        const indices = getCellIndices(cell);
        if (indices) {
          setActiveCell({ r: indices.r, c: indices.c });
          setActiveTableRow(indices.tr as HTMLTableRowElement);
          setSelectedColIndex(null);
          setSelectedRowIndex(null);
        }
      }
    };

    el.addEventListener('mouseover', handleMouseOver);
    el.addEventListener('mouseout', handleMouseOut);
    el.addEventListener('focusin', handleFocusIn);
    el.addEventListener('focusout', handleFocusOut);
    el.addEventListener('click', handleClick);

    return () => {
      el.removeEventListener('mouseover', handleMouseOver);
      el.removeEventListener('mouseout', handleMouseOut);
      el.removeEventListener('focusin', handleFocusIn);
      el.removeEventListener('focusout', handleFocusOut);
      el.removeEventListener('click', handleClick);
    };
  }, [hoveredTable, updateTableRect]);

  useEffect(() => {
    if (hoveredTable) {
      highlightTableCells(hoveredTable, hoveredCell, activeCell);
    }
  }, [hoveredTable, hoveredCell, activeCell]);

  useEffect(() => {
    if (!hoveredTable || powerSaver) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (hoveredTable) updateTableRect(hoveredTable);
      });
    });
    
    observer.observe(hoveredTable);
    return () => observer.disconnect();
  }, [hoveredTable, updateTableRect, powerSaver]);

  // Update positions of hovered elements on scrolling
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (hoveredTable) updateTableRect(hoveredTable);
          if (hoveredImage) updateImageRect(hoveredImage);
          if (hoveredSketch) updateSketchRect(hoveredSketch);
          if (hoveredLink) updateLinkRect(hoveredLink);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    
    const parent = previewRef.current?.parentElement;
    if (parent) {
      parent.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (parent) {
        parent.removeEventListener('scroll', handleScroll);
      }
    };
  }, [hoveredTable, hoveredImage, hoveredSketch, hoveredLink, updateTableRect, updateImageRect, updateSketchRect, updateLinkRect]);

  useEffect(() => {
    if (!hoveredImage || powerSaver) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (hoveredImage) updateImageRect(hoveredImage);
      });
    });
    
    observer.observe(hoveredImage);
    return () => observer.disconnect();
  }, [hoveredImage, updateImageRect, powerSaver]);

  useEffect(() => {
    if (!hoveredSketch || powerSaver) return;
    
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (hoveredSketch) updateSketchRect(hoveredSketch);
      });
    });
    
    observer.observe(hoveredSketch);
    return () => observer.disconnect();
  }, [hoveredSketch, updateSketchRect, powerSaver]);

  // Initialize turndown service once
  const turndownService = React.useMemo(() => {
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '*'});
    
    service.escape = (string) => {
      // Avoid escaping most markdown characters to allow live markdown typing.
      // We don't escape pipes so users can type markdown tables natively.
      return string;
    };

    service.use(gfm as import('turndown').Plugin);

    service.addRule('caretMarker', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'SPAN' && (node as HTMLElement).id === 'caret-marker';
      },
      replacement: function () {
        return CARET_MARKER;
      }
    });

    service.addRule('emptyTableFix', {
      filter: function (node) {
        return node.nodeName === 'TABLE' && (node as HTMLTableElement).rows.length === 0;
      },
      replacement: function () {
        return '';
      }
    });

    service.addRule('emptyParagraph', {
      filter: function (node) {
        return (node.nodeName === 'DIV' || node.nodeName === 'P') && 
               node.innerHTML.trim() === '<br>';
      },
      replacement: function () {
        return '<br>';
      }
    });

    service.addRule('preserveBr', {
      filter: 'br',
      replacement: function () {
        return '<br>';
      }
    });

    service.addRule('tableRows', {
      filter: function (node) {
        return (node.nodeName === 'P' || node.nodeName === 'DIV') && 
               /^\s*\|([\s\S]*)\|\s*$/.test(node.textContent || '');
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
              // Ignore \u200B if it's placed by our marker inside the text node
              text += (child.textContent || '').replace(/\u200B/g, '');
            } else if (child.nodeType === Node.ELEMENT_NODE) {
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
        // Remove leading and trailing newlines completely to avoid huge gaps
        const code = codeTextRaw.replace(/^[\r\n]+/, '').replace(/[\r\n]+$/, '');
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

    service.addRule('sketchContainer', {
      filter: function (node) {
        return node.nodeType === 1 && node.nodeName === 'DIV' && (node as HTMLElement).classList.contains('sketch-container');
      },
      replacement: function (_content, node) {
        const safeHtml = (node as HTMLElement).outerHTML.replace(/\n *\n/g, '\n').replace(/\n/g, ' ');
        return '\n\n' + safeHtml + '\n\n';
      }
    });

    service.addRule('emptyBlocks', {
      filter: function (node) {
        if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
        const html = (node as HTMLElement).innerHTML.trim().toLowerCase();
        if (html === '<br>' || html === '') return true;
        if (html.includes('id="caret-marker"')) {
            const stripped = html.replace(/<span id="caret-marker">.*?<\/span>/ig, '').trim();
            if (stripped === '' || stripped === '<br>') return true;
        }
        return false;
      },
      replacement: function (content) {
        const marker = content.replace(/\n|<br>/g, '').trim();
        return '\n\n<br>' + marker + '\n\n';
      }
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
      }
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
        // If it's a list item, add a bullet
        let prefix = '';
        if (node.nodeName === 'LI') {
          prefix = '• ';
        }
        
        // Return content with a <br> if it's not the last child
        return prefix + content + (node.nextSibling ? '<br>' : '');
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
        return node.nodeName === 'DIV' && (node.classList.contains('table-wrapper') || node.classList.contains('overflow-x-auto')) && node.querySelector('table') !== null;
      },
      replacement: function (content, node) {
        const table = node.querySelector('table');
        if (table) {
          const classes = Array.from(node.classList);
          const hasRoundedTable = node.classList.contains('rounded-table');
          const curveClass = classes.find((c: string) => c.startsWith('rounded-') && c !== 'rounded-table') || '';
          const isZebra = node.classList.contains('table-zebra');
          
          const cleanTable = table.cloneNode(true) as HTMLTableElement;
          const cells = Array.from(cleanTable.querySelectorAll('td, th'));
          cells.forEach(cell => {
            cell.classList.remove(
              'bg-slate-100/50', 'dark:bg-slate-800/30',
              'bg-blue-50/10', 'dark:bg-blue-950/10',
              'bg-slate-200/50', 'dark:bg-slate-700/50',
              'bg-blue-100/20', 'dark:bg-blue-900/20',
              'ring-2', 'ring-blue-500', 'z-10', 'relative', 'active-cell'
            );
            if (!cell.getAttribute('class')) {
              cell.removeAttribute('class');
            }
          });

          // Ensure standard classes on the table element
          cleanTable.className = 'border-hidden m-0 w-full';

          // Construct the classes for the wrapper div
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
          
          return '\n\n<div class="' + wrapperClasses.join(' ') + '">\n' + cleanTable.outerHTML + '\n</div>\n\n';
        }
        return content;
      }
    });

    service.addRule('alignTag', {
      filter: function (node) {
        if (node.nodeType !== 1) return false;
        const isBlock = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName);
        return isBlock && ((node as HTMLElement).getAttribute('align') !== null || !!(node as HTMLElement).style.textAlign);
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
      replacement: function (_content, node) {
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

    service.addRule('hr', {
      filter: 'hr',
      replacement: function () {
        return '\n\n---\n\n';
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

  const flushPreviewEdit = useCallback((immediate = false) => {
    if (previewRef.current) {
      const htmlContent = previewRef.current.innerHTML;
      const markdown = turndownService.turndown(htmlContent);
      if (markdown !== lastProcessedContent.current) {
        lastProcessedContent.current = markdown;
        handleContentChange(markdown, immediate);
      }
      return markdown;
    }
  }, [handleContentChange, turndownService]);

  /* const handleInsertRowAbove = useCallback(() => {
    if (!hoveredTable) return;
    let rIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
    if (rIdx === null && activeTableRow) {
      rIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
    }
    if (rIdx === null) rIdx = 0;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.INSERT_ROW,
      timestamp: Date.now(),
      payload: { count: 1, at: rIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedRowIndex, activeCell, activeTableRow, flushPreviewEdit]); */

  /* const handleInsertRowBelow = useCallback(() => {
    if (!hoveredTable) return;
    let rIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
    if (rIdx === null && activeTableRow) {
      rIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
    }
    if (rIdx === null) rIdx = 0;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.INSERT_ROW,
      timestamp: Date.now(),
      payload: { count: 1, at: rIdx + 1 }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedRowIndex, activeCell, activeTableRow, flushPreviewEdit]); */

  /* const handleInsertColLeft = useCallback(() => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : 0);

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.INSERT_COL,
      timestamp: Date.now(),
      payload: { count: 1, at: cIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleInsertColRight = useCallback(() => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : 0);

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.INSERT_COL,
      timestamp: Date.now(),
      payload: { count: 1, at: cIdx + 1 }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleDuplicateRow = useCallback(() => {
    if (!hoveredTable) return;
    let rIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
    if (rIdx === null && activeTableRow) {
      rIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
    }
    if (rIdx === null) return;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.DUPLICATE_ROW,
      timestamp: Date.now(),
      payload: { r: rIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedRowIndex, activeCell, activeTableRow, flushPreviewEdit]); */

  /* const handleDuplicateCol = useCallback(() => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : null);
    if (cIdx === null) return;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.DUPLICATE_COL,
      timestamp: Date.now(),
      payload: { c: cIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleClearRow = useCallback(() => {
    if (!hoveredTable) return;
    let rIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
    if (rIdx === null && activeTableRow) {
      rIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
    }
    if (rIdx === null) return;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.CLEAR_ROW,
      timestamp: Date.now(),
      payload: { r: rIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedRowIndex, activeCell, activeTableRow, flushPreviewEdit]); */

  /* const handleClearCol = useCallback(() => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : null);
    if (cIdx === null) return;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.CLEAR_COL,
      timestamp: Date.now(),
      payload: { c: cIdx }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleDeleteRow = useCallback(() => {
    if (!hoveredTable) return;
    let rIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
    if (rIdx === null && activeTableRow) {
      rIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
    }
    if (rIdx === null) return;

    const controller = getTableController(hoveredTable);
    const model = controller.getModel();
    if (model.rowCount <= 1) {
      const wrapper = hoveredTable.closest('.table-wrapper');
      if (wrapper) wrapper.remove();
      else hoveredTable.remove();
      setHoveredTable(null);
      flushPreviewEdit();
    } else {
      const result = controller.applyPatches([{
        patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
        type: PatchType.DELETE_ROW,
        timestamp: Date.now(),
        payload: { r: rIdx }
      }]);

      if (result.success) {
        renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
      }
    }
    setSelectedRowIndex(null);
  }, [hoveredTable, selectedRowIndex, activeCell, activeTableRow, flushPreviewEdit]); */

  /* const handleDeleteCol = useCallback(() => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : null);
    if (cIdx === null) return;

    const controller = getTableController(hoveredTable);
    const model = controller.getModel();
    if (model.colCount <= 1) {
      const wrapper = hoveredTable.closest('.table-wrapper');
      if (wrapper) wrapper.remove();
      else hoveredTable.remove();
      setHoveredTable(null);
      flushPreviewEdit();
    } else {
      const result = controller.applyPatches([{
        patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
        type: PatchType.DELETE_COL,
        timestamp: Date.now(),
        payload: { c: cIdx }
      }]);

      if (result.success) {
        renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
      }
    }
    setSelectedColIndex(null);
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleSetColAlign = useCallback((align: 'left' | 'center' | 'right') => {
    if (!hoveredTable) return;
    const cIdx = selectedColIndex !== null ? selectedColIndex : (activeCell ? activeCell.c : null);
    if (cIdx === null) return;

    const controller = getTableController(hoveredTable);
    const result = controller.applyPatches([{
      patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
      type: PatchType.FORMAT_COL,
      timestamp: Date.now(),
      payload: { c: cIdx, alignment: align }
    }]);

    if (result.success) {
      renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
    }
  }, [hoveredTable, selectedColIndex, activeCell, flushPreviewEdit]); */

  /* const handleToggleZebra = useCallback(() => {
    if (!hoveredTable) return;
    const wrapper = hoveredTable.closest('.table-wrapper');
    if (wrapper) {
      const hasZebra = wrapper.classList.contains('table-zebra');
      if (hasZebra) {
        wrapper.classList.remove('table-zebra');
        setIsZebraState(false);
      } else {
        wrapper.classList.add('table-zebra');
        setIsZebraState(true);
      }
      flushPreviewEdit();
    }
  }, [hoveredTable, flushPreviewEdit]); */





  const deleteImage = useCallback(() => {
    if (hoveredImage && hoveredImage.parentNode) {
      const wrapper = hoveredImage.closest('.image-wrapper');
      if (wrapper) {
        wrapper.remove();
      } else {
        hoveredImage.remove();
      }
      setHoveredImage(null);
      flushPreviewEdit(true);
    }
  }, [hoveredImage, flushPreviewEdit]);

  const handleImageEditConfirm = useCallback((newSrc: string, width: string, height: string, alt: string, align: 'left'|'center'|'right') => {
    if (!hoveredImage) return;
    
    hoveredImage.src = newSrc;
    if (width) {
      hoveredImage.style.width = width;
    }
    if (height) {
      hoveredImage.style.height = height;
    }
    hoveredImage.alt = alt;
    hoveredImage.title = alt; // Use alt as caption title
    
    // Apply alignment via margins since prose typically makes images block elements
    hoveredImage.style.display = 'block';
    
    if (align === 'center') {
      hoveredImage.style.marginLeft = 'auto';
      hoveredImage.style.marginRight = 'auto';
    } else if (align === 'right') {
      hoveredImage.style.marginLeft = 'auto';
      hoveredImage.style.marginRight = '0';
    } else { // left
      hoveredImage.style.marginLeft = '0';
      hoveredImage.style.marginRight = 'auto';
    }

    flushPreviewEdit(true);
  }, [hoveredImage, flushPreviewEdit]);



  const handleTableEditConfirm = useCallback((targetRows: number, targetCols: number, curveClass: string, tableData?: { headers: string[], rows: string[][], alignments?: string[] }, isZebra?: boolean) => {
    if (!hoveredTable) return;

    const applyStyles = (wrapper: Element) => {
      wrapper.classList.remove('rounded-table', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'border', 'border-border', 'border-[var(--border)]', 'overflow-hidden', 'table-zebra');
      hoveredTable.classList.remove('border-hidden', 'border-0');
      
      if (curveClass) {
        wrapper.classList.add('rounded-table', curveClass, 'border', 'border-border', 'overflow-hidden');
        hoveredTable.classList.add('border-hidden');
      }
      if (isZebra) {
        wrapper.classList.add('table-zebra');
      }
    };

    if (tableData) {
      const cells: ITableCell[][] = [];
      cells.push(tableData.headers.map((h, i) => ({
        value: h,
        style: { alignment: (tableData.alignments?.[i] as 'left' | 'center' | 'right' | null) || 'left' }
      })));
      tableData.rows.forEach(row => {
        cells.push(row.map((val, i) => ({
          value: val,
          style: { alignment: (tableData.alignments?.[i] as 'left' | 'center' | 'right' | null) || 'left' }
        })));
      });

      const model: ITableModel = {
        id: hoveredTable.id || 'table_' + Math.random().toString(36).substring(2, 9),
        cells,
        rowCount: cells.length,
        colCount: cells[0]?.length || 0
      };

      const controller = new TableController(model);
      renderDOMPatches(hoveredTable, controller, [{ type: 'REBUILD_TABLE' }], () => {
        // Handle rounded corners inside the animation frame callback so DOM updates are fully completed
        const wrapper = hoveredTable.closest('.overflow-x-auto');
        if (wrapper) {
          applyStyles(wrapper);
        }
        flushPreviewEdit(true);
      });
    } else {
      // Handle rounded corners immediately if tableData is not provided
      const wrapper = hoveredTable.closest('.overflow-x-auto');
      if (wrapper) {
        applyStyles(wrapper);
      }
      flushPreviewEdit(true);
    }
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
             const markerNode = document.createElement('span');
             markerNode.id = 'caret-marker';
             markerNode.textContent = '\u200B';
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
                   // Wrap contents in <pre><code class="... whitespace-pre-wrap font-mono ...">
                   const docFrag = document.createDocumentFragment();
                   while (container.firstChild) {
                       docFrag.appendChild(container.firstChild);
                   }
                   
                   const preEl = document.createElement('pre');
                   preEl.style.cssText = "margin:0;margin-top: -50px;margin-bottom: -50px;padding:0.5rem 1.5rem 0.5rem 1.25rem;font-size: 14px;line-height:1.5;font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;background:transparent;";
                   
                   const codeEl = document.createElement('code');
                   codeEl.className = "code-element outline-none block min-h-[20px] whitespace-pre print:whitespace-pre-wrap [font-variant-ligatures:none] font-mono";
                   codeEl.setAttribute('contenteditable', 'plaintext-only');
                   
                   codeEl.appendChild(docFrag);
                   preEl.appendChild(codeEl);
                   container.appendChild(preEl);
               }
             });

             const htmlWithMarker = previewRef.current.innerHTML;
             let mdWithMarker = turndownService.turndown(htmlWithMarker);
             
             // Fix table newlines: Turndown adds \n\n between DIVs, which breaks markdown tables.
             // We collapse \n\n between table rows to just \n
             mdWithMarker = mdWithMarker.replace(/(\|[^\n]*\|\s*)\n\n+(?=\|[^\n]*\|)/g, '$1\n');

             // Fix horizontal rule typing: if '---' is entered, ensure it's on its own line so marked parses it as HR
             mdWithMarker = mdWithMarker.replace(new RegExp(`^(\\s*---)\\s*(${CARET_MARKER})$`, 'gm'), '$1\n$2');
             
             let newHtml = parseMarkdown(mdWithMarker);
             newHtml = newHtml.replace(CARET_MARKER, '<span id="caret-marker"></span>');
             newHtml = newHtml.replace(/<([a-z0-9]+)(?: [^>]*)?>\s*<span id="caret-marker"><\/span>\s*<\/\1>/gi, (match) => match.replace('<span id="caret-marker"></span>', '<br><span id="caret-marker"></span>'));
             previewRef.current.innerHTML = newHtml;
             
             // Restore true scroll targeting FIRST so it doesn't overwrite our tracking
             parseState.scrollContainers.forEach(({ el, top, left }) => {
                 if (el === window) {
                     window.scrollTo(left, top);
                 } else {
                     (el as HTMLElement).scrollTop = top;
                     (el as HTMLElement).scrollLeft = left;
                 }
             });

             const markerEl = previewRef.current.querySelector('#caret-marker');
             if (markerEl) {
                 // Ensure the marker is in view for horizontal scrolling containers like tables
                 let scrollContainer = markerEl.parentElement;
                 while (scrollContainer && scrollContainer !== previewRef.current) {
                     if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                         const containerRect = scrollContainer.getBoundingClientRect();
                         const markerRect = markerEl.getBoundingClientRect();
                         if (markerRect.right > containerRect.right) {
                             scrollContainer.scrollLeft += (markerRect.right - containerRect.right) + 40;
                         } else if (markerRect.left < containerRect.left) {
                             scrollContainer.scrollLeft -= (containerRect.left - markerRect.left) + 40;
                         }
                     }
                     scrollContainer = scrollContainer.parentElement;
                 }

                 const newRange = document.createRange();
                 const parent = markerEl.parentNode;
                 
                 if (markerEl.previousSibling && markerEl.previousSibling.nodeType === Node.TEXT_NODE) {
                     const textNode = markerEl.previousSibling as Text;
                     markerEl.remove();
                     newRange.setStart(textNode, textNode.length);
                 } else if (parent) {
                     const offset = Array.from(parent.childNodes).indexOf(markerEl);
                     markerEl.remove();
                     newRange.setStart(parent, offset);
                 } else {
                     markerEl.remove();
                 }
                 newRange.collapse(true);
                 sel.removeAllRanges();
                 sel.addRange(newRange);
             }
             
             const finalHtml = previewRef.current.innerHTML;
             const finalMarkdown = turndownService.turndown(finalHtml);
             lastProcessedContent.current = finalMarkdown;
             handleContentChange(finalMarkdown);
             return;
        }
      }

      flushPreviewEdit();
    }, powerSaver ? 800 : 150);
  }, [flushPreviewEdit, isAutoMarkdownEnabled, turndownService, handleContentChange, powerSaver]);

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
      
      // Handle Mode
      if (isMode) {
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        const editor = previewRef.current;
        if (!editor || !editor.contains(target)) return;

        let didChange = false;

        // 1. Unwrap inline tags if we clicked inside one
        let current: HTMLElement | null = target;
        while (current && current !== editor) {
          const tag = current.tagName;
          const currentParent: HTMLElement | null = current.parentElement;
          if (!currentParent) break;

          if (/^(STRONG|B|EM|I|U|S|DEL|STRIKE|CODE|MARK|A|SPAN|SUB|SUP)$/i.test(tag)) {
            while (current.firstChild) {
              currentParent.insertBefore(current.firstChild, current);
            }
            currentParent.removeChild(current);
            didChange = true;
            current = currentParent; // continue up
            continue;
          }
          current = currentParent;
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
  }, [isMode, flushPreviewEdit]);

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

    // Check if we are inside a table cell
    const cell = target.closest('td, th') as HTMLElement | null;
    const table = cell?.closest('table');

    if (cell && table) {
      const maxRows = table.querySelectorAll('tr').length;
      const maxCols = table.querySelectorAll('tr')[0]?.children.length || 0;
      const indices = getCellIndices(cell);

      if (indices) {
        const { r, c } = indices;

        const getCellAt = (rowIdx: number, colIdx: number): HTMLElement | null => {
          const rows = table.querySelectorAll('tr');
          const targetRow = rows[rowIdx];
          if (targetRow) {
            return targetRow.children[colIdx] as HTMLElement;
          }
          return null;
        };

        if (e.key === 'ArrowUp') {
          const targetCell = getCellAt(r - 1, c);
          if (targetCell) {
            e.preventDefault();
            focusCell(targetCell, true);
            return;
          }
        } else if (e.key === 'ArrowDown') {
          const targetCell = getCellAt(r + 1, c);
          if (targetCell) {
            e.preventDefault();
            focusCell(targetCell, true);
            return;
          }
        } else if (e.key === 'ArrowLeft') {
          const sel = window.getSelection();
          const isAtStart = sel ? sel.anchorOffset === 0 : true;
          if (isAtStart || e.ctrlKey || e.metaKey) {
            const targetCell = c > 0 ? getCellAt(r, c - 1) : getCellAt(r - 1, maxCols - 1);
            if (targetCell) {
              e.preventDefault();
              focusCell(targetCell, true);
              return;
            }
          }
        } else if (e.key === 'ArrowRight') {
          const sel = window.getSelection();
          const isAtEnd = sel ? sel.anchorOffset === (sel.anchorNode?.textContent?.length || 0) : true;
          if (isAtEnd || e.ctrlKey || e.metaKey) {
            const targetCell = c < maxCols - 1 ? getCellAt(r, c + 1) : getCellAt(r + 1, 0);
            if (targetCell) {
              e.preventDefault();
              focusCell(targetCell, false);
              return;
            }
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          if (e.shiftKey) {
            const targetCell = c > 0 ? getCellAt(r, c - 1) : getCellAt(r - 1, maxCols - 1);
            if (targetCell) {
              focusCell(targetCell, true);
            }
          } else {
            if (r === maxRows - 1 && c === maxCols - 1) {
              const controller = getTableController(table);
              const result = controller.applyPatches([{
                patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
                type: PatchType.INSERT_ROW,
                timestamp: Date.now(),
                payload: { count: 1, at: r + 1 }
              }]);

              if (result.success) {
                renderDOMPatches(table, controller, result.domPatches, flushPreviewEdit);
                
                setTimeout(() => {
                  const addedCell = getCellAt(r + 1, 0);
                  if (addedCell) focusCell(addedCell, true);
                }, 50);
              }
            } else {
              const targetCell = c < maxCols - 1 ? getCellAt(r, c + 1) : getCellAt(r + 1, 0);
              if (targetCell) {
                focusCell(targetCell, true);
              }
            }
          }
          return;
        } else if (e.key === 'Home') {
          if (e.ctrlKey || e.metaKey) {
            const targetCell = getCellAt(r, 0);
            if (targetCell) {
              e.preventDefault();
              focusCell(targetCell, true);
              return;
            }
          }
        } else if (e.key === 'End') {
          if (e.ctrlKey || e.metaKey) {
            const targetCell = getCellAt(r, maxCols - 1);
            if (targetCell) {
              e.preventDefault();
              focusCell(targetCell, false);
              return;
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cell.blur();
          setActiveCell(null);
          return;
        }
      }
    }

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
          if (offset === 0) {
            targetToDelete = node.previousSibling;
          } else {
            targetToDelete = node.childNodes[offset - 1];
          }
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
            const markerNode = document.createElement('span');
            markerNode.id = 'caret-marker';
            markerNode.textContent = '\u200B';
            range.insertNode(markerNode);
            markerInserted = true;
        }

        const htmlWithMarker = previewRef.current.innerHTML;
        const mdWithMarker = turndownService.turndown(htmlWithMarker);
             
        let html = parseMarkdown(mdWithMarker);
        html = html.replace(CARET_MARKER, '<span id="caret-marker"></span>');
        html = html.replace(/<([a-z0-9]+)(?: [^>]*)?>\s*<span id="caret-marker"><\/span>\s*<\/\1>/gi, (match) => match.replace('<span id="caret-marker"></span>', '<br><span id="caret-marker"></span>'));
        previewRef.current.innerHTML = html;
        
        if (markerInserted) {
            const markerEl = previewRef.current.querySelector('#caret-marker');
            if (markerEl && sel) {
                 const newRange = document.createRange();
                 const parent = markerEl.parentNode;
                 if (markerEl.previousSibling && markerEl.previousSibling.nodeType === Node.TEXT_NODE) {
                     const textNode = markerEl.previousSibling as Text;
                     markerEl.remove();
                     newRange.setStart(textNode, textNode.length);
                 } else if (parent) {
                     const offset = Array.from(parent.childNodes).indexOf(markerEl);
                     markerEl.remove();
                     newRange.setStart(parent, offset);
                 } else {
                     markerEl.remove();
                 }
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

  const lastSelectionChangeTime = useRef<number>(0);
  const selectionChangeTicking = useRef<boolean>(false);
  const handleSelectionChange = useCallback(() => {
    if (!previewRef.current || isViewMode) return;
    
    if (selectionChangeTicking.current) return;
    selectionChangeTicking.current = true;

    requestAnimationFrame(() => {
      selectionChangeTicking.current = false;
      
      if (powerSaver) {
         const now = Date.now();
         if (now - lastSelectionChangeTime.current < 250) return;
         lastSelectionChangeTime.current = now;
      }

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
      // Don't clear if focus moved to the toolbar itself
      const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
      if (el && (el.closest('.table-floating-toolbar') || el.closest('[role="dialog"]'))) {
        return;
      }
      setActiveTableRow(null);
      setHoveredTable(null);
      return;
    }

    // Update active table row if we're inside a table
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    if (el) {
      const cell = el.closest('td, th');
      if (cell) {
        const indices = getCellIndices(cell as HTMLElement);
        if (indices) {
          setActiveCell({ r: indices.r, c: indices.c });
          setActiveTableRow(indices.tr as HTMLTableRowElement);
          if (hoveredTable !== indices.table) {
            setHoveredTable(indices.table);
            updateTableRect(indices.table);
          }
        }
      } else {
         // Optionally clear activeTableRow if we navigated out of the table entirely
         // Wait, if we hover over the table, it stays, but if we navigate out with keyboard...
         setActiveTableRow(null);
         setHoveredTable(null);
      }
    }

    // Typewriter mode logic, now permanently enabled
    if (sel.isCollapsed && previewRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const el = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as Element;
      
      const isHoveringSpecial = !!document.querySelector('.image-wrapper:hover, img:hover, .sketch-container:hover, .code-block-wrapper:hover, table:hover');
      const nodeAfter = range.startContainer.childNodes[range.startOffset];
      const isBeforeSpecial = nodeAfter && nodeAfter.nodeType === Node.ELEMENT_NODE && 
        (
          (nodeAfter as Element).tagName === 'IMG' || 
          (nodeAfter as Element).classList.contains('image-wrapper') ||
          (nodeAfter as Element).classList.contains('sketch-container') ||
          (nodeAfter as Element).classList.contains('code-block-wrapper') ||
          (nodeAfter as Element).tagName === 'TABLE'
        );
      const isInsideSpecial = el && (el.tagName === 'IMG' || el.closest('figure') || el.closest('.image-wrapper') || el.closest('.code-block-wrapper') || el.closest('.sketch-container') || el.closest('table'));

      // Do not auto-scroll if an image or special element was clicked/selected
      if (!(isInsideSpecial || isBeforeSpecial || isHoveringSpecial)) {
        try {
          if (!range || !range.getBoundingClientRect) return;
          let rect = range.getBoundingClientRect();
          
          if (rect.height === 0 || rect.width === 0) {
            const span = document.createElement('span');
            span.textContent = '\u200b';
            try {
              const cloneRange = range.cloneRange();
              cloneRange.insertNode(span);
              rect = span.getBoundingClientRect();
              span.remove();
            } catch {
              if (el) rect = el.getBoundingClientRect();
            }
          }
          
          if (rect.top === 0 && rect.bottom === 0) return;
          
          if (rect && rect.height >= 0) { // also allow height 0 when rect is otherwise valid
            const scrollParent = previewRef.current.closest('.overflow-y-auto') as HTMLElement;
            if (scrollParent) {
              const parentRect = scrollParent.getBoundingClientRect();
              const absoluteTop = rect.top + scrollParent.scrollTop - parentRect.top;
              const targetScrollTop = absoluteTop - (parentRect.height / 2) + (rect.height / 2);
              
              if (Math.abs(targetScrollTop - scrollParent.scrollTop) > 30) {
                scrollParent.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
              }
            }
          }
        } catch {
          // ignore error measuring rect
        }
      }
    }
    });
  }, [isViewMode, powerSaver, hoveredTable, updateTableRect]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

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
            if (offset === 0) {
              targetToDelete = node.previousSibling;
            } else {
              targetToDelete = node.childNodes[offset - 1];
            }
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
    const textData = e.clipboardData.getData('text/plain');
    const selNode = window.getSelection()?.anchorNode;
    const activeCellEl = (selNode instanceof Element ? selNode : selNode?.parentElement)?.closest('td, th') as HTMLElement | null;

    if (activeCellEl && textData && (textData.includes('\t') || textData.includes('\n'))) {
      e.preventDefault();
      const table = activeCellEl.closest('table');
      if (table) {
        const indices = getCellIndices(activeCellEl);
        if (indices) {
          const { r: startRow, c: startCol } = indices;
          const controller = getTableController(table);
          const result = controller.handlePaste(textData, startRow, startCol);
          if (result && result.success) {
            renderDOMPatches(table, controller, result.domPatches, () => flushPreviewEdit(true));
          }
          return;
        }
      }
    }

    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const file = e.clipboardData.files[i];
        if (file.type.indexOf('image/') === 0) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            document.execCommand('insertHTML', false, `<img src="${base64String}" alt="Pasted Image" style="max-width: 100%;" /><p>&#8203;</p>`);
            flushPreviewEdit(true);
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
         flushPreviewEdit(true);
         return;
      }

      e.preventDefault();
      
      const node = window.getSelection()?.anchorNode;
      const isInsideCodeBlock = (node instanceof Element ? node : node?.parentElement)?.closest('.code-block-wrapper');

      if (isInsideCodeBlock) {
          document.execCommand('insertText', false, text.replace(/\r\n/g, '\n'));
      } else if (isAutoMarkdownEnabled) {
          // Parse pasted text for all markdown, including tables
          const finalHtml = parseMarkdown(text);
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
              htmlText = `<span>${inner || '<br>'}</span>`;
          } else {
              htmlText = paragraphs.map(p => {
                  const inner = p
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/\r?\n/g, '<br>')
                      .replace(/ {2}/g, '&nbsp; ');
                  return `<p>${inner || '<br>'}</p>`;
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
        onDragStart={(e) => {
          if ((e.target as HTMLElement).tagName === 'IMG') {
            e.preventDefault();
          }
        }}
        className={cn(
          "prose prose-slate dark:prose-invert w-full min-w-0 max-w-full overflow-x-hidden print:overflow-visible break-words leading-relaxed prose-p:my-2 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-blockquote:my-4 prose-code:text-slate-800 dark:prose-code:text-slate-200 prose-code:bg-slate-100 dark:prose-code:bg-slate-800/80 prose-code:border prose-code:border-slate-200 dark:prose-code:border-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-[0.85em] prose-code:font-medium prose-code:shadow-[0_1px_2px_rgba(0,0,0,0.05)] prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl prose-table:border-collapse prose-table:w-full prose-table:m-0 prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted/50 prose-th:font-semibold prose-td:border prose-td:border-border prose-td:p-3 outline-none focus:ring-0 min-h-[500px] print:min-h-0 print:prose-pre:break-inside-avoid print:prose-table:break-inside-avoid print:prose-img:break-inside-avoid print:prose-code:break-inside-avoid print:prose-headings:break-after-avoid transition-[padding] duration-500",
          baseFontSize === 'text-sm' ? 'prose-sm' :
          baseFontSize === 'text-lg' ? 'prose-lg' :
          baseFontSize === 'text-xl' ? 'prose-xl' :
          'prose-base',
          "pt-0 pb-[60vh] print:py-0 print:block",
          isMode && "cursor-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23f43f5e\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21\"/><path d=\"M22 21H7\"/><path d=\"m5 11 9 9\"/></svg>'),_crosshair]"
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
               className={cn("absolute -top-3 h-3 cursor-s-resize z-20 group transition-colors print:hidden")}
               style={{ left: cr.left, width: cr.width, top: tableRect.top - 12 }}
               onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedColIndex(i); setSelectedRowIndex(null); }}
             >
               <div className="hidden group-hover:block mx-auto w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-transparent border-t-slate-600 dark:border-t-slate-400 mt-0.5" />
             </div>
           ))}
           {selectedColIndex !== null && colRects[selectedColIndex] && (
             <div 
                className="absolute bg-blue-500/10 pointer-events-none z-10 border-x border-blue-500/30 print:hidden"
                style={{ top: tableRect.top, left: colRects[selectedColIndex].left, width: colRects[selectedColIndex].width, height: tableRect.height }}
             />
           )}
           {rowRects.map((rr, i) => (
             <div 
               key={`row-${i}`}
               contentEditable={false}
               className={cn("absolute -left-3 w-3 cursor-e-resize z-20 group transition-colors flex items-center print:hidden")}
               style={{ top: rr.top, height: rr.height, left: tableRect.left - 12 }}
               onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
               onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedRowIndex(i); setSelectedColIndex(null); }}
             >
               <div className="hidden group-hover:block ml-0.5 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[5px] border-transparent border-l-slate-600 dark:border-l-slate-400" />
             </div>
           ))}
           {selectedRowIndex !== null && rowRects[selectedRowIndex] && (
             <div 
                className="absolute bg-blue-500/10 pointer-events-none z-10 border-y border-blue-500/30 print:hidden"
                style={{ left: tableRect.left, top: rowRects[selectedRowIndex].top, height: rowRects[selectedRowIndex].height, width: tableRect.width }}
             />
           )}
         </>
      )}
      {!isViewMode && hoveredTable && tableRect && (
        <>
          {/* Left formatting icon */}
          <div 
            className="table-floating-toolbar absolute z-30 flex items-center justify-center print:hidden"
            style={(() => {
              let activeRowIdx = null;
              if (activeTableRow && hoveredTable && hoveredTable.contains(activeTableRow)) {
                activeRowIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
              }
              if (activeRowIdx === null || activeRowIdx < 0) {
                activeRowIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
              }
              if (activeRowIdx === null || activeRowIdx < 0) activeRowIdx = 0;
              
              const activeRowTop = (rowRects[activeRowIdx] && rowRects[activeRowIdx].top) ?? tableRect.top;
              const activeRowHeight = (rowRects[activeRowIdx] && rowRects[activeRowIdx].height) ?? 40;
              const topPosition = activeRowTop + (activeRowHeight / 2) - 14;
              const leftPosition = tableRect.left + 6;
              
              return {
                top: topPosition,
                left: leftPosition};
            })()}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button 
              onClick={(e) => { e.preventDefault(); setIsTableEditDialogOpen(true); }}
              className="p-1.5 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-md transition-colors bg-background/95 backdrop-blur-sm border border-border shadow-[0_2px_10px_rgba(0,0,0,0.05)] cursor-pointer"
              style={{ marginLeft: '-20px' }}
              title="Table Styling & Settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Right delete icon */}
          <div 
            className="table-floating-toolbar absolute z-30 flex items-center justify-center print:hidden"
            style={(() => {
              let activeRowIdx = null;
              if (activeTableRow && hoveredTable && hoveredTable.contains(activeTableRow)) {
                activeRowIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
              }
              if (activeRowIdx === null || activeRowIdx < 0) {
                activeRowIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
              }
              if (activeRowIdx === null || activeRowIdx < 0) activeRowIdx = 0;
              
              const activeRowTop = (rowRects[activeRowIdx] && rowRects[activeRowIdx].top) ?? tableRect.top;
              const activeRowHeight = (rowRects[activeRowIdx] && rowRects[activeRowIdx].height) ?? 40;
              const topPosition = activeRowTop + (activeRowHeight / 2) - 14;
              
              const leftPosition = tableRect.left + tableRect.width - 34;
              
              return {
                top: topPosition,
                left: leftPosition};
            })()}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <button 
              onClick={(e) => { 
                e.preventDefault(); 
                setDeletePromptInfo({ isOpen: true, targetRow: activeTableRow, targetTable: hoveredTable });
              }}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors bg-background/95 backdrop-blur-sm border border-border shadow-[0_2px_10px_rgba(0,0,0,0.05)] cursor-pointer"
              style={{ marginLeft: '20px' }}
              title="Delete Row or Table"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}


      <Suspense fallback={null}>
        <TableEditDialog 
          isOpen={isTableEditDialogOpen}
          onClose={() => setIsTableEditDialogOpen(false)}
          table={hoveredTable}
          onConfirm={handleTableEditConfirm}
        />
      </Suspense>
      {!isViewMode && hoveredSketch && sketchRect && (
        <div 
          className="sketch-floating-toolbar absolute z-50 flex items-center bg-background border border-border shadow-md rounded-lg overflow-hidden print:hidden animate-in fade-in zoom-in-95 duration-200"
          style={(() => {
            const parentRect = previewRef.current?.parentElement?.getBoundingClientRect();
            let topPosition = sketchRect.top - 46;
            let leftPosition = sketchRect.left;
            
            if (parentRect) {
              let minTop = 0;
              if (parentRect.top < 0) {
                minTop = -parentRect.top + 10;
              }
              if (topPosition < minTop) {
                topPosition = minTop;
              }
              
              const scrollLeft = previewRef.current?.parentElement?.scrollLeft || 0;
              const viewportWidth = parentRect.width;
              const maxLeft = scrollLeft + viewportWidth - 120 - 16;
              if (leftPosition > maxLeft) {
                leftPosition = Math.max(scrollLeft, maxLeft);
              }
              if (leftPosition < scrollLeft) {
                leftPosition = scrollLeft;
              }
            }
            
            return {
              top: Math.max(0, topPosition),
              left: Math.max(0, leftPosition)};
          })()}
        >
          <button 
            className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Edit Sketch"
            onClick={() => setIsSketchEditDialogOpen(true)}
          >
            <PenTool className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border" />
          <button 
            className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete Sketch"
            onClick={() => {
              if (hoveredSketch && previewRef.current) {
                hoveredSketch.remove();
                setHoveredSketch(null);
                flushPreviewEdit(true);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      {!isViewMode && hoveredImage && imageRect && (
        <>
          <div 
            className="image-floating-toolbar absolute z-50 flex items-center justify-center print:hidden"
            style={(() => {
              const parentRect = previewRef.current?.parentElement?.getBoundingClientRect();
              let topPosition = imageRect.top - 36;
              let leftPosition = imageRect.left;
              
              if (parentRect) {
                let minTop = 0;
                if (parentRect.top < 0) {
                  minTop = -parentRect.top + 10;
                }
                if (topPosition < minTop) {
                  topPosition = minTop;
                }
                
                const scrollLeft = previewRef.current?.parentElement?.scrollLeft || 0;
                const viewportWidth = parentRect.width;
                const maxLeft = scrollLeft + viewportWidth - 80 - 16;
                if (leftPosition > maxLeft) {
                  leftPosition = Math.max(scrollLeft, maxLeft);
                }
                if (leftPosition < scrollLeft) {
                  leftPosition = scrollLeft;
                }
              }
              return {
                top: Math.max(0, topPosition),
                left: Math.max(0, leftPosition)};
            })()}
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
            className="image-floating-toolbar absolute z-50 flex items-center justify-center gap-1 print:hidden"
            style={(() => {
              const parentRect = previewRef.current?.parentElement?.getBoundingClientRect();
              let topPosition = imageRect.top - 36;
              let leftPosition = imageRect.left + 36;
              
              if (parentRect) {
                let minTop = 0;
                if (parentRect.top < 0) {
                  minTop = -parentRect.top + 10;
                }
                if (topPosition < minTop) {
                  topPosition = minTop;
                }
                
                const scrollLeft = previewRef.current?.parentElement?.scrollLeft || 0;
                const viewportWidth = parentRect.width;
                const maxLeft = scrollLeft + viewportWidth - 44 - 16;
                if (leftPosition > maxLeft) {
                  leftPosition = Math.max(scrollLeft, maxLeft);
                }
                if (leftPosition < scrollLeft + 36) {
                  leftPosition = scrollLeft + 36;
                }
              }
              return {
                top: Math.max(0, topPosition),
                left: Math.max(0, leftPosition)};
            })()}
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
          className="link-floating-toolbar absolute z-50 flex items-center justify-center gap-1 print:hidden"
          style={(() => {
            const parentRect = previewRef.current?.parentElement?.getBoundingClientRect();
            let topPosition = linkRect.top - 36;
            let leftPosition = linkRect.left;
            
            if (parentRect) {
              let minTop = 0;
              if (parentRect.top < 0) {
                minTop = -parentRect.top + 10;
              }
              if (topPosition < minTop) {
                topPosition = minTop;
              }
              
              const scrollLeft = previewRef.current?.parentElement?.scrollLeft || 0;
              const viewportWidth = parentRect.width;
              const toolbarWidth = 240;
              const maxLeft = scrollLeft + viewportWidth - toolbarWidth - 16;
              if (leftPosition > maxLeft) {
                leftPosition = Math.max(scrollLeft, maxLeft);
              }
              if (leftPosition < scrollLeft) {
                leftPosition = scrollLeft;
              }
            }
            return {
              top: Math.max(0, topPosition),
              left: Math.max(0, leftPosition)};
          })()}
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
      
      <Suspense fallback={null}>
        <ImageEditDialog
          isOpen={isImageEditDialogOpen}
          onClose={() => setIsImageEditDialogOpen(false)}
          image={hoveredImage}
          onConfirm={handleImageEditConfirm}
        />
      </Suspense>
      
      {isSketchEditDialogOpen && hoveredSketch && (
        <React.Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"><span className="flex flex-col items-center gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin text-primary" /> Loading Sketch...</span></div>}>
          <SketchDialog
            isOpen={isSketchEditDialogOpen}
            onClose={() => setIsSketchEditDialogOpen(false)}
            initialStateString={hoveredSketch.getAttribute('data-excalidraw') || undefined}
            onSave={(svgString, stateString) => {
              const el = hoveredSketch as unknown as HTMLElement;
              
              el.innerHTML = svgString;
              if (stateString) {
                el.setAttribute('data-excalidraw', stateString);
              }
              setIsSketchEditDialogOpen(false);
              flushPreviewEdit(true);
            }}
          />
        </React.Suspense>
      )}

      <Dialog open={deletePromptInfo.isOpen} onOpenChange={(open) => !open && setDeletePromptInfo({ isOpen: false, targetRow: null, targetTable: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Element</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div
              className={cn(
                "flex flex-col items-start p-4 border rounded-xl cursor-pointer transition-all duration-200",
                deletePromptOption === 'row' 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              onClick={() => setDeletePromptOption('row')}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-medium text-sm">Delete current row</span>
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                  deletePromptOption === 'row' ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                )}>
                  {deletePromptOption === 'row' && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pr-6">Removes only the currently selected row and keeps the rest of the table intact.</p>
            </div>
            
            <div
              className={cn(
                "flex flex-col items-start p-4 border rounded-xl cursor-pointer transition-all duration-200",
                deletePromptOption === 'table' 
                  ? "border-destructive bg-destructive/10 ring-1 ring-destructive/30" 
                  : "border-border hover:border-destructive/30 hover:bg-destructive/5"
              )}
              onClick={() => setDeletePromptOption('table')}
            >
              <div className="flex justify-between items-center w-full">
                <span className={cn("font-medium text-sm", deletePromptOption === 'table' ? "text-destructive" : "")}>Delete entire table</span>
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                  deletePromptOption === 'table' ? "border-destructive bg-destructive" : "border-muted-foreground/30 bg-background"
                )}>
                  {deletePromptOption === 'table' && <div className="w-1.5 h-1.5 rounded-full bg-destructive-foreground" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 pr-6">Permanently removes the entire table and all data inside it.</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDeletePromptInfo({ isOpen: false, targetRow: null, targetTable: null })}>Cancel</Button>
            <Button variant={deletePromptOption === 'table' ? "destructive" : "default"} onClick={() => {
              const { targetRow, targetTable } = deletePromptInfo;
              if (deletePromptOption === 'table') {
                if (targetTable) {
                  const wrapper = targetTable.closest('.table-wrapper');
                  if (wrapper) wrapper.remove();
                  else targetTable.remove();
                  setHoveredTable(null);
                }
              } else if (deletePromptOption === 'row') {
                if (targetRow) {
                  const table = targetRow.closest('table');
                  targetRow.remove();
                  if (table && table.querySelectorAll('tr').length === 0) {
                     const wrapper = table.closest('.table-wrapper');
                     if (wrapper) wrapper.remove();
                     else table.remove();
                     setHoveredTable(null);
                  }
                }
              }
              flushPreviewEdit(true);
              setActiveTableRow(null);
              setDeletePromptInfo({ isOpen: false, targetRow: null, targetTable: null });
            }}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
