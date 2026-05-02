import { useState, useRef, useEffect } from "react";
import { Excalidraw, exportToSvg, loadLibraryFromBlob } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, PenTool, Maximize2, Minimize2, Check, X, Library, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Set the path to load excalidraw assets (fonts) to fix the TypeError: Failed to fetch
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).EXCALIDRAW_ASSET_PATH = "https://unpkg.com/@excalidraw/excalidraw@0.18.1/dist/prod/";
}

interface SketchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (svgString: string, stateString?: string) => void;
  initialStateString?: string;
}

interface ExcalidrawLibrary {
  id: string;
  name: string;
  description: string;
  authors: { name: string; url: string }[];
  source: string;
  preview: string;
  created: string;
  updated: string;
}

export function SketchDialog({ isOpen, onClose, onSave, initialStateString }: SketchDialogProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawAPIRef = useRef<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showLibraryBrowser, setShowLibraryBrowser] = useState(false);
  const [publicLibraries, setPublicLibraries] = useState<ExcalidrawLibrary[]>([]);
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(false);
  const [installingLibraryId, setInstallingLibraryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLibraries = publicLibraries.filter(lib => 
    lib.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lib.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lib.authors?.some(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenLibraryBrowser = () => {
    setShowLibraryBrowser((prev) => !prev);
    if (!showLibraryBrowser && publicLibraries.length === 0) {
      setIsLoadingLibraries(true);
      fetch("https://libraries.excalidraw.com/libraries.json")
        .then((res) => res.json())
        .then((data) => setPublicLibraries(data))
        .catch((err) => {
          console.error("Failed to load libraries", err);
          toast.error("Failed to load public libraries");
        })
        .finally(() => setIsLoadingLibraries(false));
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // We use an interval to periodically check for the "Browse libraries" button that Excalidraw renders
    // in its library empty state, and hijack it to open our custom inline library menu instead.
    const intervalId = setInterval(() => {
      const elements = document.querySelectorAll('.excalidraw button, .excalidraw a');
      elements.forEach((el) => {
        if (el.textContent === 'Browse libraries' && !el.hasAttribute('data-custom-library-handler')) {
          el.setAttribute('data-custom-library-handler', 'true');
          
          if (el.tagName === 'A') {
            el.removeAttribute('href');
            el.removeAttribute('target');
          }

          // We use capture phase so we can stop propagation before Excalidraw's React handlers trigger window.open
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowLibraryBrowser(true);
            
            // Trigger fetch if empty
            if (publicLibraries.length === 0) {
              setIsLoadingLibraries(true);
              fetch("https://libraries.excalidraw.com/libraries.json")
                .then((res) => res.json())
                .then((data) => setPublicLibraries(data))
                .catch((err) => {
                  console.error("Failed to load libraries", err);
                  toast.error("Failed to load public libraries");
                })
                .finally(() => setIsLoadingLibraries(false));
            }
          }, true);
        }
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isOpen, publicLibraries.length]);

  const handleInstallLibrary = async (library: ExcalidrawLibrary) => {
    if (!excalidrawAPIRef.current) return;
    setInstallingLibraryId(library.id);
    try {
      const res = await fetch(`https://libraries.excalidraw.com/libraries/${library.source}`);
      if (!res.ok) throw new Error("Failed to download library");
      const blob = await res.blob();
      const libraryItems = await loadLibraryFromBlob(blob, "published");
      
      // Add to current library
      excalidrawAPIRef.current.updateLibrary({
        libraryItems,
        merge: true,
        openLibrary: true
      });
      
      toast.success(`Installed ${library.name}!`);
      setShowLibraryBrowser(false);
    } catch (err) {
      console.error("Failed to install library", err);
      toast.error(`Failed to install ${library.name}`);
    } finally {
      setInstallingLibraryId(null);
    }
  };

  const handleSave = async () => {
    if (!excalidrawAPIRef.current) return;
    setIsExporting(true);
    
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      
      if (!elements || elements.length === 0) {
        toast.error("Sketch is empty!");
        setIsExporting(false);
        return;
      }
      
      const svg = await exportToSvg({
        elements,
        appState: {
          ...appState,
          exportWithDarkMode: false,
          exportBackground: true,
        },
        files: excalidrawAPIRef.current.getFiles()
      });
      
      svg.setAttribute("width", "100%");
      svg.removeAttribute("height"); /* Remove the explicit height so it scales with viewBox */
      svg.style.maxWidth = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      
      const svgString = svg.outerHTML;
      const stateString = JSON.stringify({ elements });
      onSave(svgString, stateString);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to export sketch");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className={cn(
          "flex flex-col gap-0 p-0 transition-all duration-300 ease-in-out bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden",
          isFullscreen ? "max-w-[100vw] w-screen h-screen rounded-none" : "max-w-[95vw] w-full lg:max-w-6xl h-[90vh] sm:rounded-2xl lg:rounded-3xl"
        )}
      >
        <DialogHeader className="px-3 sm:px-5 py-3 flex-row items-center justify-between border-b shrink-0 bg-background/95 z-50">
          <DialogTitle className="flex items-center gap-2 m-0 text-foreground">
            <PenTool className="w-4 h-4 sm:w-5 sm:h-5 text-primary hidden sm:block" />
            <span className="font-semibold tracking-tight text-sm sm:text-base">Freehand Canvas</span>
          </DialogTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenLibraryBrowser}
              className="hidden sm:inline-flex rounded-full px-4 text-xs sm:text-sm font-medium mr-2"
            >
              <Library className="w-4 h-4 mr-1.5" />
              Public Libraries
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
              className="hidden sm:inline-flex rounded-full text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isExporting}
              className="sm:hidden w-8 h-8 rounded-full text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
            
            <Button 
              size="sm"
              onClick={handleSave} 
              disabled={isExporting} 
              className="rounded-full px-4 sm:px-6 flex items-center gap-1.5 sm:gap-2 shadow-sm h-8 sm:h-9 text-xs sm:text-sm"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-0 animate-spin" /> : <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {isExporting ? "Saving..." : "Insert"}
            </Button>

            <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted hidden sm:inline-flex"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 w-full relative isolate overflow-hidden bg-background">
          <div className="absolute inset-0 z-0 bg-grid-black/[0.02]" />
          <div className="absolute inset-0 z-10 w-full h-full">
            {isOpen && (
              <Excalidraw
                initialData={initialStateString ? JSON.parse(initialStateString) : undefined}
                excalidrawAPI={(api) => { excalidrawAPIRef.current = api; }}
                theme="light"
                UIOptions={{
                  canvasActions: {
                    changeViewBackgroundColor: true,
                    clearCanvas: true,
                    loadScene: false,
                    export: false,
                    saveToActiveFile: false,
                    saveAsImage: false,
                    toggleTheme: true,
                  }
                }}
              />
            )}
          </div>
          
          {/* Custom Public Library Browser Overlay */}
          {showLibraryBrowser && (
            <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[400px] bg-background/95 backdrop-blur-md border-l shadow-2xl z-[100] flex flex-col pt-2 animate-in slide-in-from-right-full duration-300">
              <div className="px-5 py-3 flex flex-col gap-3 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <Library className="w-4 h-4 mr-2 text-primary" />
                    Public Libraries
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowLibraryBrowser(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative group/search pb-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search libraries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-muted/40 border border-transparent focus:bg-background focus:border-primary/20 rounded-xl outline-none transition-all placeholder:text-muted-foreground/60 text-foreground shadow-sm focus:shadow-md focus:shadow-primary/5 focus:ring-0"
                  />
                </div>
              </div>
              
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {isLoadingLibraries ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p className="text-sm">Loading libraries...</p>
                  </div>
                ) : filteredLibraries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Search className="w-8 h-8 mb-4 opacity-50" />
                    <p className="text-sm">No libraries found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 pb-10">
                    {filteredLibraries.map((lib, index) => (
                      <div key={lib.id || index} className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
                        <div className="relative flex aspect-video items-center justify-center bg-muted/30 p-6 overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] opacity-50" />
                          <img 
                            src={`https://libraries.excalidraw.com/libraries/${lib.preview}`} 
                            alt={lib.name}
                            className="relative z-10 max-h-full max-w-full object-contain filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h4 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">{lib.name}</h4>
                          {lib.authors && lib.authors.length > 0 && (
                            <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mt-1 mb-2">
                              By {lib.authors.map(a => a.name).join(', ')}
                            </p>
                          )}
                          <p className="flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {lib.description}
                          </p>
                          <Button 
                            className="mt-5 w-full rounded-xl bg-primary/10 text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]"
                            size="sm"
                            onClick={() => handleInstallLibrary(lib)}
                            disabled={installingLibraryId === lib.id}
                          >
                            {installingLibraryId === lib.id ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Installing...</>
                            ) : (
                              <><Download className="mr-2 h-4 w-4" /> Add to Library</>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
