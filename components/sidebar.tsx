import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, X, Download, Tag, Search, Hash } from "lucide-react";
import { Note } from "@/hooks/use-notes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useState, useMemo } from "react";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function Sidebar({ 
  notes, 
  activeNoteId, 
  onSelectNote, 
  onCreateNote, 
  onDeleteNote, 
  isOpen, 
  onClose,
  theme,
  onThemeChange
}: SidebarProps) {
  const { isInstallable, installApp } = usePWAInstall();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
      const matchesTag = !selectedTag || note.tags?.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

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
        "fixed md:static inset-y-0 left-0 z-50 w-72 border-r border-slate-200/60 bg-[#f8f8f7] flex flex-col h-screen shrink-0 transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden"
      )}>
        <div className="p-5 border-b border-slate-200/60 flex items-center justify-between bg-[#f8f8f7]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">
              <img src="/logo.svg" alt="Lumina Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-semibold text-slate-800 tracking-tight">Lumina</h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onCreateNote} className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 hidden md:flex">
              <Plus className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-500 hover:text-slate-900 hover:bg-slate-200/50 md:hidden">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      
      <div className="p-4 space-y-3">
        <Button 
          onClick={onCreateNote} 
          className="w-full justify-start gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all" 
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          New Note
        </Button>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-200/40 border-transparent focus:bg-white focus:border-slate-200 rounded-xl outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                !selectedTag 
                  ? "bg-indigo-500 text-white shadow-sm" 
                  : "bg-slate-200/50 text-slate-600 hover:bg-slate-200"
              )}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all flex items-center gap-1",
                  selectedTag === tag 
                    ? "bg-indigo-500 text-white shadow-sm" 
                    : "bg-slate-200/50 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Hash className="w-2.5 h-2.5 opacity-60" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 px-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-1 pb-4">
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={cn(
                "group flex items-start justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 border",
                activeNoteId === note.id 
                  ? "bg-white border-slate-200 shadow-sm" 
                  : "border-transparent hover:bg-slate-200/40 text-slate-600"
              )}
              onClick={() => onSelectNote(note.id)}
            >
              <div className="flex flex-col overflow-hidden gap-1.5 w-full pr-2">
                <span className={cn(
                  "font-medium truncate text-sm transition-colors",
                  activeNoteId === note.id ? "text-slate-900" : "text-slate-700 group-hover:text-slate-900"
                )}>
                  {note.title || "Untitled Note"}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
                    {format(note.updatedAt, "MMM d, yyyy")}
                  </span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex gap-1">
                      {note.tags.slice(0, 2).map(tag => (
                        <div key={tag} className="w-1.5 h-1.5 rounded-full bg-indigo-400/60" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "opacity-0 group-hover:opacity-100 h-7 w-7 shrink-0 transition-all rounded-full",
                  activeNoteId === note.id 
                    ? "text-slate-400 hover:text-red-500 hover:bg-red-50" 
                    : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3 mt-10">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">
                {searchQuery || selectedTag ? "No matching notes found." : "No notes yet.\nCreate one to get started."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="p-4 border-t border-slate-200/60">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Theme</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'light', label: 'Light', color: 'bg-white border-slate-200' },
            { id: 'dark', label: 'Dark', color: 'bg-slate-900 border-slate-800' },
            { id: 'fancy', label: 'Fancy', color: 'bg-indigo-50 border-indigo-200' },
            { id: 'rainbow', label: 'Rainbow', color: 'bg-pink-50 border-pink-200' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onThemeChange(t.id)}
              className={cn(
                "h-8 rounded-lg border-2 transition-all flex items-center justify-center",
                t.color,
                theme === t.id ? "ring-2 ring-indigo-500 ring-offset-2 border-transparent" : "hover:scale-105"
              )}
              title={t.label}
            >
              <div className={cn("w-3 h-3 rounded-full", t.id === 'rainbow' ? 'bg-gradient-to-tr from-red-400 via-green-400 to-blue-400' : t.id === 'dark' ? 'bg-white' : 'bg-slate-400')} />
            </button>
          ))}
        </div>
      </div>

      {/* PWA Install Button */}
      {isInstallable && (
        <div className="p-4 border-t border-slate-200/60">
          <Button 
            onClick={installApp}
            className="w-full justify-start gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 shadow-none transition-all"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            Install Desktop App
          </Button>
        </div>
      )}
    </div>
    </>
  );
}
