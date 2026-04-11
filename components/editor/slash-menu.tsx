import { 
  Heading1, Heading2, Heading3, List, ListOrdered, 
  ListTodo, Quote, Code, Minus, Table, Image, X
} from "lucide-react";

interface SlashMenuProps {
  slashMenuOpen: boolean;
  slashMenuPosition: { top: number; left: number };
  slashSearch: string;
  insertSlashCommand: (prefix: string, suffix?: string) => void;
  onClose: () => void;
}

export const SlashMenu = ({
  slashMenuOpen,
  slashMenuPosition,
  slashSearch,
  insertSlashCommand,
  onClose
}: SlashMenuProps) => {
  if (!slashMenuOpen) return null;

  const commands = [
    { icon: Heading1, label: 'Heading 1', desc: 'Big section heading', prefix: '# ' },
    { icon: Heading2, label: 'Heading 2', desc: 'Medium section heading', prefix: '## ' },
    { icon: Heading3, label: 'Heading 3', desc: 'Small section heading', prefix: '### ' },
    { icon: List, label: 'Bulleted List', desc: 'Create a simple list', prefix: '- ' },
    { icon: ListOrdered, label: 'Numbered List', desc: 'Create a list with numbering', prefix: '1. ' },
    { icon: ListTodo, label: 'To-do List', desc: 'Track tasks with checkboxes', prefix: '- [ ] ' },
    { icon: Quote, label: 'Quote', desc: 'Capture a quote', prefix: '> ' },
    { icon: Code, label: 'Code Block', desc: 'Capture a code snippet', prefix: '```\n', suffix: '\n```' },
    { icon: Minus, label: 'Divider', desc: 'Visually divide blocks', prefix: '\n---\n' },
    { icon: Table, label: 'Table', desc: 'Add a markdown table', prefix: '\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n' },
    { icon: Image, label: 'Image', desc: 'Embed an image', prefix: '![alt](', suffix: ')' },
  ].filter(cmd => cmd.label.toLowerCase().includes(slashSearch.toLowerCase()));

  if (commands.length === 0) return null;

  return (
    <div 
      className="absolute bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50 w-64 md:w-72 animate-in fade-in zoom-in-95 duration-200"
      style={{ 
        top: slashMenuPosition.top + 24, 
        left: slashMenuPosition.left 
      }}
    >
      <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center bg-muted/30">
        <span>Basic Blocks</span>
        <button onClick={onClose} className="hover:bg-muted p-1 rounded-md transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
        {commands.map((cmd, i) => (
          <button
            key={i}
            onClick={() => insertSlashCommand(cmd.prefix, cmd.suffix)}
            className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-muted rounded-lg transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-colors shrink-0">
              <cmd.icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{cmd.label}</span>
              <span className="text-xs text-muted-foreground">{cmd.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
