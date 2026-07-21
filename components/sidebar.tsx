import { Button } from "@/components/ui/button";
import { FileText, X, Download, Tag, Search, Hash, Sun, Moon, Calendar as CalendarIcon, FolderOpen, Battery, BatteryCharging, Type} from "lucide-react";
import { Note, Folder as CommonFolder } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useState, useMemo, useEffect } from "react";
import { SidebarFileTree } from "./sidebar-file-tree";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import packageJson from '../package.json';
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

interface SidebarProps {
  notes: Note[];
  folders: CommonFolder[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (title?: string, content?: string, folderId?: string, metadata?: Partial<Note>) => string | void;
  onDeleteNote: (id: string) => void;
  onCreateFolder: (name: string, parentId?: string | null) => string | void;
  onUpdateFolder: (id: string, updates: Partial<CommonFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null, referenceId?: string, position?: 'before' | 'after' | 'inside') => void;
  onMoveFolder?: (folderId: string, parentId: string | null, referenceId?: string, position?: 'before' | 'after' | 'inside') => void;
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  powerSaver: boolean;
  onPowerSaverChange: (value: boolean) => void;
  baseFontSize?: string;
  onBaseFontSizeChange?: (size: string) => void;
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
  onThemeChange,
  powerSaver,
  onPowerSaverChange,
  baseFontSize,
  onBaseFontSizeChange
}: SidebarProps) {
  const { isInstallable, installApp } = usePWAInstall();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [appVersion, setAppVersion] = useState<string>(packageJson.version || "1.0.0");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const activeNoteObj = notes.find(n => n.id === activeNoteId);
    if (activeNoteObj?.date) {
      setSelectedDate(new Date(activeNoteObj.date));
    }
  }, [activeNoteId, notes]);

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

  const activeTagsToDisplay = useMemo(() => {
    return Array.from(new Set([...allTags, ...selectedTags])).sort();
  }, [allTags, selectedTags]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return notes.filter(note => {
      const matchesSearch = !q || note.title.toLowerCase().includes(q) || 
                           note.content.toLowerCase().includes(q);
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
          className="fixed inset-0 bg-black/25 z-40 md:hidden backdrop-blur-sm transition-all duration-300 ease-in-out animate-in fade-in"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-50 w-72 border-r border-border bg-sidebar flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out transform-gpu print:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden"
      )}>
        <div className="p-5 border-b border-border flex items-center justify-between bg-sidebar">
          <div className="flex items-baseline gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm flex items-center justify-center self-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" className="w-full h-full" style={{ marginLeft: '-10px' }}>
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
              <X className="w-5 h-5" aria-hidden="true" style={{ marginLeft: '-10px' }} />
            </Button>
          </div>
        </div>
      
      <div className="p-4 space-y-3 shrink-0">
        <div className="flex gap-2">
          <div className="relative group/search flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              onFocus={() => {
                const meta = document.querySelector('meta[name=viewport]');
                if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
              }}
              onBlur={() => {
                const meta = document.querySelector('meta[name=viewport]');
                if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, interactive-widget=resizes-content, maximum-scale=1.0, user-scalable=0');
              }}
              className="w-full pl-9 pr-4 py-2 text-base sm:text-sm bg-muted/40 border border-transparent focus:bg-background focus:border-primary/20 rounded-xl outline-none transition-all placeholder:text-muted-foreground/60 text-foreground shadow-sm focus:shadow-md focus:shadow-primary/5 focus:ring-0"
              aria-label="Search notes"
            />
          </div>
        </div>
      </div>

      {activeTagsToDisplay.length > 0 && (
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              onClick={() => setSelectedTags([])}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary",
                selectedTags.length === 0 
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105 my-0.5" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80 my-0.5"
              )}
              aria-pressed={selectedTags.length === 0}
            >
              All
            </button>
            {activeTagsToDisplay.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-105 my-0.5" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80 my-0.5"
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

      <Tabs defaultValue="files" className="flex-1 flex flex-col min-h-0">
        <div className="px-3 pb-2 pt-1 border-b border-border/50 shrink-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Files
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="files" className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden px-3 pt-2 pb-0 m-0 border-0 focus-visible:ring-0">
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
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-4 pb-0 m-0 border-0 focus-visible:ring-0 flex flex-col items-center">
             <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
                const formattedDate = format(date, "yyyy-MM-dd");
                const existingNote = notes.find(n => n.date === formattedDate);
                if (existingNote) {
                  onSelectNote(existingNote.id);
                } else {
                  onCreateNote(`📅 Daily Note: ${format(date, 'PPP')}`, `# Daily Note: ${format(date, 'PPP')}\n\n`, undefined, { date: formattedDate });
                }
              }}
              className="rounded-md border shadow"
            />
            <div className="mt-6 w-full px-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Timeline</h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {notes
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .slice(0, 10).map((note) => (
                      <div key={note.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active" onClick={() => {
                        if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
                        onSelectNote(note.id);
                      }}>
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-secondary text-secondary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 cursor-pointer hover:scale-105 transition-transform z-10">
                              <FileText className="w-4 h-4" />
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-border bg-card shadow-sm cursor-pointer hover:border-primary/50 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm truncate">{note.title}</span>
                                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{format(note.updatedAt, 'MMM d')}</span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">{note.content.replace(/[#*`_]/g, '') || "Empty note"}</p>
                          </div>
                      </div>
                  ))}
              </div>
            </div>
            {notes.length === 0 && (
              <div className="mt-8 text-center text-sm text-muted-foreground flex flex-col gap-2">
                <CalendarIcon className="w-8 h-8 opacity-50 mx-auto" />
                <p>Select a date to open or create<br/>a Daily Note for that day.</p>
              </div>
            )}
            <div className="h-8 shrink-0"/>
        </TabsContent>
      </Tabs>

      {/* Font Size Selector Row */}
      {baseFontSize && onBaseFontSizeChange && (
        <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between shrink-0 bg-muted/10">
          <div className="flex items-center gap-2 pl-2">
            <Type className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Font Size</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/30 shrink-0">
            {[
              { id: 'text-sm', label: 'A', title: 'Small' },
              { id: 'text-base', label: 'A', title: 'Medium', className: 'text-xs' },
              { id: 'text-lg', label: 'A', title: 'Large', className: 'text-sm font-medium' },
              { id: 'text-xl', label: 'A', title: 'Extra Large', className: 'text-base font-bold' }
            ].map((size) => (
              <button
                key={size.id}
                onClick={() => {
                  if (Capacitor.isNativePlatform()) {
                    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  }
                  onBaseFontSizeChange(size.id);
                }}
                className={cn(
                  "h-8 sm:h-7 px-2.5 rounded-md text-[11px] font-medium transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary flex items-center justify-center min-w-[36px] sm:min-w-[32px]",
                  baseFontSize === size.id
                    ? "bg-background shadow-sm text-foreground border border-border/50 scale-105"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-background/20"
                )}
                title={size.title}
                aria-label={`Set font size to ${size.title}`}
                aria-pressed={baseFontSize === size.id}
              >
                <span className={size.className}>{size.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Theme and Settings Switcher */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 pl-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Settings</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Theme and settings">
          <button
            onClick={() => {
              if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
              onPowerSaverChange(!powerSaver);
            }}
            className={cn(
              "h-8 w-10 rounded-lg border-[1.5px] transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary text-emerald-500",
              powerSaver ? "bg-emerald-500/10 border-emerald-500/30" : "bg-transparent border-transparent hover:bg-muted"
            )}
            title={powerSaver ? "Power Saver (On)" : "Power Saver (Off)"}
            aria-label="Toggle Power Saver mode"
            aria-pressed={powerSaver}
          >
            {powerSaver ? <BatteryCharging className="w-4 h-4" /> : <Battery className="w-4 h-4 opacity-50" />}
          </button>
          
          <div className="w-px h-5 bg-border mx-1" />

          {[
            { id: 'light', label: 'Light', color: 'bg-white border-slate-200 text-amber-500 hover:bg-slate-50', icon: Sun },
            { id: 'dark', label: 'Dark', color: 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800', icon: Moon }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(()=>{});
                  onThemeChange(t.id);
                }}
                className={cn(
                  "h-8 w-10 rounded-lg border-[1.5px] transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary",
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
