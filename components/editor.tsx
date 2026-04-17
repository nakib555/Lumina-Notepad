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
import { ImageInsertDialog } from "./editor/image-insert-dialog";
import { LinkEditDialog } from "./editor/link-edit-dialog";
import { toast } from "sonner";

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
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [initialLinkText, setInitialLinkText] = useState('');
  const [isAutoMarkdownEnabled, setIsAutoMarkdownEnabled] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
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
