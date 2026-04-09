import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, FileText, Book, X } from "lucide-react";
import { Note } from "@/hooks/use-notes";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ notes, activeNoteId, onSelectNote, onCreateNote, onDeleteNote, isOpen, onClose }: SidebarProps) {
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
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
              <Book className="w-4 h-4 text-white" />
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
      
      <div className="p-4">
        <Button 
          onClick={onCreateNote} 
          className="w-full justify-start gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all" 
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          New Note
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 pb-4">
          {notes.map(note => (
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
                <span className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">
                  {format(note.updatedAt, "MMM d, yyyy")}
                </span>
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
          {notes.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-3 mt-10">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500">No notes yet.<br/>Create one to get started.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
    </>
  );
}
