import { 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Quote, Code, Link, Image, Minus, Table, List, ListOrdered, ListTodo,
  Heading1, Heading2, Heading3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  toolbarRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  applyFontSize: (size: string) => void;
  applyFormatting: (prefix: string, suffix?: string) => void;
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
  applyFormatting
}: FloatingToolbarProps) => {
  return (
    <div 
      ref={toolbarRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className={cn(
        "flex items-center gap-1 bg-background/90 backdrop-blur-md border border-border shadow-xl rounded-2xl p-1.5 overflow-x-auto no-scrollbar max-w-full flex-nowrap select-none touch-pan-x",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {/* Font Style & Size Group */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-border">
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
          onClick={() => applyFormatting("**")}
          className="h-8 w-8 text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyFormatting("*")}
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
          onClick={() => applyFormatting("~~")}
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
          onClick={() => applyFormatting("`")}
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
      <div className="flex items-center gap-0.5 pl-1">
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
    </div>
  );
};
