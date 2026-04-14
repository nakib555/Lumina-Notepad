import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, X, Download, Tag, Search, Hash, Sun, Moon, Sparkles, Palette, Folder, Settings2 } from "lucide-react";
import { Note, SmartFolder } from "@/hooks/use-notes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useState, useMemo } from "react";
import { SmartFolderDialog } from "./smart-folder-dialog";

interface SidebarProps {
  notes: Note[];
  smartFolders: SmartFolder[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onCreateSmartFolder: (folder: Omit<SmartFolder, 'id'>) => void;
  onUpdateSmartFolder: (id: string, updates: Partial<SmartFolder>) => void;
  onDeleteSmartFolder: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function Sidebar({ 
  notes, 
  smartFolders,
  activeNoteId, 
  onSelectNote, 
  onCreateNote, 
  onDeleteNote, 
  onCreateSmartFolder,
  onUpdateSmartFolder,
  onDeleteSmartFolder,
  isOpen, 
  onClose,
  theme,
  onThemeChange
}: SidebarProps) {
  const { isInstallable, installApp } = usePWAInstall();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSmartFolderDialogOpen, setIsSmartFolderDialogOpen] = useState(false);
  const [editingSmartFolder, setEditingSmartFolder] = useState<SmartFolder | undefined>();

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => note.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [notes, searchQuery, selectedTags]);

  const groupedNotes = useMemo(() => {
    const groups: Record<string, Note[]> = { 'All Notes': [] };
    
    // Add smart folders
    smartFolders.forEach(sf => {
      groups[sf.name] = filteredNotes.filter(note => {
        return sf.rules.every(rule => {
          if (rule.type === 'tag') {
            if (rule.operator === 'contains') return note.tags?.some(t => t.includes(rule.value));
            if (rule.operator === 'equals') return note.tags?.includes(rule.value);
          }
          if (rule.type === 'keyword') {
            const content = (note.title + ' ' + note.content).toLowerCase();
            const val = rule.value.toLowerCase();
            if (rule.operator === 'contains') return content.includes(val);
            if (rule.operator === 'equals') return content === val;
          }
          if (rule.type === 'date') {
            const noteDate = new Date(note.updatedAt).getTime();
            const ruleDate = new Date(rule.value).getTime();
            if (rule.operator === 'after') return noteDate > ruleDate;
            if (rule.operator === 'before') return noteDate < ruleDate;
          }
          return false;
        });
      });
    });

    filteredNotes.forEach(note => {
      const folder = note.folderId || 'All Notes';
      if (!groups[folder]) groups[folder] = [];
      // Prevent duplicates if note is already in a smart folder
      if (!smartFolders.some(sf => groups[sf.name]?.includes(note))) {
        groups[folder].push(note);
      }
    });
    return groups;
  }, [filteredNotes, smartFolders]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden"
      )}>
        <div className="p-5 border-b border-border flex items-center justify-between bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" className="w-full h-full">
                <rect width="512" height="512" rx="128" fill="url(#paint0_linear)"/>
                <path d="M160 140V372H352" stroke="white" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="352" cy="140" r="40" fill="white">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
                </circle>
                <defs>
                  <linearGradient id="paint0_linear" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1"/>
                    <stop offset="1" stopColor="#A855F7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="font-semibold text-sidebar-foreground tracking-tight">Lumina</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onCreateNote} className="text-muted-foreground hover:text-foreground hover:bg-muted hidden md:flex" aria-label="Create new note">
              <Plus className="w-5 h-5" aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted md:hidden" aria-label="Close sidebar">
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      
      <div className="p-4 space-y-3">
        <Button 
          onClick={onCreateNote} 
          className="w-full justify-start gap-2 bg-background text-foreground border border-border hover:bg-muted hover:text-foreground shadow-sm transition-all" 
          variant="outline"
          aria-label="Create new note"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Note
        </Button>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              const meta = document.querySelector('meta[name=viewport]');
              if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
            }}
            onBlur={() => {
              const meta = document.querySelector('meta[name=viewport]');
              if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content, maximum-scale=1.0, user-scalable=0');
            }}
            className="w-full pl-9 pr-4 py-2 text-base sm:text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border rounded-xl outline-none transition-all placeholder:text-muted-foreground text-foreground focus:ring-2 focus:ring-primary"
            aria-label="Search notes"
          />
        </div>
      </div>

      <div className="px-3 mb-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Smart Folders</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setEditingSmartFolder(undefined);
              setIsSmartFolderDialogOpen(true);
            }}
            aria-label="Add smart folder"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              onClick={() => setSelectedTags([])}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary",
                selectedTags.length === 0 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-pressed={selectedTags.length === 0}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                aria-pressed={selectedTags.includes(tag)}
              >
                <Hash className="w-2.5 h-2.5 opacity-60" aria-hidden="true" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-4 pb-4">
          {Object.entries(groupedNotes).map(([folder, folderNotes]) => (
            folderNotes.length > 0 && (
              <div key={folder} className="space-y-1">
                {folder !== 'All Notes' && (
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider group">
                    <div className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5" aria-hidden="true" />
                      {folder}
                    </div>
                    {smartFolders.some(sf => sf.name === folder) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 hover:bg-muted"
                          onClick={() => {
                            setEditingSmartFolder(smartFolders.find(sf => sf.name === folder));
                            setIsSmartFolderDialogOpen(true);
                          }}
                          aria-label={`Edit smart folder ${folder}`}
                        >
                          <Settings2 className="w-3 h-3" aria-hidden="true" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            const sf = smartFolders.find(sf => sf.name === folder);
                            if (sf) onDeleteSmartFolder(sf.id);
                          }}
                          aria-label={`Delete smart folder ${folder}`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {folderNotes.map(note => (
                  <div
                    key={note.id}
                    className={cn(
                      "group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                      activeNoteId === note.id 
                        ? "bg-background border-border shadow-sm" 
                        : "border-transparent hover:bg-muted/50 text-muted-foreground"
                    )}
                    onClick={() => onSelectNote(note.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectNote(note.id);
                      }
                    }}
                    aria-current={activeNoteId === note.id ? "true" : undefined}
                  >
                    <div className="flex flex-col overflow-hidden gap-1.5 w-full pr-2">
                      <span className={cn(
                        "font-medium truncate text-sm transition-colors",
                        activeNoteId === note.id ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                      )}>
                        {note.title || "Untitled Note"}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">
                          {format(note.updatedAt, "MMM d, yyyy")}
                        </span>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex gap-1" aria-hidden="true">
                            {note.tags.slice(0, 2).map(tag => (
                              <div key={tag} className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "opacity-0 group-hover:opacity-100 focus:opacity-100 h-7 w-7 shrink-0 transition-all rounded-full",
                        activeNoteId === note.id 
                          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      aria-label={`Delete note ${note.title || "Untitled Note"}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          ))}
          {filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3 mt-10" role="status">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center" aria-hidden="true">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedTags.length > 0 ? "No matching notes found." : "No notes yet.\nCreate one to get started."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Theme</span>
        </div>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Theme selection">
          {[
            { id: 'light', label: 'Light', color: 'bg-white border-slate-200 text-amber-500', icon: Sun },
            { id: 'dark', label: 'Dark', color: 'bg-slate-900 border-slate-800 text-slate-100', icon: Moon },
            { id: 'fancy', label: 'Fancy', color: 'bg-indigo-50 border-indigo-200 text-indigo-500', icon: Sparkles },
            { id: 'rainbow', label: 'Rainbow', color: 'bg-pink-50 border-pink-200 text-pink-500', icon: Palette },
            { id: 'dracula', label: 'Dracula', color: 'bg-[#282a36] border-[#44475a] text-[#ff79c6]', icon: Moon },
            { id: 'nord', label: 'Nord', color: 'bg-[#2e3440] border-[#3b4252] text-[#88c0d0]', icon: Moon }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className={cn(
                  "h-8 rounded-lg border-2 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary",
                  t.color,
                  theme === t.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent" : "hover:scale-105"
                )}
                title={t.label}
                aria-label={`Switch to ${t.label} theme`}
                aria-pressed={theme === t.id}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {/* PWA Install Button */}
      {isInstallable && (
        <div className="p-4 border-t border-border">
          <Button 
            onClick={installApp}
            className="w-full justify-start gap-2 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary shadow-none transition-all"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Install Desktop App
          </Button>
        </div>
      )}
    </div>

      <SmartFolderDialog 
        isOpen={isSmartFolderDialogOpen}
        onClose={() => setIsSmartFolderDialogOpen(false)}
        existingFolder={editingSmartFolder}
        onSave={(folder) => {
          if (editingSmartFolder) {
            onUpdateSmartFolder(editingSmartFolder.id, folder);
          } else {
            onCreateSmartFolder(folder);
          }
        }}
      />
    </>
  );
}
