import { Button } from "@/components/ui/button";
import { Plus, Trash2, FileText, X, Download, Tag, Search, Hash, Sun, Moon, Folder, Settings2, FileUp } from "lucide-react";
import { Note, Folder as CommonFolder } from "@/hooks/use-notes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useState, useMemo, useEffect } from "react";
import { SidebarFileTree } from "./sidebar-file-tree";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import packageJson from '../package.json';

interface SidebarProps {
  notes: Note[];
  folders: CommonFolder[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string, content?: string, folderId?: string) => string | void;
  onDeleteNote: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string | null) => string | void;
  onUpdateFolder: (id: string, updates: Partial<CommonFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null, referenceId?: string) => void;
  onMoveFolder?: (folderId: string, parentId: string | null, referenceId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function Sidebar({ 
  notes, 
  folders,
  activeNoteId, 
  onSelectNote, 
  onCreateNote, 
  onDeleteNote, 
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onMoveNote,
  onMoveFolder,
  isOpen, 
  onClose,
  theme,
  onThemeChange
}: SidebarProps) {
  const { isInstallable, installApp } = usePWAInstall();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appVersion, setAppVersion] = useState<string>(packageJson.version || "1.0.0");

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.getInfo().then(info => {
        setAppVersion(info.version);
      }).catch(err => console.error("Failed to get app version", err));
    }
  }, []);

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
          <div className="flex items-baseline gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm flex items-center justify-center self-center shrink-0">
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
            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">V {appVersion}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-muted md:hidden" aria-label="Close sidebar">
              <X className="w-5 h-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      
      <div className="p-4 space-y-3">
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

      <div className="flex-1 px-3 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <SidebarFileTree 
          notes={notes}
          folders={folders}
          activeNoteId={activeNoteId}
          onSelectNote={onSelectNote}
          onCreateNote={onCreateNote}
          onDeleteNote={onDeleteNote}
          onCreateFolder={onCreateFolder}
          onUpdateFolder={onUpdateFolder}
          onDeleteFolder={onDeleteFolder}
          onMoveNote={onMoveNote}
          onMoveFolder={onMoveFolder}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
        />
        
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

      {/* Theme Switcher */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Theme</span>
        </div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme selection">
          {[
            { id: 'light', label: 'Light', color: 'bg-white border-slate-200 text-amber-500 hover:bg-slate-50', icon: Sun },
            { id: 'dark', label: 'Dark', color: 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800', icon: Moon }
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
    </>
  );
}
