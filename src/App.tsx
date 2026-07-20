import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useNotes } from "@/hooks/use-notes";
import { motion, AnimatePresence } from "motion/react";
import { ErrorBoundary } from "@/components/error-boundary";
import { AutoUpdater } from "@/components/auto-updater";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { IntroSequence } from "@/components/intro-sequence";
import { SplashScreen } from "@/components/splash-screen";
import { SidebarSkeleton, EditorSkeleton } from "@/components/ui/skeleton-loaders";
import { cn } from "@/lib/utils";
import { loadGoogleFont } from "@/components/editor/font-loader";

const Editor = lazy(() => import("@/components/editor.tsx").then(m => ({ default: m.Editor })));
const CommandPalette = lazy(() => import("@/components/command-palette.tsx").then(m => ({ default: m.CommandPalette })));
const Sidebar = lazy(() => import("@/components/sidebar.tsx").then(m => ({ default: m.Sidebar })));



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

  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    return localStorage.getItem('lumina-has-seen-intro') === 'true';
  });
  const [showSplash, setShowSplash] = useState(true);

  // Memoize handlers to prevent effect re-runs inside splash/intro
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  const handleIntroComplete = useCallback(() => {
    setHasSeenIntro(true);
    localStorage.setItem('lumina-has-seen-intro', 'true');
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('lumina-theme') || 'light');
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('lumina-font') || 'sans');
  const [baseFontSize, setBaseFontSize] = useState<string>(() => localStorage.getItem('lumina-base-font-size') || 'text-base');
  const [powerSaver, setPowerSaver] = useState<boolean>(() => localStorage.getItem('lumina-power-saver') === 'true');

  useEffect(() => {
    localStorage.setItem('lumina-base-font-size', baseFontSize);
  }, [baseFontSize]);

  useEffect(() => {
    localStorage.setItem('lumina-power-saver', powerSaver.toString());
  }, [powerSaver]);

  useEffect(() => {
    localStorage.setItem('lumina-theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'fancy', 'rainbow', 'dracula', 'nord');
    if (theme !== 'light') {
      root.classList.add(theme);
    }
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(console.error);
        StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0f172a' : '#ffffff' }).catch(console.error);
      } catch (e) {
        console.error("Failed to set status bar", e);
      }
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lumina-font', fontFamily);
    const root = window.document.documentElement;
    root.classList.remove('font-sans', 'font-serif', 'font-mono', 'font-poppins', 'font-inter', 'font-lora', 'font-jetbrains');
    
    const lowerFont = fontFamily.toLowerCase();
    const isStandard = ['poppins', 'inter', 'lora', 'jetbrains', 'sans', 'serif', 'mono'].includes(lowerFont);

    if (isStandard) {
      root.style.removeProperty('--font-sans');
      let fontClass = 'font-sans';
      if (fontFamily === 'poppins') fontClass = 'font-poppins';
      else if (fontFamily === 'inter') fontClass = 'font-inter';
      else if (fontFamily === 'lora') fontClass = 'font-lora';
      else if (fontFamily === 'jetbrains') fontClass = 'font-jetbrains';
      else if (fontFamily === 'serif') fontClass = 'font-serif';
      else if (fontFamily === 'mono') fontClass = 'font-mono';
      
      root.classList.add(fontClass);
    } else {
      // Dynamic Google Font selected!
      loadGoogleFont(fontFamily);
      root.style.setProperty('--font-sans', `"${fontFamily}", sans-serif`);
      root.classList.add('font-sans');
    }
  }, [fontFamily]);



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

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [setActiveNoteId]);

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

        // Use a unique ID marker so we only process it once per file payload
        // This is extremely important because createNote/createFolder triggers state updates and 
        // re-runs this useEffect. Without it, ZIP or multi-file open triggers an infinite loop!
        const processMarker = `processed-${fileDetail.base64Name}-${fileDetail.base64Content.length}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any)[processMarker]) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)[processMarker] = true;

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

                for (const [rawPath, fileEntry] of fileEntries) {
                   const relativePath = rawPath.replace(/\\/g, '/');
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

  return (
    <ErrorBoundary>
      {isLoaded && (
        <>
          <AnimatePresence mode="wait">
            {showSplash ? (
              <SplashScreen key="splash" onComplete={handleSplashComplete} />
            ) : !hasSeenIntro ? (
              <IntroSequence key="intro" onComplete={handleIntroComplete} />
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {(!showSplash && hasSeenIntro) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-[100dvh] w-full bg-background overflow-hidden relative print:block print:h-auto print:overflow-visible print:bg-white"
              >
          <AutoUpdater />
          <Suspense fallback={<SidebarSkeleton className={cn(isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden")} />}>
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
              powerSaver={powerSaver}
              onPowerSaverChange={setPowerSaver}
              baseFontSize={baseFontSize}
              onBaseFontSizeChange={setBaseFontSize}
            />
          </Suspense>
          <Suspense fallback={<EditorSkeleton />}>
            <Editor
              note={activeNote}
              notes={notes}
              onSelectNote={handleSelectNote}
              onCreateNote={createNote}
              onDeleteNote={deleteNote}
              onUpdateNote={updateNote}
              onToggleSidebar={() => {
                setIsSidebarOpen(!isSidebarOpen);
              }}
              theme={theme}
              fontFamily={fontFamily}
              onFontFamilyChange={setFontFamily}
              baseFontSize={baseFontSize}
              onBaseFontSizeChange={setBaseFontSize}
              powerSaver={powerSaver}
            />
          </Suspense>
          <Suspense fallback={null}>
            <CommandPalette 
              notes={notes}
              onSelectNote={handleSelectNote}
              onCreateNote={createNote}
              onThemeChange={setTheme}
            />
          </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </ErrorBoundary>
  );
}
