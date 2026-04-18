import { useState, useRef } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Quote, Code, Terminal, Link, Image, Minus, Table, List, ListOrdered, ListTodo,
  Heading1, Heading2, Heading3, Sigma, MousePointer2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Scissors, Copy, ClipboardPaste, X, Eraser,
  AlignLeft, AlignCenter, AlignRight, Wand2
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
  clearFormatting?: () => void;
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
  clearFormatting,
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
  const savedRangeRef = useRef<Range | null>(null);
  
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

  const scrollToSelection = () => {
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
    
    const scrollContainer = document.querySelector('.custom-scrollbar');
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
        const cursorY = rect.top - containerRect.top;
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
              variant="ghost"
              size="icon"
              onClick={() => moveCursor('left')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Left"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
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
              variant="ghost"
              size="icon"
              onClick={() => moveCursor('up')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Up"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => moveCursor('down')}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Move Down"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button
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
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Select All"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCut}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Cut"
            >
              <Scissors className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
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
          "flex items-center gap-1 bg-background/90 backdrop-blur-md border border-border rounded-2xl py-1.5 px-2 overflow-x-auto no-scrollbar max-w-[88vw] md:max-w-[700px] flex-nowrap select-none touch-pan-x",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {/* Selection Mode Toggle */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-border">
          <Button
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
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting('<div align="left">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Left"
          aria-label="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting('<div align="center">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Center"
          aria-label="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting('<div align="right">\n\n', '\n\n</div>')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Align Right"
          aria-label="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("**", "**")}
          className="h-8 w-8 text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("*", "*")}
          className="h-8 w-8 text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg shrink-0"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("<u>", "</u>")}
          className="h-8 w-8 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg shrink-0"
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("~~", "~~")}
          className="h-8 w-8 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0"
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("<sub>", "</sub>")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Subscript"
        >
          <Subscript className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("<sup>", "</sup>")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Superscript"
        >
          <Superscript className="w-4 h-4" />
        </Button>
        <Button
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

      {/* Block Elements Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n> ", "")}
          className="h-8 w-8 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("`", "`")}
          className="h-8 w-8 text-pink-500 hover:text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 rounded-lg shrink-0"
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("```\n")}
          className="h-8 w-8 text-pink-600 hover:text-pink-700 dark:text-pink-300 hover:bg-pink-500/10 rounded-lg shrink-0"
          title="Code Block"
        >
          <Terminal className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onInsertLinkClick}
          className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
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
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n- ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n1. ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n- [ ] ", "")}
          className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
          title="Task List"
        >
          <ListTodo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n---\n", "")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |\n", "")}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
          title="Table"
        >
          <Table className="w-4 h-4" />
        </Button>
      </div>

      {/* Headings Group */}
      <div className="flex items-center gap-0.5 pl-1 border-r border-border pr-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n# ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n## ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("\n### ", "")}
          className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Symbol & Magic Group */}
      <div className="flex items-center gap-0.5 pl-1">
        <Button
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
    </>
  );
};
