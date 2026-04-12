import { useState } from "react";
import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Quote, Code, Link, Image, Minus, Table, List, ListOrdered, ListTodo,
  Heading1, Heading2, Heading3, Sigma, MousePointer2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Scissors, Copy, ClipboardPaste, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  applyFormatting: (prefix: string, suffix?: string, toggle?: boolean) => void;
  onToggleSymbolMenu: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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
  applyFormatting,
  onToggleSymbolMenu,
  textareaRef
}: FloatingToolbarProps) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);

  const moveCursor = (direction: 'left' | 'right' | 'up' | 'down') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Preview mode
      const selection = window.getSelection();
      if (!selection) return;
      
      const modifyStr = isSelecting ? 'extend' : 'move';
      let dirStr = 'forward';
      let granularity = 'character';
      
      if (direction === 'left') dirStr = 'backward';
      else if (direction === 'right') dirStr = 'forward';
      else if (direction === 'up') { dirStr = 'backward'; granularity = 'line'; }
      else if (direction === 'down') { dirStr = 'forward'; granularity = 'line'; }
      
      // modify is non-standard but works in many browsers
      if ('modify' in selection && typeof selection.modify === 'function') {
        selection.modify(modifyStr, dirStr, granularity);
      }
      return;
    }
    
    textarea.focus();
    const currentPos = textarea.selectionStart;
    const currentEnd = textarea.selectionEnd;
    
    let newPos = currentPos;
    
    if (direction === 'left') {
      newPos = Math.max(0, (isSelecting ? currentEnd : currentPos) - 1);
    } else if (direction === 'right') {
      newPos = Math.min(textarea.value.length, (isSelecting ? currentEnd : currentPos) + 1);
    } else if (direction === 'up') {
      const posToUse = isSelecting ? currentEnd : currentPos;
      const lines = textarea.value.substring(0, posToUse).split('\n');
      if (lines.length > 1) {
        const currentLinePos = lines[lines.length - 1].length;
        const prevLineLength = lines[lines.length - 2].length;
        newPos = posToUse - currentLinePos - 1 - (prevLineLength - Math.min(currentLinePos, prevLineLength));
      }
    } else if (direction === 'down') {
      const posToUse = isSelecting ? currentEnd : currentPos;
      const textBeforeCursor = textarea.value.substring(0, posToUse);
      const textAfterCursor = textarea.value.substring(posToUse);
      const currentLinePos = textBeforeCursor.split('\n').pop()?.length || 0;
      const nextLine = textAfterCursor.split('\n')[1];
      
      if (nextLine !== undefined) {
        const remainingCurrentLine = textAfterCursor.split('\n')[0].length;
        newPos = posToUse + remainingCurrentLine + 1 + Math.min(currentLinePos, nextLine.length);
      }
    }

    if (isSelecting) {
      // If selecting, we anchor at currentPos and move currentEnd
      textarea.setSelectionRange(Math.min(currentPos, newPos), Math.max(currentPos, newPos));
    } else {
      textarea.setSelectionRange(newPos, newPos);
    }
  };

  const handleCut = async () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      document.execCommand('cut');
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selectedText = textarea.value.substring(start, end);
      try {
        await navigator.clipboard.writeText(selectedText);
        // We can't easily trigger a native cut event that updates React state,
        // so we'll just use document.execCommand as a fallback or let the user use native cut.
        // For a full implementation, we'd need to call a passed down `onUpdateNote` function.
        document.execCommand('cut');
      } catch (err) {
        console.error('Failed to cut text: ', err);
      }
    }
    textarea.focus();
  };

  const handleCopy = async () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      document.execCommand('copy');
      return;
    }
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selectedText = textarea.value.substring(start, end);
      try {
        await navigator.clipboard.writeText(selectedText);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
    textarea.focus();
  };

  const handlePaste = async () => {
    const textarea = textareaRef.current;
    if (!textarea) {
      try {
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
      } catch (err) {
        console.error('Failed to paste text: ', err);
      }
      return;
    }
    
    textarea.focus();
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand('insertText', false, text);
    } catch (err) {
      console.error('Failed to paste text: ', err);
    }
  };

  return (
    <>
      {isSelectionMode && (
        <div 
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-border rounded-2xl py-1.5 px-2 z-50 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[88vw] md:max-w-[700px] flex-nowrap select-none touch-pan-x"
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
            onClick={() => setIsSelectionMode(!isSelectionMode)}
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
          onChange={(e) => onFontFamilyChange(e.target.value)}
          className="h-8 px-1 sm:px-2 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg outline-none text-xs font-medium cursor-pointer shrink-0"
          title="Font Style"
        >
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
        <select
          onChange={(e) => {
            if (e.target.value) {
              applyFontSize(e.target.value);
              e.target.value = ""; // reset
            }
          }}
          defaultValue=""
          className="h-8 px-1 sm:px-2 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg outline-none text-xs font-medium cursor-pointer shrink-0"
          title="Font Size"
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
          onClick={() => applyFormatting("[", "](url)")}
          className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("![alt](", ")")}
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

      {/* Symbol Group */}
      <div className="flex items-center gap-0.5 pl-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSymbolMenu}
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
