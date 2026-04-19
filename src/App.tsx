import { useState, useEffect } from "react";
import { useNotes } from "@/hooks/use-notes";
import { Sidebar } from "@/components/sidebar";
import { Editor } from "@/components/editor";
import { CommandPalette } from "@/components/command-palette";
import { AnimatePresence, motion } from "motion/react";
import { Feather, Layers, ArrowRight, Edit3, ImageIcon, Eye } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { AutoUpdater } from "@/components/auto-updater";
import { App as CapacitorApp } from "@capacitor/app";
import { toast } from "sonner";

const INTRO_SLIDES = [
  {
    icon: Feather,
    title: "Write with clarity",
    desc: "A distraction-free markdown environment designed to help you focus on what matters most—your thoughts.",
    button: "Next"
  },
  {
    icon: Edit3,
    title: "Rich Formatting Tools",
    desc: "Use the bottom floating toolbar for instant Markdown styles, or invoke robust Smart Tables and mathematical formulas.",
    button: "Next"
  },
  {
    icon: ImageIcon,
    title: "Media & Code Options",
    desc: "Seamlessly insert images that automatically resize, plus insert logic-driven syntax highlighted code blocks for your programming needs.",
    button: "Next"
  },
  {
    icon: Layers,
    title: "Organize effortlessly",
    desc: "Use context tags to keep your notes perfectly organized without any manual work.",
    button: "Next"
  },
  {
    icon: Eye,
    title: "View Mode & Exports",
    desc: "Toggle Read-Only View mode to safely review your notes lock-in, and securely export them as PDF, Markdown, or Plain Text files.",
    button: "Get Started"
  }
];

export default function App() {
  const {
    notes,
    folders,
    activeNoteId,
    activeNote,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderNote,
    reorderFolder,
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
        const hasSeenOnboarding = localStorage.getItem('lumina-onboarding-v2');
        if (hasSeenOnboarding) {
          setShowIntro(false);
        } else {
          setIntroStep(1);
        }
      }, 2000); // 2 seconds of aesthetic intro
      return () => clearTimeout(timer);
    }
  }, [isLoaded, introStep]);

  // Double tap back button to exit app (Android/Capacitor)
  useEffect(() => {
    let lastTimeBackPress = 0;
    const timePeriodToExit = 2000; // 2 seconds

    const handleBackButton = async () => {
      const timeNow = new Date().getTime();
      if (timeNow - lastTimeBackPress < timePeriodToExit) {
        // Exit app on double tap
        await CapacitorApp.exitApp();
      } else {
        toast("Press back again to exit");
        lastTimeBackPress = timeNow;
      }
    };

    const backButtonListener = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, []);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Handle opening files from Android Action VIEW/EDIT intents
  useEffect(() => {
    if (!isLoaded) return;

    const decodeBase64UTF8 = (b64: string) => {
      try {
        const binString = atob(b64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
          bytes[i] = binString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
      } catch (e) {
        console.error("Base64 decode error", e);
        return "";
      }
    };

    const processIncomingFile = async (fileDetail: { base64Name: string, base64Content: string }) => {
        if (!fileDetail || !fileDetail.base64Content) return;
        const fileName = decodeBase64UTF8(fileDetail.base64Name);
        
        const isZip = fileName.toLowerCase().endsWith('.zip') || fileDetail.base64Content.startsWith('UEsD');
        
        if (isZip) {
            try {
                // Decode base64 to binary
                const binaryString = atob(fileDetail.base64Content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();
                const result = await zip.loadAsync(bytes);
                
                const pathToId: Record<string, string> = {};
                const fileEntries = Object.entries(result.files).filter(([, f]) => !f.dir);

                let importedCount = 0;

                for (const [relativePath, fileEntry] of fileEntries) {
                   if (relativePath.includes('__MACOSX')) continue; 
                   if (relativePath.split('/').some(p => p.startsWith('.') && p !== '.' && p !== '..')) continue;

                   const extension = relativePath.split('.').pop()?.toLowerCase();
                   if (!['md', 'txt'].includes(extension || '')) continue;

                   const pathParts = relativePath.split('/');
                   const entryFileName = pathParts.pop();
                   
                   let currentParentId: string | null = null; 
                   let currentPathPath = "";

                   for (const part of pathParts) {
                     if (!part) continue;
                     currentPathPath = currentPathPath ? `${currentPathPath}/${part}` : part;
                     if (pathToId[currentPathPath]) {
                       currentParentId = pathToId[currentPathPath];
                     } else {
                       const tempParentId = currentParentId;
                       // createFolder is synchronous for returning ID
                       const newId = createFolder(part, tempParentId) as string;
                       currentParentId = newId;
                       pathToId[currentPathPath] = currentParentId;
                     }
                   }

                   const text = await fileEntry.async('text');
                   let title = entryFileName?.replace(/\.[^/.]+$/, "") || "Untitled"; 
                   const headingMatch = text.match(/^#+\s+(.*)/);
                   let content = text;
                   if (headingMatch && headingMatch[1]) {
                      title = headingMatch[1].trim(); 
                      content = content.replace(/^#+\s+.*\n?/, "").trimStart();
                   }
                   createNote(title, content, currentParentId || undefined);
                   importedCount++;
                }
                toast.success(`Imported ${importedCount} files from ZIP`);
            } catch (err) {
                console.error("Failed to parse zip", err);
                toast.error("Failed to read ZIP file");
            }
            return;
        }

        const title = fileName.replace(/\.(md|txt)$/i, '');
        const content = decodeBase64UTF8(fileDetail.base64Content);
        
        // Use a unique ID marker so we only process it once per file payload
        const processMarker = `processed-${fileDetail.base64Name}-${fileDetail.base64Content.length}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any)[processMarker]) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)[processMarker] = true;

        // Check if a note with this title already exists to avoid duplicates
        const existingNote = notes.find(n => n.title === title);
        if (existingNote) {
           updateNote(existingNote.id, { content });
           handleSelectNote(existingNote.id);
           toast.success(`Updated "${title}"`);
        } else {
           const newId = createNote();
           updateNote(newId, { title, content });
           handleSelectNote(newId);
           toast.success(`Opened "${title}"`);
        }
    };

    const handleOpenFile = (e: Event) => {
      const customEvent = e as CustomEvent;
      processIncomingFile(customEvent.detail);
    };

    // Check if there's already one queued up from extremely early launch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).luminaInitialFile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      processIncomingFile((window as any).luminaInitialFile);
    }

    window.addEventListener('lumina-open-file', handleOpenFile);
    return () => {
      window.removeEventListener('lumina-open-file', handleOpenFile);
    };
  }, [isLoaded, notes, createNote, updateNote, setActiveNoteId, createFolder, handleSelectNote]);

  const nextStep = () => {
    if (introStep < INTRO_SLIDES.length) {
      setIntroStep(introStep + 1);
    } else {
      localStorage.setItem('lumina-onboarding-v2', 'true');
      setShowIntro(false);
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
                className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-transparent border border-primary/10 overflow-hidden"
              >
                <img src="/logo.svg" alt="App Logo" className="w-16 h-16 drop-shadow-xl" />
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

          {showIntro && introStep > 0 && introStep <= INTRO_SLIDES.length && (() => {
            const slide = INTRO_SLIDES[introStep - 1];
            const IconComponent = slide.icon;
            return (
              <motion.div
                key={`step${introStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center max-w-md text-center px-6"
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
                  className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center mb-8 text-primary border border-primary/10 relative overflow-hidden"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-4 bg-gradient-to-tr from-transparent via-primary/10 to-transparent opacity-50"
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10"
                  >
                    <IconComponent className="w-10 h-10" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-3xl font-light mb-4 text-foreground"
                >
                  {slide.title}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-muted-foreground mb-12 leading-relaxed text-lg"
                >
                  {slide.desc}
                </motion.p>
                <motion.button 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  onClick={nextStep} 
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-full hover:opacity-90 font-medium"
                >
                  {slide.button} <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {showIntro && introStep > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-12 flex gap-3"
          >
            {INTRO_SLIDES.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all duration-500 ${introStep === idx + 1 ? 'bg-primary w-6' : 'bg-primary/20'}`} 
              />
            ))}
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
          <AutoUpdater />
          <Sidebar 
            notes={notes}
            folders={folders}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onCreateNote={createNote}
            onDeleteNote={deleteNote}
            onCreateFolder={createFolder}
            onUpdateFolder={updateFolder}
            onDeleteFolder={deleteFolder}
            onMoveNote={(noteId, folderId, referenceId, position) => reorderNote(noteId, folderId, referenceId, position)}
            onMoveFolder={(folderId, parentId, referenceId, position) => reorderFolder(folderId, parentId, referenceId, position)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            theme={theme}
            onThemeChange={setTheme}
          />
          <Editor
            note={activeNote}
            notes={notes}
            onSelectNote={handleSelectNote}
            onCreateNote={createNote}
            onDeleteNote={deleteNote}
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
