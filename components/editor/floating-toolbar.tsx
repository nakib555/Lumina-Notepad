import { useState, useRef, useEffect } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Quote, Code, Terminal, Link, Image, Minus, Table, List, ListOrdered, ListTodo,
  Heading1, Heading2, Heading3, Sigma, MousePointer2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Scissors, Copy, ClipboardPaste, X, Eraser,
  AlignLeft, AlignCenter, AlignRight, Wand2, Bookmark, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp, CornerDownRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { useDraggable } from "./use-draggable";

interface FloatingToolbarProps {
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  applyFontSize: (size: string) => void;
  isEraserMode?: boolean;
  setIsEraserMode?: (isEraserMode: boolean) => void;
  applyFormatting: (prefix: string, suffix?: string, toggle?: boolean) => void;
  onToggleSymbolMenu: () => void;
  onInsertImageClick: () => void;
  onInsertLinkClick: () => void;
  textareaRef: React.RefObject<HTMLDivElement | null>;
  isAutoMarkdownEnabled: boolean;
  setIsAutoMarkdownEnabled: (enabled: boolean) => void;
  showSymbolMenu: boolean;
  setShowSymbolMenu: (show: boolean) => void;
}

const getSearchRanges = (container: HTMLElement, query: string): Range[] => {
  if (!query) return [];
  const ranges: Range[] = [];
  const lowerQuery = query.toLowerCase();
  
  const textNodes: { node: Text; start: number; end: number }[] = [];
  let content = '';
  
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
  
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue || '';
      if (text) {
        const start = content.length;
        content += text;
        textNodes.push({ node: node as Text, start, end: content.length });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR' || el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'LI') {
          if (content.length > 0 && !content.endsWith('\n') && !content.endsWith(' ')) {
              content += '\n';
          }
      }
    }
  }

  const searchStr = lowerQuery;

  let matchOp = content.toLowerCase().indexOf(searchStr, 0);
  while (matchOp !== -1) {
    const matchStart = matchOp;
    const matchEnd = matchOp + searchStr.length;
    
    const startNodeItem = textNodes.find(n => matchStart >= n.start && matchStart < n.end);
    let endNodeItem = textNodes.find(n => matchEnd > n.start && matchEnd <= n.end);
    
    if (!endNodeItem) {
        endNodeItem = textNodes.find(n => matchEnd >= n.start && matchEnd <= n.end);
    }

    if (startNodeItem && endNodeItem) {
      try {
        const range = document.createRange();
        range.setStart(startNodeItem.node, matchStart - startNodeItem.start);
        range.setEnd(endNodeItem.node, matchEnd - endNodeItem.start);
        ranges.push(range);
      } catch {
        // ignore invalid ranges
      }
    }
    
    matchOp = content.toLowerCase().indexOf(searchStr, matchOp + searchStr.length);
  }
  
  return ranges;
};

export const FloatingToolbar = ({
  toolbarRef,
  isDragging,
  handleMouseDown,
  handleMouseLeave,
  handleMouseUp,
  handleMouseMove,
  fontFamily,
  onFontFamilyChange,
  applyFontSize,
  isEraserMode,
  setIsEraserMode,
  applyFormatting,
  onToggleSymbolMenu,
  onInsertImageClick,
  onInsertLinkClick,
  textareaRef,
  isAutoMarkdownEnabled,
  setIsAutoMarkdownEnabled,
  showSymbolMenu,
  setShowSymbolMenu
}: FloatingToolbarProps) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === textareaRef.current || textareaRef.current?.contains(document.activeElement)) {
        try {
          setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strikethrough: document.queryCommandState('strikeThrough'),
            subscript: document.queryCommandState('subscript'),
            superscript: document.queryCommandState('superscript'),
          });
        } catch {
           // ignore errors in unsupported browsers
        }
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [textareaRef]);

  const [matchCount, setMatchCount] = useState(0);

  const handleApplyFormatting = (prefix: string, suffix?: string, toggle?: boolean) => {
    restoreSelection();
    applyFormatting(prefix, suffix, toggle);
  };

  useEffect(() => {
    if (isSearchOpen) {
      document.body.classList.add('search-is-active');
    } else {
      document.body.classList.remove('search-is-active');
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const computeHighlights = () => {
      if (!searchQuery) {
        setMatchCount(0);
        if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (CSS as any).highlights.delete('search-results');
        }
        return;
      }
      
      const text = el.innerText || "";
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = text.match(new RegExp(escapedQuery, 'gi'));
      setMatchCount(matches ? matches.length : 0);
      
      if (isSearchOpen && typeof CSS !== 'undefined' && 'highlights' in CSS) {
        try {
          const ranges = getSearchRanges(el, searchQuery);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const highlight = new (window as any).Highlight(...ranges);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (CSS as any).highlights.set('search-results', highlight);
        } catch {
          // ignore if Highlights API throws
        }
      } else if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (CSS as any).highlights.delete('search-results');
      }
    };

    // Run initially
    computeHighlights();
    
    // Listen to changes
    el.addEventListener('input', computeHighlights);
    
    return () => {
      el.removeEventListener('input', computeHighlights);
      if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
        // Cleanup happens on effect disposal or search closed
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (CSS as any).highlights.delete('search-results');
      }
    };
  }, [searchQuery, textareaRef, isSearchOpen]);

  const handleSearch = (forward: boolean = true) => {
    if (!searchQuery || !textareaRef.current) return;
    ensureFocus();
    
    const ranges = getSearchRanges(textareaRef.current, searchQuery);
    if (ranges.length === 0) {
      toast.error("Text not found in editor");
      return;
    }

    const sel = window.getSelection();
    let currentActiveIdx = -1;
    
    if (sel && sel.rangeCount > 0) {
      const selRange = sel.getRangeAt(0);
      for (let i = 0; i < ranges.length; i++) {
        const cmp = ranges[i].compareBoundaryPoints(Range.START_TO_START, selRange);
        if (cmp === 0) {
          currentActiveIdx = i;
          break;
        }
      }
    }

    let nextIdx = 0;
    if (currentActiveIdx !== -1) {
      nextIdx = forward ? (currentActiveIdx + 1) : (currentActiveIdx - 1);
      if (nextIdx >= ranges.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = ranges.length - 1;
    } else {
        if (sel && sel.rangeCount > 0) {
            const selRange = sel.getRangeAt(0);
            if (forward) {
                const closestNext = ranges.find(r => r.compareBoundaryPoints(Range.START_TO_START, selRange) > 0);
                nextIdx = closestNext ? ranges.indexOf(closestNext) : 0;
            } else {
                const beforeRanges = ranges.filter(r => r.compareBoundaryPoints(Range.START_TO_START, selRange) < 0);
                nextIdx = beforeRanges.length > 0 ? ranges.indexOf(beforeRanges[beforeRanges.length - 1]) : ranges.length - 1;
            }
        }
    }

    const targetRange = ranges[nextIdx];
    
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(targetRange);
      setTimeout(() => scrollToSelection(true), 10);
    }
  };

  const handleReplace = () => {
    if (!searchQuery || !textareaRef.current) return;
    ensureFocus();
    const sel = window.getSelection();
    
    if (sel && sel.rangeCount > 0) {
      const selRange = sel.getRangeAt(0);
      const ranges = getSearchRanges(textareaRef.current, searchQuery);
      let isMatch = false;
      for (const range of ranges) {
          if (range.compareBoundaryPoints(Range.START_TO_START, selRange) === 0 &&
              range.compareBoundaryPoints(Range.END_TO_END, selRange) === 0) {
              isMatch = true;
              break;
          }
      }
      
      if (isMatch) {
          document.execCommand('insertText', false, replaceQuery);
          handleSearch(true);
          return;
      }
    }
    
    handleSearch(true);
  };

  const handleReplaceAll = () => {
    if (!searchQuery || !textareaRef.current) return;
    ensureFocus();
    
    let count = 0;
    const maxLoops = 5000;
    const sel = window.getSelection();
    
    while (count < maxLoops) {
      const ranges = getSearchRanges(textareaRef.current, searchQuery);
      if (ranges.length === 0) break;
      
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(ranges[0]);
        document.execCommand('insertText', false, replaceQuery);
        count++;
      } else {
        break;
      }
    }
    
    if (count > 0) {
      toast.success(`Replaced ${count} occurrences`);
    } else {
      toast.error("Text not found in editor");
    }
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);
  
  const selectionToolbarRef = useRef<HTMLDivElement>(null);
  const {
    isDragging: isSelectionDragging,
    handleMouseDown: handleSelectionMouseDown,
    handleMouseLeave: handleSelectionMouseLeave,
    handleMouseUp: handleSelectionMouseUp,
    handleMouseMove: handleSelectionMouseMove
  } = useDraggable(selectionToolbarRef);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    ensureFocus();
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRangeRef.current);
    }
  };

  const scrollToSelection = (forceCenter: boolean = false) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    let rect = range.getBoundingClientRect();
    
    if (rect.width === 0 && rect.height === 0) {
      const span = document.createElement('span');
      span.textContent = '\u200b';
      range.insertNode(span);
      rect = span.getBoundingClientRect();
      if (span.parentNode) span.parentNode.removeChild(span);
    }
    
    if (rect.top === 0 && rect.bottom === 0) return;
    
    const scrollContainer = textareaRef.current?.closest('.overflow-y-auto') as HTMLElement;
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      if (forceCenter || rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        const cursorY = rect.top + (rect.height / 2) - containerRect.top;
        const targetY = containerRect.height / 2;
        scrollContainer.scrollBy({
          top: cursorY - targetY,
          behavior: 'smooth'
        });
      }
    }
  };

  const ensureFocus = () => {
    if (textareaRef?.current && document.activeElement !== textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const moveCursor = (direction: 'left' | 'right' | 'up' | 'down' | 'word-left' | 'word-right') => {
    ensureFocus();
    const selection = window.getSelection();
    if (!selection) return;
    
    const modifyStr = isSelecting ? 'extend' : 'move';
    let dirStr = 'forward';
    let granularity = 'character';
    
    if (direction === 'left') dirStr = 'backward';
    else if (direction === 'right') dirStr = 'forward';
    else if (direction === 'up') { dirStr = 'backward'; granularity = 'line'; }
    else if (direction === 'down') { dirStr = 'forward'; granularity = 'line'; }
    else if (direction === 'word-left') { dirStr = 'backward'; granularity = 'word'; }
    else if (direction === 'word-right') { dirStr = 'forward'; granularity = 'word'; }
    
    // modify is non-standard but works in many browsers
    if ('modify' in selection && typeof selection.modify === 'function') {
      selection.modify(modifyStr, dirStr, granularity);
      setTimeout(scrollToSelection, 10);
    }
  };

  const handleSelectAll = () => {
    ensureFocus();
    document.execCommand('selectAll');
    setIsSelecting(true);
  };

  const handleCut = async () => {
    ensureFocus();
    try {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const textToCut = selection.toString();
        
        if (Capacitor.isNativePlatform()) {
          await Clipboard.write({ string: textToCut });
          document.execCommand('delete');
          return;
        }
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textToCut);
            document.execCommand('delete');
            return;
          } catch (clipboardError) {
            console.warn('Clipboard API failed, falling back to execCommand', clipboardError);
          }
        }
        
        const success = document.execCommand('cut');
        if (!success) {
          toast.error("Your browser's security settings prevent cutting via this button. Please use Ctrl+X (or Cmd+X).");
        }
      }
    } catch (err) {
      console.error('Cut failed', err);
      toast.error("Your browser's security settings prevent cutting via this button. Please use Ctrl+X (or Cmd+X).");
    }
  };

  const handleCopy = async () => {
    ensureFocus();
    try {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const textToCopy = selection.toString();
        
        if (Capacitor.isNativePlatform()) {
          await Clipboard.write({ string: textToCopy });
          toast.success("Copied to clipboard");
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textToCopy);
            toast.success("Copied to clipboard");
            return;
          } catch (clipboardError) {
            console.warn('Clipboard API failed, falling back to execCommand', clipboardError);
          }
        }
        
        const success = document.execCommand('copy');
        if (!success) {
          toast.error("Your browser's security settings prevent copying via this button. Please use Ctrl+C (or Cmd+C).");
        } else {
          toast.success("Copied to clipboard");
        }
      }
    } catch (err) {
      console.error('Copy failed', err);
      toast.error("Your browser's security settings prevent copying via this button. Please use Ctrl+C (or Cmd+C).");
    }
  };

  const handlePaste = async () => {
    ensureFocus();
    try {
      if (Capacitor.isNativePlatform()) {
        const { type, value } = await Clipboard.read();
        if (type === 'text/plain' && value) {
          document.execCommand('insertText', false, value);
          setTimeout(scrollToSelection, 10);
          return;
        }
      }

      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          document.execCommand('insertText', false, text);
          setTimeout(scrollToSelection, 10);
          return;
        } catch (clipboardError) {
          console.warn('Clipboard API failed, falling back to execCommand', clipboardError);
        }
      }
      
      // Fallback
      const success = document.execCommand('paste');
      if (!success) {
        toast.error("Your browser's security settings prevent pasting via this button. Please use Ctrl+V (or Cmd+V) to paste.");
      } else {
        setTimeout(scrollToSelection, 10);
      }
    } catch (err) {
      console.error('Failed to paste text: ', err);
      toast.error("Your browser's security settings prevent pasting via this button. Please use Ctrl+V (or Cmd+V) to paste.");
    }
  };

  const handleAddBookmark = () => {
    restoreSelection();
    const id = `mark-${Date.now()}`;
    document.execCommand('insertHTML', false, `<span class="bookmark-marker" data-bookmark-id="${id}" style="display:inline-block; border-radius:4px; margin:0 2px; cursor:pointer;" title="Bookmark" contenteditable="false">&#128278;</span>&#8203;`);
    if (textareaRef.current) {
        textareaRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
    toast.success("Bookmark added!");
  };

  const jumpToMark = (direction: 'next' | 'prev') => {
    if (!textareaRef.current) {
      toast.error("Editor not found");
      return;
    }
    const marks = Array.from(textareaRef.current.querySelectorAll('.bookmark-marker'));
    if (marks.length === 0) {
      toast.info("No bookmarks found in this document");
      return;
    }

    let currentIndex = -1;
    const selection = window.getSelection();
    let localRange = null;
    
    if (selection && selection.rangeCount > 0 && textareaRef.current?.contains(selection.anchorNode)) {
      localRange = selection.getRangeAt(0);
    } else if (savedRangeRef.current) {
      localRange = savedRangeRef.current;
    }

    if (localRange) {
      const userRange = localRange;

      if (direction === 'next') {
        const foundIndex = marks.findIndex((mark) => {
          const markRange = document.createRange();
          markRange.selectNode(mark);
          return userRange.compareBoundaryPoints(Range.END_TO_START, markRange) < 0;
        });
        currentIndex = foundIndex !== -1 ? foundIndex : 0;
      } else {
        for (let i = marks.length - 1; i >= 0; i--) {
          const markRange = document.createRange();
          markRange.selectNode(marks[i]);
          if (userRange.compareBoundaryPoints(Range.START_TO_END, markRange) > 0) {
            currentIndex = i;
            break;
          }
        }
        if (currentIndex === -1) currentIndex = marks.length - 1;
      }
    } else {
      currentIndex = direction === 'next' ? 0 : marks.length - 1;
    }
    
    // Smooth scroll and focus
    const targetMark = marks[currentIndex] as HTMLElement;
    targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Give time for scroll to settle, then set focus
    setTimeout(() => {
        const range = document.createRange();
        range.setStartAfter(targetMark);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, 50);
    
    toast.success(`Jumped to bookmark ${currentIndex + 1} of ${marks.length}`);
  };

  return (
    <>
      {isSelectionMode && (
        <div 
          ref={selectionToolbarRef}
          onMouseDown={handleSelectionMouseDown}
          onMouseLeave={handleSelectionMouseLeave}
          onMouseUp={handleSelectionMouseUp}
          onMouseMove={handleSelectionMouseMove}
          className={cn(
            "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-border rounded-2xl py-1.5 px-2 z-50 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[88vw] md:max-w-[700px] flex-nowrap select-none touch-pan-x",
            isSelectionDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <div className="flex items-center gap-0.5 pr-1 border-r border-border">
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => setIsSelecting(!isSelecting)}
              className={cn(
                "h-8 w-8 rounded-lg shrink-0 transition-colors",
                isSelecting 
                  ? "text-blue-600 bg-blue-500/20 dark:text-blue-400 dark:bg-blue-500/30" 
                  : "text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              )}
              title={isSelecting ? "Stop Selecting" : "Start Selecting"}
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('left')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Left"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('word-left')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Word Left"
            >
              <div className="flex items-center justify-center">
                <span className="text-[10px] font-bold mr-[1px]">W</span>
                <ArrowLeft className="w-3 h-3" />
              </div>
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('up')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Up"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('down')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Down"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('word-right')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Word Right"
            >
              <div className="flex items-center justify-center">
                <ArrowRight className="w-3 h-3" />
                <span className="text-[10px] font-bold ml-[1px]">W</span>
              </div>
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => moveCursor('right')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Right"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="sm"
          onClick={handleSelectAll}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Select All"
            >
              All
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={handleCut}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Cut"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={handleCopy}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={handlePaste}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Paste"
            >
              <ClipboardPaste className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5 pl-1">
            <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
              size="icon"
          onClick={() => {
                setIsSelectionMode(false);
                setIsSelecting(false);
              }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div 
        ref={toolbarRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex items-center gap-1 bg-background/90 backdrop-blur-md border border-border rounded-2xl py-1.5 px-2 overflow-x-auto no-scrollbar max-w-[88vw] md:max-w-[700px] flex-nowrap select-none touch-pan-x min-h-[44px] transition-[width,height,padding,background-color,max-width,min-width] duration-300 ease-in-out",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {isSearchOpen ? (
          <div className="flex flex-col w-full min-w-[280px] sm:min-w-[340px] px-1 py-0.5 animate-in fade-in zoom-in-[0.98] duration-200">
             {/* Search Row */}
             <div className="flex items-center w-full shrink-0 h-8">
               <Search className="w-4 h-4 text-muted-foreground/80 ml-1.5 shrink-0" />
               <input
                 ref={searchInputRef}
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     handleSearch(!e.shiftKey);
                   } else if (e.key === 'Escape') {
                     setIsSearchOpen(false);
                   }
                 }}
                 placeholder="Find text..."
                 autoComplete="off"
                 className="flex-1 bg-transparent border-none outline-none text-sm px-2.5 min-w-[80px] placeholder:text-muted-foreground/60 focus:ring-0 text-foreground"
                 onMouseDown={(e) => e.stopPropagation()}
               />
               <span className="text-[10px] font-medium text-muted-foreground/70 mr-2 shrink-0 select-none hidden sm:inline-block">
                 {searchQuery ? `${matchCount} found` : ''}
               </span>
               <div className="flex items-center shrink-0 pr-1">
                 <button onClick={() => handleSearch(false)} className="p-1 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-200" title="Previous (Shift+Enter)">
                   <ChevronUp className="w-4 h-4" />
                 </button>
                 <button onClick={() => handleSearch(true)} className="p-1 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all duration-200" title="Next (Enter)">
                   <ChevronDown className="w-4 h-4" />
                 </button>
                 <div className="w-[1px] h-3.5 bg-border/60 mx-1" />
                 <button onClick={() => setIsSearchOpen(false)} className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all duration-200">
                   <X className="w-4 h-4" />
                 </button>
               </div>
             </div>
             
             {/* Divider */}
             <div className="w-full h-[1px] bg-border/50 my-1" />
             
             {/* Replace Row */}
             <div className="flex items-center w-full shrink-0 h-8 mb-0.5">
               <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground/50 ml-1.5 shrink-0" />
               <input
                 type="text"
                 value={replaceQuery}
                 onChange={(e) => setReplaceQuery(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     if (e.shiftKey) handleReplaceAll();
                     else handleReplace();
                   } else if (e.key === 'Escape') {
                     setIsSearchOpen(false);
                   }
                 }}
                 placeholder="Replace with..."
                 autoComplete="off"
                 className="flex-1 bg-transparent border-none outline-none text-sm px-2.5 min-w-[80px] text-foreground placeholder:text-muted-foreground/60 focus:ring-0"
                 onMouseDown={(e) => e.stopPropagation()}
               />
               <div className="flex items-center gap-1.5 shrink-0 pr-2">
                 <button 
                   onClick={handleReplace} 
                   className="h-6 px-3 text-[11px] font-medium bg-background border border-border/80 text-foreground hover:bg-muted active:scale-95 rounded text-center shadow-sm transition-all duration-200"
                   title="Replace"
                 >
                   Replace
                 </button>
                 <button 
                   onClick={handleReplaceAll} 
                   className="h-6 px-3 text-[11px] font-medium bg-background border border-border/80 text-foreground hover:bg-muted active:scale-95 rounded text-center shadow-sm transition-all duration-200"
                   title="Replace All"
                 >
                   All
                 </button>
               </div>
             </div>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 animate-in fade-in zoom-in-[0.98] duration-200">
            {/* Selection Mode Toggle */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-border">
              <Button
                onPointerDown={(e) => e.preventDefault()}
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newMode = !isSelectionMode;
                  setIsSelectionMode(newMode);
                  if (newMode) {
                    setShowSymbolMenu(false);
                  }
                }}
                className={cn(
                  "h-8 w-8 rounded-lg shrink-0 transition-colors",
                  isSelectionMode
                    ? "text-blue-600 bg-blue-500/20 dark:text-blue-400 dark:bg-blue-500/30"
                    : "text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                )}
                title="Selection Mode"
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                onPointerDown={(e) => e.preventDefault()}
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0 transition-colors"
                title="Find in document"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>

      {/* Font Style & Size Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <select
          value={fontFamily}
          onMouseDown={saveSelection}
          onChange={(e) => {
            restoreSelection();
            onFontFamilyChange(e.target.value);
          }}
          className="h-8 px-1 sm:px-2 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg outline-none text-xs font-medium cursor-pointer shrink-0 focus:ring-2 focus:ring-primary"
          title="Font Style"
          aria-label="Font Style"
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
        <select
          onMouseDown={saveSelection}
          onChange={(e) => {
            if (e.target.value) {
              restoreSelection();
              applyFontSize(e.target.value);
              e.target.value = ""; // reset
            }
          }}
          defaultValue=""
          className="h-8 px-1 sm:px-2 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg outline-none text-xs font-medium cursor-pointer shrink-0 focus:ring-2 focus:ring-primary"
          title="Font Size"
          aria-label="Font Size"
        >
          <option value="" disabled>Size</option>
          {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      {/* Text Style Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting('<div align="left">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting('<div align="center">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting('<div align="right">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("**", "**")}
          className={cn(
            "h-8 w-8 text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0",
            activeFormats.bold && "bg-blue-500/20 dark:bg-blue-500/30"
          )}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("*", "*")}
          className={cn(
            "h-8 w-8 text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg shrink-0",
             activeFormats.italic && "bg-amber-500/20 dark:bg-amber-500/30"
          )}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("<u>", "</u>")}
          className={cn(
            "h-8 w-8 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg shrink-0",
            activeFormats.underline && "bg-emerald-500/20 dark:bg-emerald-500/30"
          )}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("~~", "~~")}
          className={cn(
            "h-8 w-8 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0",
            activeFormats.strikethrough && "bg-rose-500/20 dark:bg-rose-500/30"
          )}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("<sub>", "</sub>")}
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0",
            activeFormats.subscript && "bg-muted text-foreground"
          )}
          title="Subscript"
        >
          <Subscript className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("<sup>", "</sup>")}
          className={cn(
            "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0",
            activeFormats.superscript && "bg-muted text-foreground"
          )}
          title="Superscript"
        >
          <Superscript className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant={isEraserMode ? "default" : "ghost"}
          size="icon"
          onClick={() => {
            if (setIsEraserMode) {
               setIsEraserMode(!isEraserMode);
            }
          }}
          className={cn(
            "h-8 w-8 shrink-0 rounded-lg",
            isEraserMode 
              ? "bg-rose-500 hover:bg-rose-600 text-white dark:text-white" 
              : "text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          )}
          title="Toggle Eraser Mode (remove markdown on click)"
          aria-label="Toggle Eraser Mode"
          aria-pressed={isEraserMode}
        >
          <Eraser className="w-4 h-4" />
        </Button>
      </div>

      {/* Bookmark Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => jumpToMark('prev')}
          className="h-8 w-8 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg shrink-0"
          title="Previous Bookmark"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleAddBookmark}
          className="h-8 w-8 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg shrink-0"
          title="Add Bookmark"
        >
          <Bookmark className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => jumpToMark('next')}
          className="h-8 w-8 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg shrink-0"
          title="Next Bookmark"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Block Elements Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n> ", "")}
          className="h-8 w-8 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("`", "`")}
          className="h-8 w-8 text-pink-500 hover:text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 rounded-lg shrink-0"
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("```\n")}
          className="h-8 w-8 text-pink-600 hover:text-pink-700 dark:text-pink-300 hover:bg-pink-500/10 rounded-lg shrink-0"
          title="Code Block"
        >
          <Terminal className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={onInsertLinkClick}
          className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={onInsertImageClick}
          className="h-8 w-8 text-teal-500 hover:text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 rounded-lg shrink-0"
          title="Image"
        >
          <Image className="w-4 h-4" />
        </Button>
      </div>

      {/* Lists & Layout Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n- ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n1. ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n- [ ] ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Task List"
        >
          <ListTodo className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n---\n", "")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |\n", "")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Table"
        >
          <Table className="w-4 h-4" />
        </Button>
      </div>

      {/* Headings Group */}
      <div className="flex items-center gap-0.5 pl-1 border-r border-border pr-1">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n# ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n## ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => handleApplyFormatting("\n### ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Symbol & Magic Group */}
      <div className="flex items-center gap-0.5 pl-1">
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => setIsAutoMarkdownEnabled(!isAutoMarkdownEnabled)}
          className={cn(
            "h-8 w-8 rounded-lg shrink-0 transition-colors",
            isAutoMarkdownEnabled
              ? "text-primary bg-primary/20 dark:bg-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title={isAutoMarkdownEnabled ? "Auto Markdown: ON" : "Auto Markdown: OFF"}
        >
          <Wand2 className="w-4 h-4" />
        </Button>
        <Button
          onPointerDown={(e) => e.preventDefault()}
          variant="ghost"
          size="icon"
          onClick={() => {
            onToggleSymbolMenu();
            if (!showSymbolMenu) {
              setIsSelectionMode(false);
            }
          }}
          className="h-8 w-8 text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg shrink-0"
          title="Symbols"
        >
          <Sigma className="w-4 h-4" />
        </Button>
      </div>
          </div>
        )}
      </div>
    </>
  );
};
