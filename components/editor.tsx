import { useState, useRef, useEffect, useCallback } from "react";
import { Note } from "@/hooks/use-notes";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditorHeader } from "./editor/editor-header";
import { BottomBar } from "./editor/bottom-bar";
import { SlashMenu } from "./editor/slash-menu";
import { MetadataBar } from "./editor/metadata-bar";
import { EditorArea } from "./editor/editor-area";
import { HistoryItem } from "./editor/utils";
import { useEditorFormatting } from "./editor/use-editor-formatting";
import getCaretCoordinates from 'textarea-caret';

interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onToggleSidebar: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

export function Editor({ 
  note, 
  onUpdateNote, 
  onToggleSidebar,
  theme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const symbolMenuRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showSymbolMenu, setShowSymbolMenu] = useState(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearch, setSlashSearch] = useState("");
  
  // Undo/Redo State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Reset history ONLY when note ID changes
  useEffect(() => {
    if (note) {
      setHistory([{ title: note.title, content: note.content }]);
      setHistoryIndex(0);
      historyIndexRef.current = 0;
    }
    // We explicitly only want to reset when the ID changes, not on every content update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  const addToHistory = useCallback((title: string, content: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const performAdd = () => {
      setHistory(prev => {
        const currentIndex = historyIndexRef.current;
        const lastItem = prev[currentIndex];
        
        if (lastItem && lastItem.title === title && lastItem.content === content) {
          return prev;
        }
        
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push({ title, content });
        
        // Limit history size
        const finalHistory = newHistory.length > 100 ? newHistory.slice(newHistory.length - 100) : newHistory;
        
        // Update index after history is updated
        setHistoryIndex(finalHistory.length - 1);
        return finalHistory;
      });
    };

    if (immediate) {
      performAdd();
    } else {
      debounceTimerRef.current = setTimeout(performAdd, 1000); // 1 second debounce for typing
    }
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onUpdateNote(note!.id, { title: newTitle });
    addToHistory(newTitle, note!.content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    onUpdateNote(note!.id, { content: newContent });
    addToHistory(note!.title, newContent);

    // Auto-resize textarea while preserving scroll position
    if (textareaRef.current) {
      const scrollContainer = textareaRef.current.closest('.overflow-y-auto');
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    }

    // Check for slash command
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastLine = textBeforeCursor.split('\n').pop() || '';
    
    const slashMatch = lastLine.match(/(?:^|\s)\/([a-zA-Z]*)$/);
    
    if (slashMatch) {
      setSlashSearch(slashMatch[1]);
      
      // Calculate position
      if (textareaRef.current) {
        const caret = getCaretCoordinates(textareaRef.current, cursorPosition);
        const rect = textareaRef.current.getBoundingClientRect();
        
        // Find the root container to calculate relative position
        const rootContainer = textareaRef.current.closest('.bg-background.relative');
        const rootRect = rootContainer ? rootContainer.getBoundingClientRect() : { top: 0, left: 0 };
        
        // Account for textarea position relative to the root container
        const top = caret.top + rect.top - rootRect.top + 24;
        const left = caret.left + rect.left - rootRect.left;
        
        setSlashMenuPosition({ top, left });
        setSlashMenuOpen(true);
      }
    } else {
      setSlashMenuOpen(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (!note) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      const file = imageFiles[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const imageMarkdown = `\n![${file.name}](${base64String})\n`;
        
        applyFormatting(imageMarkdown, "");
        toast.success("Image added successfully");
      };
      
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && note) {
      const prevItem = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateNote(note.id, { title: prevItem.title, content: prevItem.content });
    }
  }, [history, historyIndex, note, onUpdateNote]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && note) {
      const nextItem = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateNote(note.id, { title: nextItem.title, content: nextItem.content });
    }
  }, [history, historyIndex, note, onUpdateNote]);

  // Keyboard shortcuts for Undo/Redo
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
  }, [handleUndo, handleRedo]);

  const handleAddTag = () => {
    if (tagInput.trim() && note) {
      const newTag = tagInput.trim().toLowerCase();
      if (!note.tags?.includes(newTag)) {
        onUpdateNote(note.id, { tags: [...(note.tags || []), newTag] });
      }
      setTagInput("");
    }
  };

  const onTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (!note) return;
    onUpdateNote(note.id, { tags: note.tags?.filter(t => t !== tagToRemove) });
  };

  const updateFolder = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && note) {
      const newFolder = folderInput.trim();
      onUpdateNote(note.id, { folderId: newFolder || undefined });
      toast.success(newFolder ? `Moved to ${newFolder}` : "Removed from folder");
    }
  };

  const handleCopyNote = (format: 'normal' | 'markdown') => {
    if (!note) return;
    let text = note.content;
    if (format === 'normal') {
      // Basic markdown strip
      text = text
        .replace(/\[(.*?)\]\{\d+(?:px|pt)\}/g, '$1') // custom font size
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
        .replace(/#{1,6}\s?/g, '') // headers
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // italic
        .replace(/~~(.*?)~~/g, '$1') // strikethrough
        .replace(/`{1,3}([\s\S]*?)`{1,3}/g, '$1') // code
        .replace(/>\s?/g, '') // blockquotes
        .replace(/!\[(.*?)\]\(.*?\)/g, '') // images
        .replace(/^\s*[-*+]\s/gm, '') // unordered lists
        .replace(/^\s*\d+\.\s/gm, ''); // ordered lists
    }
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${format === 'markdown' ? 'as Markdown' : 'to clipboard'}`);
    setShowCopyMenu(false);
  };

  const exportNote = (format: 'txt' | 'md' | 'pdf') => {
    if (!note) return;
    setShowExportMenu(false);

    if (format === 'pdf') {
      window.print();
      return;
    }

    const extension = format === 'md' ? 'md' : 'txt';
    const content = format === 'md' ? note.content : `${note.title}\n\n${note.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title || 'note'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Simulate saving status for UX (actual save happens instantly in use-notes hook)
  useEffect(() => {
    if (!note) return;
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      setSaveStatus("saved");
    }, 800);
    return () => clearTimeout(timeout);
  }, [note?.content, note?.title, note]);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const symbolScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [isSymbolDragging, setIsSymbolDragging] = useState(false);
  const [symbolStartX, setSymbolStartX] = useState(0);
  const [symbolScrollLeft, setSymbolScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!toolbarRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - toolbarRef.current.offsetLeft);
    setScrollLeft(toolbarRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !toolbarRef.current) return;
    e.preventDefault();
    const x = e.pageX - toolbarRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    toolbarRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleSymbolMouseDown = (e: React.MouseEvent) => {
    if (!symbolScrollRef.current) return;
    setIsSymbolDragging(true);
    setSymbolStartX(e.pageX - symbolScrollRef.current.offsetLeft);
    setSymbolScrollLeft(symbolScrollRef.current.scrollLeft);
  };

  const handleSymbolMouseLeave = () => {
    setIsSymbolDragging(false);
  };

  const handleSymbolMouseUp = () => {
    setIsSymbolDragging(false);
  };

  const handleSymbolMouseMove = (e: React.MouseEvent) => {
    if (!isSymbolDragging || !symbolScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - symbolScrollRef.current.offsetLeft;
    const walk = (x - symbolStartX) * 2;
    symbolScrollRef.current.scrollLeft = symbolScrollLeft - walk;
  };

  // Auto-resize on initial load or note change
  useEffect(() => {
    if (textareaRef.current && !isPreviewMode) {
      const scrollContainer = textareaRef.current.closest('.overflow-y-auto');
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    }
  }, [note?.content, isPreviewMode]);

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

  const { applyFormatting, applyFontSize, executeSlashCommand } = useEditorFormatting(
    note,
    onUpdateNote,
    textareaRef,
    addToHistory,
    setSlashMenuOpen
  );

  const getStats = () => {
    if (!note) return { words: 0, chars: 0, readingTime: 0 };
    const text = note.content;
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200); // 200 words per minute
    return { words, chars, readingTime };
  };

  const stats = getStats();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background relative">
      {/* Toolbar */}
      <EditorHeader 
        onToggleSidebar={onToggleSidebar}
        isPreviewMode={isPreviewMode}
        setIsPreviewMode={setIsPreviewMode}
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
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible flex">
        <div className="flex-1 max-w-3xl mx-auto px-6 pt-6 pb-12 md:px-12 md:pt-8 md:pb-16 flex flex-col gap-6 min-h-full">
          <div className="space-y-4 shrink-0">
            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="Note Title"
              className="w-full text-4xl md:text-5xl font-bold text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent tracking-tight font-serif"
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
            isPreviewMode={isPreviewMode}
            content={note.content}
            theme={theme}
            textareaRef={textareaRef}
            handleContentChange={handleContentChange}
            handleDrop={handleDrop}
            handleDragOver={handleDragOver}
          />
        </div>
      </div>

      {/* Bottom Formatting Bar */}
      <BottomBar 
        isPreviewMode={isPreviewMode}
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
      />

      {/* Slash Command Menu */}
      <SlashMenu 
        slashMenuOpen={slashMenuOpen}
        slashMenuPosition={slashMenuPosition}
        slashSearch={slashSearch}
        insertSlashCommand={executeSlashCommand}
        onClose={() => setSlashMenuOpen(false)}
      />
    </div>
  );
}
