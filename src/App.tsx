import { useState, useEffect } from "react";
import { useNotes } from "@/hooks/use-notes";
import { Sidebar } from "@/components/sidebar";
import { Editor } from "@/components/editor";
import { CommandPalette } from "@/components/command-palette";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, Feather, Layers, ArrowRight } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

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

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 768px)').matches;
    }
    return true;
  });
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('lumina-theme') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('lumina-font') || 'sans');
  const [showIntro, setShowIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);

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
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);

  // Handle intro screen timing
  useEffect(() => {
    if (isLoaded && introStep === 0) {
      const timer = setTimeout(() => {
        const hasSeenOnboarding = localStorage.getItem('lumina-onboarding-v1');
        if (hasSeenOnboarding) {
          setShowIntro(false);
        } else {
          setIntroStep(1);
        }
      }, 2000); // 2 seconds of aesthetic intro
      return () => clearTimeout(timer);
    }
  }, [isLoaded, introStep]);

  const nextStep = () => {
    if (introStep === 1) {
      setIntroStep(2);
    } else {
      localStorage.setItem('lumina-onboarding-v1', 'true');
      setShowIntro(false);
    }
  };

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <ErrorBoundary>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ 
          opacity: showIntro ? 1 : 0,
          scale: showIntro ? 1 : 1.02,
          filter: showIntro ? "blur(0px)" : "blur(8px)",
          pointerEvents: showIntro ? "auto" : "none"
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      >
        <AnimatePresence mode="wait">
          {showIntro && introStep === 0 && (
            <motion.div
              key="step0"
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(4px)" }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-8"
            >
              <motion.div
                animate={{ 
                  boxShadow: ["0px 0px 0px 0px rgba(var(--primary), 0)", "0px 0px 40px 0px rgba(var(--primary), 0.2)", "0px 0px 0px 0px rgba(var(--primary), 0)"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-primary/5 text-primary border border-primary/10"
              >
                <Sparkles className="w-10 h-10" strokeWidth={1} />
                <motion.div 
                  className="absolute inset-0 rounded-3xl border border-primary/20"
                  animate={{ rotate: 180, scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              
              <div className="flex flex-col items-center gap-3">
                <motion.h1 
                  initial={{ opacity: 0, letterSpacing: "0.1em" }}
                  animate={{ opacity: 1, letterSpacing: "0.25em" }}
                  transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
                  className="text-2xl font-light text-foreground uppercase ml-[0.25em]"
                >
                  Lumina
                </motion.h1>
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "40px", opacity: 1 }}
                  transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                  className="h-px bg-primary/40"
                />
              </div>
            </motion.div>
          )}

          {showIntro && introStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center max-w-md text-center px-6"
            >
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-8 text-primary border border-primary/10">
                <Feather className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-light mb-4 text-foreground">Write with clarity</h2>
              <p className="text-muted-foreground mb-12 leading-relaxed text-lg">
                A distraction-free markdown environment designed to help you focus on what matters most—your thoughts.
              </p>
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95 font-medium"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {showIntro && introStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center max-w-md text-center px-6"
            >
              <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-8 text-primary border border-primary/10">
                <Layers className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl font-light mb-4 text-foreground">Organize effortlessly</h2>
              <p className="text-muted-foreground mb-12 leading-relaxed text-lg">
                Use tags and dynamic smart folders to keep your notes perfectly organized without the manual work.
              </p>
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full hover:opacity-90 transition-all hover:scale-105 active:scale-95 font-medium"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {showIntro && introStep > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-12 flex gap-3"
          >
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${introStep === 1 ? 'bg-primary w-6' : 'bg-primary/20'}`} />
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${introStep === 2 ? 'bg-primary w-6' : 'bg-primary/20'}`} />
          </motion.div>
        )}
      </motion.div>

      {isLoaded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: showIntro ? 0 : 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex h-full w-full bg-background overflow-hidden relative"
        >
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
        </motion.div>
      )}
    </ErrorBoundary>
  );
}
