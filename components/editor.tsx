import { useState, useRef, useEffect, useCallback, Suspense, lazy } from "react";
import TextareaAutosize from 'react-textarea-autosize';
import { Note } from "@/hooks/use-notes";
import { EditorHeader } from "./editor/editor-header";
import { BottomBar } from "./editor/bottom-bar";
import { MetadataBar } from "./editor/metadata-bar";
import { EditorArea, EditorAreaRef } from "./editor/editor-area";
import { useEditorFormatting } from "./editor/use-editor-formatting";
import { useEditorHistory } from "./editor/use-editor-history";
import { useEditorExport } from "./editor/use-editor-export";
import { useEditorLogic } from "./editor/use-editor-logic";
import { useDraggable } from "./editor/use-draggable";
import { FileText, Menu, Plus, Check, PenTool, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const SketchDialog = lazy(() => import('./editor/sketch-dialog').then(module => ({ default: module.SketchDialog })));
const ImageInsertDialog = lazy(() => import('./editor/image-insert-dialog').then(module => ({ default: module.ImageInsertDialog })));
const LinkEditDialog = lazy(() => import('./editor/link-edit-dialog').then(module => ({ default: module.LinkEditDialog })));

interface EditorProps {
  note: Note | null;
  notes?: Note[];
  onSelectNote?: (id: string) => void;
  onCreateNote?: (title?: string, content?: string) => void;
  onDeleteNote?: (id: string) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onToggleSidebar: () => void;
  theme: string;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

export function Editor({ 
  note,
  onCreateNote,
  onUpdateNote, 
  onToggleSidebar,
  theme,
  fontFamily,
  onFontFamilyChange
}: EditorProps) {
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const symbolScrollRef = useRef<HTMLDivElement>(null);

  const [showSymbolMenu, setShowSymbolMenu] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showSketchDialog, setShowSketchDialog] = useState(false);
  const [hasLoadedSketch, setHasLoadedSketch] = useState(false);
  const [pendingSketchSvg, setPendingSketchSvg] = useState<string | null>(null);
  const [pendingSketchState, setPendingSketchState] = useState<string | null>(null);
  const [showSketchConfirm, setShowSketchConfirm] = useState(false);
  const [initialLinkText, setInitialLinkText] = useState('');
  const [isAutoMarkdownEnabled, setIsAutoMarkdownEnabled] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  const {
    history,
    historyIndex,
    saveStatus,
    addToHistory,
    handleUndo,
    handleRedo
  } = useEditorHistory(note, onUpdateNote);

  const {
    textareaRef,
    tagInput,
    setTagInput,
    folderInput,
    setFolderInput,
    handleContentChange,
    handleDrop,
    handleDragOver,
    handleAddTag,
    onTagKeyDown,
    removeTag,
    updateFolder,
    getStats
  } = useEditorLogic(note, onUpdateNote, addToHistory);

  const editorAreaRef = useRef<EditorAreaRef>(null);

  const {
    showExportMenu,
    setShowExportMenu,
    showCopyMenu,
    setShowCopyMenu,
    exportNote,
    handleCopyNote,
    downloadLogs
  } = useEditorExport(note);

  const { applyFormatting, applyFontSize } = useEditorFormatting(
    note,
    onUpdateNote,
    textareaRef
  );

  const {
    isDragging,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove
  } = useDraggable(toolbarRef);

  const {
    isDragging: isSymbolDragging,
    handleMouseDown: handleSymbolMouseDown,
    handleMouseLeave: handleSymbolMouseLeave,
    handleMouseUp: handleSymbolMouseUp,
    handleMouseMove: handleSymbolMouseMove
  } = useDraggable(symbolScrollRef);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isViewMode) return;
    const newTitle = e.target.value;
    onUpdateNote(note!.id, { title: newTitle });
    addToHistory(newTitle, note!.content);
  };

  const handleInsertLink = (url: string, text: string) => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current);
      }
      
      const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      document.execCommand('insertHTML', false, linkHTML);
      
      if (editorAreaRef.current) {
        editorAreaRef.current.flushPreviewEdit();
      }
    }
  };

  const handleInsertImageUrl = (url: string, alt: string) => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current);
      }
      document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" style="max-width: 100%;" /><p>&#8203;</p>`);
      if (editorAreaRef.current) {
        editorAreaRef.current.flushPreviewEdit();
      }
      toast.success("Image added successfully");
    }
  };

  const handleInsertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (savedRangeRef.current) {
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(savedRangeRef.current);
        }
        document.execCommand('insertHTML', false, `<img src="${base64String}" alt="Uploaded Image" style="max-width: 100%;" /><p>&#8203;</p>`);
        if (editorAreaRef.current) {
          editorAreaRef.current.flushPreviewEdit();
        }
        toast.success("Image added successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSketchDialogSave = (svgString: string, stateString?: string) => {
    setPendingSketchSvg(svgString);
    if (stateString) setPendingSketchState(stateString);
    savedRangeRef.current = null;
    toast.info("Click anywhere in the editor to place your sketch.", { duration: 4000 });
  };

  const handleEditorClickForSketch = () => {
    if (pendingSketchSvg) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
      setShowSketchConfirm(true);
    }
  };

  const confirmInsertSketch = () => {
    if (textareaRef.current && pendingSketchSvg) {
      textareaRef.current.focus();
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedRangeRef.current);
      }
      
      const stateAttr = pendingSketchState ? ` data-excalidraw='${pendingSketchState.replace(/'/g, "&apos;")}'` : '';
      const payload = `<div class="sketch-container my-4 inline-block w-full max-w-full overflow-hidden print:overflow-visible print:break-inside-avoid flex justify-center items-center p-4 bg-white dark:bg-zinc-100/50 rounded-xl border border-border/50" contenteditable="false"${stateAttr}>${pendingSketchSvg}&#8203;</div><p>&#8203;</p>`;
      document.execCommand('insertHTML', false, payload);
      
      if (editorAreaRef.current) {
        editorAreaRef.current.flushPreviewEdit();
      }
      setPendingSketchSvg(null);
      setPendingSketchState(null);
      setShowSketchConfirm(false);
      savedRangeRef.current = null;
      toast.success("Sketch inserted!");
    }
  };

  const reselectSketchLocation = () => {
    setShowSketchConfirm(false);
    savedRangeRef.current = null;
    toast.info("Click anywhere in the editor to place your sketch.", { duration: 4000 });
  };
  
  const cancelSketchPlacement = () => {
    setPendingSketchSvg(null);
    setShowSketchConfirm(false);
    savedRangeRef.current = null;
  };

  const onUndo = useCallback(() => {
    let currentContent: string | undefined = undefined;
    if (editorAreaRef.current) {
      currentContent = editorAreaRef.current.flushPreviewEdit();
    }
    handleUndo(currentContent);
  }, [handleUndo]);

  const onRedo = useCallback(() => {
    if (editorAreaRef.current) {
      editorAreaRef.current.flushPreviewEdit();
    }
    handleRedo();
  }, [handleRedo]);

  // Keyboard shortcuts for Undo/Redo and outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (symbolMenuRef.current && !symbolMenuRef.current.contains(event.target as Node)) {
        setShowSymbolMenu(false);
      }
      if (copyMenuRef.current && !copyMenuRef.current.contains(event.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isViewMode) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          onRedo();
        } else {
          e.preventDefault();
          onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onUndo, onRedo, setShowExportMenu, setShowCopyMenu, isViewMode]);

  if (!note) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative items-center justify-center">
        <div className="absolute top-0 left-0 w-full p-4 flex items-center">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-muted-foreground md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-5 text-center max-w-sm px-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center border border-border/50 shadow-sm">
            <FileText className="w-10 h-10 text-muted-foreground/40 stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl text-foreground font-medium tracking-tight">No note selected</h3>
            <p className="text-sm text-muted-foreground/80 leading-relaxed">
              Select a note from the sidebar to start reading, or create a new one to capture your thoughts.
            </p>
          </div>
          <Button onClick={() => onCreateNote?.()} className="mt-4 gap-2 rounded-full px-8 shadow-sm">
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </Button>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className={cn(
      "flex-1 flex flex-col h-full overflow-hidden bg-background relative print:h-auto print:overflow-visible",
      fontFamily === "serif" ? "font-serif" : fontFamily === "mono" ? "font-mono" : "font-sans"
    )}>
      {/* Toolbar */}
      <EditorHeader 
        onToggleSidebar={onToggleSidebar}
        handleUndo={onUndo}
        handleRedo={onRedo}
        historyIndex={historyIndex}
        historyLength={history.length}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        exportMenuRef={exportMenuRef}
        exportNote={exportNote}
        showCopyMenu={showCopyMenu}
        setShowCopyMenu={setShowCopyMenu}
        copyMenuRef={copyMenuRef}
        handleCopyNote={handleCopyNote}
        stats={stats}
        saveStatus={saveStatus}
        downloadLogs={downloadLogs}
        isViewMode={isViewMode}
        setIsViewMode={setIsViewMode}
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar print:overflow-visible print:bg-white print:text-black flex justify-center">
        <div className="flex-1 w-full max-w-4xl px-8 pt-10 pb-24 md:px-12 md:pt-16 md:pb-32 print:p-0 flex flex-col gap-4 md:gap-5 min-h-full">
          <TextareaAutosize
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Note Title"
            autoComplete="off"
            readOnly={isViewMode}
            className={cn("w-full text-4xl md:text-5xl font-bold text-foreground placeholder:text-muted-foreground/30 border-none outline-none bg-transparent tracking-tight print:text-black print:text-center resize-none p-0 m-0 leading-tight shrink-0 whitespace-pre-wrap break-words overflow-hidden", isViewMode && "cursor-default")}
          />
          
          {/* Tag Management */}
          {!isViewMode && (
            <div className="shrink-0 flex justify-center w-full">
              <MetadataBar 
                note={note}
                tagInput={tagInput}
                setTagInput={setTagInput}
                onTagKeyDown={onTagKeyDown}
                handleAddTag={handleAddTag}
                removeTag={removeTag}
                folderInput={folderInput}
                setFolderInput={setFolderInput}
                updateFolder={updateFolder}
                onSetReminder={(schedTime) => {
                   onUpdateNote(note.id, { reminderAt: schedTime.getTime() });
                   toast.success(`Reminder set for ${schedTime.toLocaleTimeString()}`);
                   // Actual capacitor notification schedule
                   import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
                      const perm = await LocalNotifications.checkPermissions();
                      if (perm.display !== 'granted') {
                         await LocalNotifications.requestPermissions();
                      }
                      LocalNotifications.schedule({
                        notifications: [
                          {
                            title: `Reminder: ${note.title}`,
                            body: 'Time to check your note!',
                            id: Math.floor(Math.random() * 100000),
                            schedule: { at: schedTime }
                          }
                        ]
                      }).catch(err => console.error("Could not schedule notification:", err));
                   }).catch(err => console.error(err));
                }}
              />
            </div>
          )}
          
          <div 
            className={cn("flex-1 mt-2 transition-all", pendingSketchSvg && !showSketchConfirm && "cursor-crosshair ring-2 ring-primary/50 ring-offset-2 rounded-xl border border-primary border-dashed p-2 bg-primary/5")}
            onMouseUp={pendingSketchSvg && !showSketchConfirm ? handleEditorClickForSketch : undefined}
          >
            <EditorArea 
              editorAreaRef={editorAreaRef}
              content={note.content}
              theme={theme}
              handleContentChange={handleContentChange}
              handleDrop={handleDrop}
              handleDragOver={handleDragOver}
              noteId={note.id}
              textareaRef={textareaRef}
              isAutoMarkdownEnabled={isAutoMarkdownEnabled}
              isViewMode={isViewMode}
              isEraserMode={isEraserMode}
            />
          </div>
        </div>
      </div>

      {/* Bottom Formatting Bar */}
      {!isViewMode && (
        <div>
          <BottomBar 
            symbolMenuRef={symbolMenuRef}
            showSymbolMenu={showSymbolMenu}
            setShowSymbolMenu={setShowSymbolMenu}
            symbolScrollRef={symbolScrollRef}
            handleSymbolMouseDown={handleSymbolMouseDown}
            handleSymbolMouseLeave={handleSymbolMouseLeave}
            handleSymbolMouseUp={handleSymbolMouseUp}
            handleSymbolMouseMove={handleSymbolMouseMove}
            isSymbolDragging={isSymbolDragging}
            applyFormatting={applyFormatting}
            toolbarRef={toolbarRef}
            isDragging={isDragging}
            handleMouseDown={handleMouseDown}
            handleMouseLeave={handleMouseLeave}
            handleMouseUp={handleMouseUp}
            handleMouseMove={handleMouseMove}
            fontFamily={fontFamily}
            onFontFamilyChange={onFontFamilyChange}
            applyFontSize={applyFontSize}
            isEraserMode={isEraserMode}
            setIsEraserMode={setIsEraserMode}
            textareaRef={textareaRef}
            isAutoMarkdownEnabled={isAutoMarkdownEnabled}
            setIsAutoMarkdownEnabled={setIsAutoMarkdownEnabled}
            onInsertImageClick={() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                savedRangeRef.current = selection.getRangeAt(0).cloneRange();
              } else {
                savedRangeRef.current = null;
              }
              setShowImageDialog(true);
            }}
            onInsertLinkClick={() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                savedRangeRef.current = selection.getRangeAt(0).cloneRange();
                setInitialLinkText(selection.toString());
              } else {
                savedRangeRef.current = null;
                setInitialLinkText('');
              }
              setShowLinkDialog(true);
            }}
            onInsertSketchClick={() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                savedRangeRef.current = selection.getRangeAt(0).cloneRange();
              } else {
                savedRangeRef.current = null;
              }
              setHasLoadedSketch(true);
              setShowSketchDialog(true);
            }}
          />
        </div>
      )}

      <Suspense fallback={null}>
        <ImageInsertDialog 
          isOpen={showImageDialog}
          onClose={() => setShowImageDialog(false)}
          onInsertUrl={handleInsertImageUrl}
          onInsertFile={handleInsertImageFile}
        />
        <LinkEditDialog
          isOpen={showLinkDialog}
          onClose={() => setShowLinkDialog(false)}
          onConfirm={handleInsertLink}
          initialText={initialLinkText}
        />
      </Suspense>

      {hasLoadedSketch && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"><span className="flex flex-col items-center gap-2 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin text-primary" /> Loading Sketch...</span></div>}>
          <SketchDialog 
            isOpen={showSketchDialog}
            onClose={() => setShowSketchDialog(false)}
            onSave={handleSketchDialogSave}
          />
        </Suspense>
      )}

      <Dialog open={showSketchConfirm} onOpenChange={(open) => !open && cancelSketchPlacement()}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-2rem)] mx-auto overflow-hidden p-0 border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 rounded-[1.5rem]">
          <div className="p-5 sm:p-7 flex flex-col">
            <DialogHeader className="mb-2 sm:mb-4 text-left">
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2.5">
                <span className="bg-primary/10 text-primary p-2 rounded-xl shadow-sm shadow-primary/5">
                  <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                Place Your Sketch
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base mt-2 sm:mt-3 leading-relaxed">
                Review the sketch preview below before inserting it at the selected location in your note.
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative flex justify-center items-center p-4 sm:p-6 bg-muted/30 rounded-2xl border border-border/60 my-4 sm:my-6 overflow-hidden max-h-[30vh] sm:max-h-48 group">
               <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] opacity-60" />
               <div className="absolute inset-0 bg-gradient-to-t from-muted/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
               {pendingSketchSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: pendingSketchSvg }} className="relative z-10 w-full h-full max-h-full max-w-full drop-shadow-sm transition-transform duration-500 group-hover:scale-[1.02] [&>svg]:max-w-full [&>svg]:max-h-[25vh] sm:[&>svg]:max-h-40 [&>svg]:mx-auto" />
               ) : (
                  <span className="text-muted-foreground text-sm relative z-10 font-medium">No sketch found</span>
               )}
            </div>
            
            <DialogFooter className="flex w-full flex-col sm:flex-row gap-3 sm:gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={reselectSketchLocation}
                className="w-full sm:w-auto rounded-xl border-dashed hover:bg-muted/60 hover:text-foreground transition-colors h-11 sm:h-10 text-sm font-medium sm:mr-auto"
              >
                Reselect Location
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full sm:w-auto rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors h-11 sm:h-10 text-sm font-medium" 
                onClick={cancelSketchPlacement}
              >
                Discard
              </Button>
              <Button 
                type="button" 
                className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 transition-all active:scale-[0.98] h-11 sm:h-10 text-sm font-semibold" 
                onClick={confirmInsertSketch}
              >
                <Check className="w-4 h-4 mr-1.5" />
                Insert Sketch
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
