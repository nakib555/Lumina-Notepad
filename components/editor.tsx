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
import { FileText, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onToggleSidebar: () => void;
  theme: string;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

export function Editor({ 
  note, 
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

  const {
    history,
    historyIndex,
    saveStatus,
    addToHistory,
    handleUndo: originalHandleUndo,
    handleRedo: originalHandleRedo
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

  const handleUndo = useCallback(() => {
    if (editorAreaRef.current) {
      editorAreaRef.current.flushPreviewEdit();
    }
    // Use setTimeout to ensure the flush (which updates state) completes before undoing
    setTimeout(() => {
      originalHandleUndo();
    }, 0);
  }, [originalHandleUndo]);

  const handleRedo = useCallback(() => {
    if (editorAreaRef.current) {
      editorAreaRef.current.flushPreviewEdit();
    }
    setTimeout(() => {
      originalHandleRedo();
    }, 0);
  }, [originalHandleRedo]);

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
    textareaRef,
    addToHistory
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
    const newTitle = e.target.value;
    onUpdateNote(note!.id, { title: newTitle });
    addToHistory(newTitle, note!.content);
  };

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleUndo, handleRedo, setShowExportMenu, setShowCopyMenu]);

  if (!note) {
    return (
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
        <header className="h-16 border-b border-border flex items-center px-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-muted-foreground md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center border border-border">
            <FileText className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <h3 className="text-foreground font-semibold">No Note Selected</h3>
            <p className="text-sm max-w-[240px]">Select a note from the sidebar or create a new one to start writing.</p>
          </div>
        </div>
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
        handleUndo={handleUndo}
        handleRedo={handleRedo}
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
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible flex">
        <div className="flex-1 max-w-3xl mx-auto px-8 pt-10 pb-24 md:px-16 md:pt-16 md:pb-32 flex flex-col gap-8 min-h-full">
          <div className="space-y-6 shrink-0">
            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              className="w-full text-4xl md:text-5xl font-bold text-foreground placeholder:text-muted-foreground/30 border-none outline-none bg-transparent tracking-tight"
            />
            
            {/* Tag Management */}
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
          />
        </div>
      </div>

      {/* Bottom Formatting Bar */}
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
        textareaRef={textareaRef}
      />
    </div>
  );
}
