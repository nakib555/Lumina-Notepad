import { useState, useEffect } from "react";
import { useNotes } from "@/hooks/use-notes";
import { Sidebar } from "@/components/sidebar";
import { Editor } from "@/components/editor";

export default function App() {
  const {
    notes,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    isLoaded
  } = useNotes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('lumina-theme') || 'light');

  useEffect(() => {
    localStorage.setItem('lumina-theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'fancy', 'rainbow');
    if (theme !== 'light') {
      root.classList.add(theme);
    }
  }, [theme]);

  // Handle initial screen size and resize events
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fcfcfc]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200"></div>
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#fcfcfc] overflow-hidden relative">
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />
      <Editor
        note={activeNote}
        onUpdateNote={updateNote}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
}
