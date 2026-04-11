import { useState, useRef, useEffect, useCallback } from "react";
import { Note } from "@/hooks/use-notes";
import { 
  FileText, CheckCircle2, Menu, Eye, Edit3, 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Copy, Play, ExternalLink, Check,
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  Quote, Code, Link, Image, Minus, Table,
  Undo2, Redo2, Download, Tag, X, Hash, Printer, FileCode, Folder, Sigma
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkToc from 'remark-toc';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CodeBlock } from "./editor/code-block";
import { EditorHeader } from "./editor/editor-header";
import { FloatingToolbar } from "./editor/floating-toolbar";
import { SlashMenu } from "./editor/slash-menu";
import { processCustomMarkdown, HistoryItem } from "./editor/utils";

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
      
      // Calculate position (rough estimation for textarea)
      if (textareaRef.current) {
        // This is a simplified positioning. For perfect positioning, a library like get-caret-coordinates is better.
        // We'll just center it or put it near the bottom for now.
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

  const executeSlashCommand = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current || !note) return;
    
    const text = note.content;
    const start = textareaRef.current.selectionStart;
    
    // Find where the slash command started
    const textBeforeCursor = text.substring(0, start);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const newText = 
        text.substring(0, lastSlashIndex) + 
        prefix + suffix + 
        text.substring(start);
        
      onUpdateNote(note.id, { content: newText });
      addToHistory(note.title, newText, true);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            lastSlashIndex + prefix.length,
            lastSlashIndex + prefix.length
          );
        }
      }, 0);
    }
    
    setSlashMenuOpen(false);
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

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current || !note) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = note.content;
    const selectedText = text.substring(start, end);
    
    const newText = 
      text.substring(0, start) + 
      prefix + selectedText + suffix + 
      text.substring(end);

    onUpdateNote(note.id, { content: newText });
    addToHistory(note.title, newText, true); // Immediate commit for formatting

    // Reset focus and selection after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      }
    }, 0);
  };

  const applyFontSize = (size: string) => {
    if (!textareaRef.current || !note) return;

    let start = textareaRef.current.selectionStart;
    let end = textareaRef.current.selectionEnd;
    const text = note.content;

    // 1. Check if selection is exactly the text inside [text]{size}
    if (start > 0 && text.charAt(start - 1) === '[') {
      const after = text.substring(end);
      const match = after.match(/^\]\{\d+(?:px|pt)\}/);
      if (match) {
        start -= 1;
        end += match[0].length;
      }
    } else if (start === end) {
      // 2. Check if cursor is just resting inside a [text]{size} block
      const before = text.substring(0, start);
      const lastOpen = before.lastIndexOf('[');
      const lastClose = before.lastIndexOf(']');
      if (lastOpen !== -1 && lastOpen > lastClose) {
        const after = text.substring(lastOpen);
        const fullMatch = after.match(/^\[(.*?)\]\{\d+(?:px|pt)\}/);
        if (fullMatch && lastOpen + fullMatch[0].length >= start) {
          start = lastOpen;
          end = lastOpen + fullMatch[0].length;
        }
      }
    }

    const selectedText = text.substring(start, end);
    
    // Strip any existing font size markdown within the selection to prevent overlaying
    const strippedText = selectedText.replace(/\[(.*?)\]\{\d+(?:px|pt)\}/g, '$1');
    
    const textToWrap = strippedText || "text";
    const replacement = `[${textToWrap}]{${size}pt}`;
    
    const newText = text.substring(0, start) + replacement + text.substring(end);

    onUpdateNote(note.id, { content: newText });
    addToHistory(note.title, newText, true);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(
          start + 1,
          start + 1 + textToWrap.length
        );
      }
    }, 0);
  };

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
            <div className="flex flex-wrap items-center gap-4 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {note.tags?.map(tag => (
                    <span 
                      key={tag} 
                      className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full border border-primary/20 group/tag"
                    >
                      <Hash className="w-3 h-3 opacity-60" />
                      {tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="hover:text-primary/80 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative flex items-center">
                  <Tag className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={onTagKeyDown}
                    onBlur={handleAddTag}
                    className="pl-8 pr-3 py-1 text-[11px] font-medium bg-muted border-transparent focus:bg-background focus:border-border rounded-full outline-none transition-all w-24 focus:w-32 text-foreground"
                  />
                </div>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="relative flex items-center">
                <Folder className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input 
                  type="text"
                  placeholder={note.folderId || "Add to folder..."}
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  onKeyDown={updateFolder}
                  className="pl-8 pr-3 py-1 text-[11px] font-medium bg-muted border-transparent focus:bg-background focus:border-border rounded-full outline-none transition-all w-32 focus:w-40 text-foreground"
                />
              </div>
            </div>
          </div>
          
          {isPreviewMode ? (
            <div className="prose prose-slate dark:prose-invert max-w-none pb-32 font-sans text-[14pt] prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks, [remarkToc, { heading: 'toc|contents|table of contents', tight: true }]]} 
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: (props) => <CodeBlock {...props} theme={theme} />
                }}
              >
                {processCustomMarkdown(note.content || "_No content yet..._")}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={note.content}
                onChange={handleContentChange}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                placeholder="Start typing with markdown support... (# Heading, *italic*, **bold**, etc.)\nType '/' for commands or drag & drop images."
                className="w-full min-h-[500px] pb-32 text-[14pt] text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-relaxed font-sans overflow-hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Formatting Bar */}
      {!isPreviewMode && (
        <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-20 px-2 sm:px-4 flex justify-center pointer-events-none">
          <div 
            className="relative pointer-events-auto max-w-full flex flex-col items-center" 
            ref={symbolMenuRef}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).closest('button')) {
                e.preventDefault();
              }
            }}
            onTouchStart={() => {
              // Reset drag state on new touch
              if (symbolMenuRef.current) {
                symbolMenuRef.current.dataset.touchDragging = 'false';
              }
            }}
            onTouchMove={() => {
              // Mark as dragging if touch moves
              if (symbolMenuRef.current) {
                symbolMenuRef.current.dataset.touchDragging = 'true';
              }
            }}
            onTouchEnd={(e) => {
              const button = (e.target as HTMLElement).closest('button');
              const isDragging = symbolMenuRef.current?.dataset.touchDragging === 'true';
              
              if (button && !isDragging) {
                // Prevent default to stop iOS from blurring the textarea and closing the keyboard
                e.preventDefault();
                // Manually trigger the click since we prevented the default touch behavior
                button.click();
              }
            }}
          >
            {showSymbolMenu && (
              <div 
                ref={symbolScrollRef}
                onMouseDown={handleSymbolMouseDown}
                onMouseLeave={handleSymbolMouseLeave}
                onMouseUp={handleSymbolMouseUp}
                onMouseMove={handleSymbolMouseMove}
                className={cn(
                  "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[90vw] sm:max-w-full flex-nowrap select-none touch-pan-x",
                  isSymbolDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {['★', '✓', '→', '←', '↑', '↓', '•', '©', '®', '™', '°', '±', '≠', '∞', '≈', '×', '÷', '∑', 'π', 'Ω'].map(sym => (
                  <button
                    key={sym}
                    onClick={() => {
                      applyFormatting(sym, "");
                      setShowSymbolMenu(false);
                    }}
                    className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-foreground transition-colors"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
            <FloatingToolbar 
              toolbarRef={toolbarRef}
              isDragging={isDragging}
              handleMouseDown={handleMouseDown}
              handleMouseLeave={handleMouseLeave}
              handleMouseUp={handleMouseUp}
              handleMouseMove={handleMouseMove}
              fontFamily={fontFamily}
              onFontFamilyChange={onFontFamilyChange}
              applyFontSize={applyFontSize}
              applyFormatting={applyFormatting}
            />
            {/* Symbol Group */}
            <div className="flex items-center gap-0.5 pl-1 border-l border-border relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSymbolMenu(!showSymbolMenu)}
                className="h-8 w-8 text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 rounded-lg shrink-0"
                title="Symbols"
              >
                <Sigma className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
