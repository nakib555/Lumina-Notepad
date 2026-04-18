import { useState, useRef, useEffect, useCallback } from "react";
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
import { FileText, Menu, Plus, Trash2, Clock, Search } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { ImageInsertDialog } from "./editor/image-insert-dialog";
import { LinkEditDialog } from "./editor/link-edit-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "./ui/input";

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
  notes = [],
  onSelectNote,
  onCreateNote,
  onDeleteNote,
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

  const { applyFormatting, applyFontSize, clearFormatting } = useEditorFormatting(
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const onUndo = useCallback(() => {
    let currentContent: string | undefined = undefined;
    if (editorAreaRef.current) {
      currentContent = editorAreaRef.current.flushPreviewEdit();
    }
    handleUndo(currentContent);
  }, [handleUndo]);

  const onRedo = useCallback(() => {
    let currentContent: string | undefined = undefined;
    if (editorAreaRef.current) {
      currentContent = editorAreaRef.current.flushPreviewEdit();
    }
    handleRedo(currentContent);
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

  const [lobbySearch, setLobbySearch] = useState("");

  if (!note) {
    const filteredNotes = notes.filter(n => 
      n.title.toLowerCase().includes(lobbySearch.toLowerCase()) || 
      n.content.toLowerCase().includes(lobbySearch.toLowerCase())
    );

    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-muted-foreground md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground tracking-tight hidden md:block w-32 truncate">Lumina</h1>
          </div>
          <div className="flex items-center gap-4 flex-1 max-w-xl mx-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search your notes..." 
                value={lobbySearch}
                onChange={e => setLobbySearch(e.target.value)}
                className="pl-9 bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full w-full"
              />
            </div>
          </div>
          <Button onClick={() => onCreateNote?.()} className="gap-2 rounded-full shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Note</span>
          </Button>
        </header>
        
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 space-y-8 bg-muted/10">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-foreground tracking-tight">Recent Notes</h2>
              <p className="text-sm text-muted-foreground">{filteredNotes.length} total</p>
            </div>
            
            {filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center border border-border">
                  <FileText className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-foreground font-semibold">No notes found</h3>
                  <p className="text-sm max-w-[240px]">Create a new note or adjust your search.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(n => (
                  <div 
                    key={n.id}
                    onClick={() => onSelectNote?.(n.id)}
                    className="group relative flex flex-col bg-background p-5 rounded-2xl border border-border hover:border-primary/30 shadow-sm hover:shadow-md transition-all cursor-pointer h-48 overflow-hidden gap-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-medium text-foreground line-clamp-1 flex-1">{n.title || "Untitled"}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity -mr-2 -mt-2 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this note?")) {
                            onDeleteNote?.(n.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1 font-serif opacity-80 break-words">
                      {n.content ? n.content.replace(/[#*`_]/g, '') : "No content..."}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-auto pt-3 border-t border-border/50">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{format(new Date(n.updatedAt), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className={cn(
      "flex-1 flex flex-col h-full overflow-hidden bg-background relative",
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar print:overflow-visible flex">
        <div className="flex-1 w-full min-w-0 max-w-full px-8 pt-10 pb-24 md:px-12 md:pt-16 md:pb-32 flex flex-col gap-8 min-h-full">
          <div className="space-y-6 shrink-0">
            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              readOnly={isViewMode}
              className={cn("w-full text-4xl md:text-5xl font-bold text-foreground placeholder:text-muted-foreground/30 border-none outline-none bg-transparent tracking-tight", isViewMode && "cursor-default")}
            />
            
            {/* Tag Management */}
            {!isViewMode && (
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
              />
            )}
          </div>
          
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

      {/* Bottom Formatting Bar */}
      {!isViewMode && (
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
          clearFormatting={clearFormatting}
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
        />
      )}

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
    </div>
  );
}
