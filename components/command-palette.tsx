import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, FileText, Plus, Moon, Sun, Sparkles, Palette } from "lucide-react";
import { Note } from "@/hooks/use-notes";

interface CommandPaletteProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onThemeChange: (theme: string) => void;
}

export function CommandPalette({ notes, onSelectNote, onCreateNote, onThemeChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <Command className="w-full h-full flex flex-col" label="Global Command Menu">
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
            <Command.Input 
              autoFocus 
              placeholder="Search notes, commands, or themes..." 
              className="flex-1 h-14 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
            <Command.Empty className="p-4 text-center text-muted-foreground text-sm">No results found.</Command.Empty>

            <Command.Group heading="Notes" className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              {notes.map(note => (
                <Command.Item 
                  key={note.id} 
                  onSelect={() => { onSelectNote(note.id); setOpen(false); }}
                  className="flex items-center gap-2 px-2 py-2 text-sm text-foreground rounded-md cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  {note.title || "Untitled Note"}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
              <Command.Item 
                onSelect={() => { onCreateNote(); setOpen(false); }}
                className="flex items-center gap-2 px-2 py-2 text-sm text-foreground rounded-md cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                Create New Note
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Themes" className="text-xs font-medium text-muted-foreground px-2 py-1.5 mt-2">
              {[
                { id: 'light', label: 'Light Theme', icon: Sun },
                { id: 'dark', label: 'Dark Theme', icon: Moon },
                { id: 'fancy', label: 'Fancy Theme', icon: Sparkles },
                { id: 'rainbow', label: 'Rainbow Theme', icon: Palette },
                { id: 'dracula', label: 'Dracula Theme', icon: Moon },
                { id: 'nord', label: 'Nord Theme', icon: Moon }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <Command.Item 
                    key={t.id}
                    onSelect={() => { onThemeChange(t.id); setOpen(false); }}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-foreground rounded-md cursor-pointer hover:bg-muted aria-selected:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    Switch to {t.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
