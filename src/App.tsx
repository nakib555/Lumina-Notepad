import { useState, useEffect } from "react";
import { useNotes } from "@/hooks/use-notes";
import { Sidebar } from "@/components/sidebar";
import { Editor } from "@/components/editor";
import { CommandPalette } from "@/components/command-palette";

export default function App() {
  const {
    notes,
    smartFolders,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    createSmartFolder,
    updateSmartFolder,
    deleteSmartFolder,
    isLoaded
  } = useNotes();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('lumina-theme') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('lumina-font') || 'sans');

  useEffect(() => {
    localStorage.setItem('lumina-theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'fancy', 'rainbow', 'dracula', 'nord');
    if (theme !== 'light') {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lumina-font', fontFamily);
    const root = window.document.documentElement;
    root.classList.remove('font-sans', 'font-serif', 'font-mono');
    root.classList.add(`font-${fontFamily}`);
  }, [fontFamily]);

  // Handle initial screen size and resize events
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    const handleMediaQueryChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsSidebarOpen(e.matches);
    };
    
    // Set initial state
    handleMediaQueryChange(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted"></div>
          <div className="h-4 w-24 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      <Sidebar 
        notes={notes}
        smartFolders={smartFolders}
        activeNoteId={activeNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onCreateSmartFolder={createSmartFolder}
        onUpdateSmartFolder={updateSmartFolder}
        onDeleteSmartFolder={deleteSmartFolder}
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
        fontFamily={fontFamily}
        onFontFamilyChange={setFontFamily}
      />
      <CommandPalette 
        notes={notes}
        onSelectNote={handleSelectNote}
        onCreateNote={createNote}
        onThemeChange={setTheme}
      />
    </div>
  );
}
