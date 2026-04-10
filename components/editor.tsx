import { useState, useRef, useEffect, useCallback } from "react";
import { Note } from "@/hooks/use-notes";
import { 
  FileText, CheckCircle2, Menu, Eye, Edit3, 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Copy, Play, ExternalLink, Check,
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  Quote, Code, Link, Image, Minus, Table,
  Undo2, Redo2, Download, Tag, X, Hash, Printer, FileCode, Folder
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkToc from 'remark-toc';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from "sonner";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  theme?: string;
}

const CodeBlock = ({ inline, className, children, theme, ...props }: CodeBlockProps) => {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  // Ensure children is a string and handle potential undefined/null
  const code = Array.isArray(children) 
    ? children.map(child => String(child)).join('') 
    : String(children || '').replace(/\n$/, '');
    
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const isDark = theme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  if (inline) {
    return (
      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="not-prose my-6">
      <div className="rounded-xl font-sans group transition-colors duration-300 border border-border relative overflow-hidden bg-muted/10">
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-2.5 border-b border-border select-none bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-muted-foreground font-mono capitalize">
              {language || 'text'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium transition-all text-emerald-600 hover:opacity-80" title="Run Code">
              <Play className="w-3.5 h-3.5 fill-current" />
              Run
            </button>
            <button className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium text-purple-600 hover:opacity-80 transition-all" title="Open in Side Panel">
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium text-muted-foreground hover:text-foreground transition-all"
              aria-label="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div className="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-transparent">
          <SyntaxHighlighter
            style={isDark ? oneDark : oneLight}
            language={language || 'text'}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: '1.5rem',
              fontSize: '14px',
              backgroundColor: 'transparent',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
            }}
            codeTagProps={{
              style: {
                backgroundColor: 'transparent',
              }
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};

interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onToggleSidebar: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
}

interface HistoryItem {
  title: string;
  content: string;
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
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashSearch, setSlashSearch] = useState("");
  const [showToc, setShowToc] = useState(false);
  
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

  const toggleFocusMode = () => {
    setIsFocusMode(!isFocusMode);
    if (!isFocusMode) {
      // Entering focus mode, close sidebar if open
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        // We can't directly check if sidebar is open from Editor, but we can trigger toggle
        // Actually, it's better to pass a prop or just let the user close it.
        // Let's just hide the editor's own UI for now.
      }
    }
  };

  // Keyboard shortcuts for Undo/Redo and Focus Mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
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
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setIsFocusMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleUndo, handleRedo]);

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && note) {
      const newTag = tagInput.trim().toLowerCase();
      if (!note.tags?.includes(newTag)) {
        onUpdateNote(note.id, { tags: [...(note.tags || []), newTag] });
      }
      setTagInput("");
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          end + prefix.length
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

  const extractHeadings = () => {
    if (!note) return [];
    const regex = /^(#{1,3})\s+(.+)$/gm;
    const headings = [];
    let match;
    while ((match = regex.exec(note.content)) !== null) {
      headings.push({
        level: match[1].length,
        text: match[2],
        id: match[2].toLowerCase().replace(/[^\w]+/g, '-')
      });
    }
    return headings;
  };

  const headings = extractHeadings();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background relative">
      {/* Toolbar */}
      {!isFocusMode && (
      <header className="h-14 border-b border-border flex items-center justify-between px-2 sm:px-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-1 sm:gap-2 py-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-muted-foreground hover:text-foreground shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="h-4 w-px bg-border mx-1 hidden sm:block shrink-0" />

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn(
              "h-9 px-2 sm:px-4 gap-2 text-sm font-medium transition-all rounded-xl border-border shadow-sm shrink-0",
              isPreviewMode 
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary" 
                : "bg-background text-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {isPreviewMode ? (
              <>
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Mode</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview Mode</span>
              </>
            )}
          </Button>

          {!isPreviewMode && (
            <>
              <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleUndo} 
                  disabled={historyIndex <= 0}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRedo} 
                  disabled={historyIndex >= history.length - 1}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="relative" ref={exportMenuRef}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 px-2 sm:px-3 gap-2 text-muted-foreground hover:bg-muted rounded-xl shrink-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button 
                  onClick={() => exportNote('md')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                >
                  <FileCode className="w-4 h-4" /> Markdown (.md)
                </button>
                <button 
                  onClick={() => exportNote('txt')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                >
                  <FileText className="w-4 h-4" /> Plain Text (.txt)
                </button>
                <button 
                  onClick={() => exportNote('pdf')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
              </div>
            )}
          </div>

          <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">
            {stats.words} words • {stats.chars} chars • {stats.readingTime} min read
          </span>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {saveStatus === "saving" ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> Autosaved
              </span>
            )}
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <select
              value={fontFamily}
              onChange={(e) => onFontFamilyChange(e.target.value)}
              className="bg-transparent text-muted-foreground hover:text-foreground outline-none text-xs font-medium cursor-pointer"
            >
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFocusMode(true)}
              className="h-8 w-8 ml-2 text-muted-foreground hover:text-foreground"
              title="Focus Mode (Cmd+Shift+F)"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowToc(!showToc)}
              className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", showToc && "text-primary bg-primary/10")}
              title="Table of Contents"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      )}

      {/* Focus Mode Exit Button */}
      {isFocusMode && (
        <div className="absolute top-4 right-4 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFocusMode(false)}
            className="bg-background/80 backdrop-blur-md shadow-sm"
          >
            Exit Focus Mode
          </Button>
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible flex">
        <div className="flex-1 max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16 flex flex-col gap-6 min-h-full">
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
                    onKeyDown={addTag}
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
            <div className="prose prose-slate dark:prose-invert max-w-none pb-32 font-sans text-[1.125rem] prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-muted-foreground prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:p-0 prose-pre:bg-transparent prose-img:rounded-xl">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks, [remarkToc, { heading: 'toc|contents|table of contents', tight: true }]]} 
                rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: (props) => <CodeBlock {...props} theme={theme} />
                }}
              >
                {note.content || "_No content yet..._"}
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
                className="w-full h-full min-h-[500px] pb-32 text-[1.125rem] text-foreground placeholder:text-muted-foreground/50 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-relaxed font-sans"
              />
              
              {/* Slash Command Menu */}
              {slashMenuOpen && (
                <div className="absolute z-50 w-64 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ bottom: '40px', left: '20px' }}>
                  <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Basic Blocks
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                    {[
                      { icon: Heading1, label: 'Heading 1', desc: 'Big section heading', prefix: '# ' },
                      { icon: Heading2, label: 'Heading 2', desc: 'Medium section heading', prefix: '## ' },
                      { icon: Heading3, label: 'Heading 3', desc: 'Small section heading', prefix: '### ' },
                      { icon: List, label: 'Bulleted List', desc: 'Create a simple list', prefix: '- ' },
                      { icon: ListOrdered, label: 'Numbered List', desc: 'Create a list with numbering', prefix: '1. ' },
                      { icon: ListTodo, label: 'To-do List', desc: 'Track tasks with checkboxes', prefix: '- [ ] ' },
                      { icon: Quote, label: 'Quote', desc: 'Capture a quote', prefix: '> ' },
                      { icon: Code, label: 'Code Block', desc: 'Capture a code snippet', prefix: '```\n', suffix: '\n```' },
                      { icon: Minus, label: 'Divider', desc: 'Visually divide blocks', prefix: '\n---\n' },
                      { icon: Table, label: 'Table', desc: 'Add a markdown table', prefix: '\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n' },
                    ].filter(item => item.label.toLowerCase().includes(slashSearch.toLowerCase())).map((item, i) => (
                      <button
                        key={i}
                        onClick={() => executeSlashCommand(item.prefix, item.suffix)}
                        className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-muted rounded-lg transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-xs text-muted-foreground">{item.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table of Contents Sidebar */}
        {showToc && !isFocusMode && headings.length > 0 && (
          <div className="w-64 shrink-0 border-l border-border bg-muted/20 p-6 hidden lg:block overflow-y-auto custom-scrollbar">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Table of Contents</h4>
            <div className="space-y-2">
              {headings.map((heading, i) => (
                <a
                  key={i}
                  href={`#${heading.id}`}
                  className={cn(
                    "block text-sm text-muted-foreground hover:text-foreground transition-colors truncate",
                    heading.level === 1 ? "font-semibold" : heading.level === 2 ? "pl-3" : "pl-6 text-xs"
                  )}
                  onClick={(e) => {
                    if (!isPreviewMode) {
                      e.preventDefault();
                      // In edit mode, we can't easily scroll to the exact line without complex logic,
                      // but we can at least show the structure.
                    }
                  }}
                >
                  {heading.text}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Formatting Bar */}
      {!isPreviewMode && !isFocusMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-full px-4 flex justify-center pointer-events-none">
          <div 
            ref={toolbarRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={cn(
              "flex items-center gap-1 bg-background/90 backdrop-blur-md border border-border shadow-xl rounded-2xl p-1.5 overflow-x-auto no-scrollbar max-w-full sm:max-w-max flex-nowrap pointer-events-auto select-none touch-pan-x",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            {/* Text Style Group */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("**")}
                className="h-8 w-8 text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("*")}
                className="h-8 w-8 text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg shrink-0"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<u>", "</u>")}
                className="h-8 w-8 text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg shrink-0"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("~~")}
                className="h-8 w-8 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
            </div>

            {/* Script Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<sub>", "</sub>")}
                className="h-8 w-8 text-purple-500 hover:text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-lg shrink-0"
                title="Subscript"
              >
                <Subscript className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<sup>", "</sup>")}
                className="h-8 w-8 text-fuchsia-500 hover:text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-lg shrink-0"
                title="Superscript"
              >
                <Superscript className="w-4 h-4" />
              </Button>
            </div>

            {/* Headings Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("# ", "")}
                className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("## ", "")}
                className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("### ", "")}
                className="h-8 w-8 text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 rounded-lg shrink-0"
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("- ", "")}
                className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("1. ", "")}
                className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("- [ ] ", "")}
                className="h-8 w-8 text-orange-500 hover:text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg shrink-0"
                title="Task List"
              >
                <ListTodo className="w-4 h-4" />
              </Button>
            </div>

            {/* Blocks Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-border">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("> ", "")}
                className="h-8 w-8 text-teal-500 hover:text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 rounded-lg shrink-0"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("```\n", "\n```")}
                className="h-8 w-8 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg shrink-0"
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("\n---\n", "")}
                className="h-8 w-8 text-slate-500 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-500/10 rounded-lg shrink-0"
                title="Horizontal Rule"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>

            {/* Media Group */}
            <div className="flex items-center gap-0.5 pl-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("[", "](url)")}
                className="h-8 w-8 text-blue-500 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg shrink-0"
                title="Link"
              >
                <Link className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("![alt text](", ")")}
                className="h-8 w-8 text-pink-500 hover:text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 rounded-lg shrink-0"
                title="Image"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n", "")}
                className="h-8 w-8 text-violet-500 hover:text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-lg shrink-0"
                title="Table"
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
