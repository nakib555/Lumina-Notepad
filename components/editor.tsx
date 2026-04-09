import { useState, useRef, useEffect, useCallback } from "react";
import { Note } from "@/hooks/use-notes";
import { 
  FileText, CheckCircle2, Menu, Eye, Edit3, 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Copy, Play, ExternalLink, Check,
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  Quote, Code, Link, Image, Minus, Table,
  Undo2, Redo2
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
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { toast } from "sonner";

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

const CodeBlock = ({ inline, className, children, ...props }: CodeBlockProps) => {
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

  if (inline) {
    return (
      <code className="bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="not-prose my-6">
      <div className="rounded-xl shadow-sm font-sans group bg-[#f4f7f8] transition-colors duration-300 border border-[#e9ecef] relative overflow-hidden">
        <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-2.5 bg-[#f8f9fa] border-b border-[#e9ecef] select-none">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-[#6c757d] font-mono capitalize">
              {language || 'text'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium transition-all text-[#198754] hover:opacity-80" title="Run Code">
              <Play className="w-3.5 h-3.5 fill-current" />
              Run
            </button>
            <button className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium text-[#6f42c1] hover:opacity-80 transition-all" title="Open in Side Panel">
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-1 py-1 rounded text-[13px] font-medium text-[#6c757d] hover:text-slate-900 transition-all"
              aria-label="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
        <div className="relative overflow-x-auto text-[14px] leading-relaxed custom-scrollbar bg-[#f4f7f8]">
          <SyntaxHighlighter
            style={oneLight}
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
}

interface HistoryItem {
  title: string;
  content: string;
}

export function Editor({ note, onUpdateNote, onToggleSidebar }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
        <header className="h-14 border-b border-slate-100 flex items-center px-4 shrink-0 bg-white/80 backdrop-blur-md z-10">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-slate-500 hover:text-slate-800">
            <Menu className="w-5 h-5" />
          </Button>
        </header>
        <div className="flex-1 flex items-center justify-center bg-white text-slate-400">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <p>Select a note or create a new one</p>
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

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-white relative">
      {/* Toolbar */}
      <header className="h-14 border-b border-slate-100 flex items-center justify-between px-4 shrink-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-slate-500 hover:text-slate-800">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn(
              "h-9 px-4 gap-2 text-sm font-medium transition-all rounded-xl border-slate-200 shadow-sm",
              isPreviewMode 
                ? "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800" 
                : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {isPreviewMode ? (
              <>
                <Edit3 className="w-4 h-4" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Preview Mode
              </>
            )}
          </Button>

          {!isPreviewMode && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleUndo} 
                  disabled={historyIndex <= 0}
                  className="h-8 w-8 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRedo} 
                  disabled={historyIndex >= history.length - 1}
                  className="h-8 w-8 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-400 hidden sm:inline-block">
            {note.content.length} characters
          </span>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            {saveStatus === "saving" ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> Autosaved
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16 flex flex-col gap-6">
          <input
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Note Title"
            className="w-full text-4xl md:text-5xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent tracking-tight font-serif"
          />
          
          {isPreviewMode ? (
            <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-indigo-600 prose-blockquote:border-l-4 prose-blockquote:border-indigo-200 prose-blockquote:bg-indigo-50/30 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:italic prose-img:rounded-2xl prose-img:shadow-lg prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks, [remarkToc, { heading: 'toc|contents|table of contents', tight: true }]]} 
                rehypePlugins={[rehypeRaw, rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
                components={{
                  code: CodeBlock as React.FC<CodeBlockProps>,
                  a: ({ ...props }) => {
                    const isHeadingLink = props.className?.includes('rehype-autolink-headings') || 
                                    (typeof props.children === 'string' && props.children.startsWith('#'));
                    
                    return (
                      <a 
                        {...props} 
                        target={isHeadingLink ? undefined : "_blank"} 
                        rel={isHeadingLink ? undefined : "noopener noreferrer"} 
                        className={cn(
                          "text-indigo-600 hover:text-indigo-800 transition-colors",
                          isHeadingLink 
                            ? "no-underline text-inherit hover:text-indigo-600" 
                            : "underline decoration-indigo-200 underline-offset-4"
                        )}
                      />
                    );
                  },
                  blockquote: ({ ...props }) => (
                    <blockquote {...props} className="not-italic border-l-4 border-indigo-500 bg-indigo-50/50 py-2 px-6 rounded-r-xl my-6" />
                  ),
                  table: ({ ...props }) => (
                    <div className="overflow-x-auto my-8 rounded-xl border border-slate-200 shadow-sm">
                      <table {...props} className="w-full text-sm text-left border-collapse" />
                    </div>
                  ),
                  th: ({ ...props }) => (
                    <th {...props} className="bg-slate-50/80 px-4 py-3 font-semibold text-slate-900 border-b border-slate-200" />
                  ),
                  td: ({ ...props }) => (
                    <td {...props} className="px-4 py-3 text-slate-600 border-b border-slate-100" />
                  ),
                  hr: () => <hr className="my-12 border-t-2 border-slate-100 rounded-full" />,
                  img: ({ ...props }) => (
                    <img 
                      {...props} 
                      referrerPolicy="no-referrer" 
                      className="rounded-2xl shadow-xl mx-auto my-10 border border-slate-100" 
                    />
                  )
                }}
              >
                {note.content || "_No content yet..._"}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={handleContentChange}
              placeholder="Start typing with markdown support... (# Heading, *italic*, **bold**, etc.)"
              className="w-full min-h-[500px] text-[1.125rem] text-slate-700 placeholder:text-slate-300 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-relaxed font-sans"
            />
          )}
        </div>
      </div>

      {/* Bottom Formatting Bar */}
      {!isPreviewMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-full px-4 flex justify-center pointer-events-none">
          <div 
            ref={toolbarRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className={cn(
              "flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1.5 overflow-x-auto no-scrollbar max-w-full sm:max-w-max flex-nowrap pointer-events-auto select-none touch-pan-x",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            {/* Text Style Group */}
            <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("**")}
                className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-lg shrink-0"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("*")}
                className="h-8 w-8 text-orange-600 hover:bg-orange-50 rounded-lg shrink-0"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<u>", "</u>")}
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg shrink-0"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("~~")}
                className="h-8 w-8 text-rose-600 hover:bg-rose-50 rounded-lg shrink-0"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </Button>
            </div>

            {/* Script Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<sub>", "</sub>")}
                className="h-8 w-8 text-purple-600 hover:bg-purple-50 rounded-lg shrink-0"
                title="Subscript"
              >
                <Subscript className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("<sup>", "</sup>")}
                className="h-8 w-8 text-violet-600 hover:bg-violet-50 rounded-lg shrink-0"
                title="Superscript"
              >
                <Superscript className="w-4 h-4" />
              </Button>
            </div>

            {/* Headings Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("# ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("## ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("### ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </Button>
            </div>

            {/* Lists Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("- ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("1. ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("- [ ] ", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Task List"
              >
                <ListTodo className="w-4 h-4" />
              </Button>
            </div>

            {/* Blocks Group */}
            <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("> ", "")}
                className="h-8 w-8 text-amber-600 hover:bg-amber-50 rounded-lg shrink-0"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("```\n", "\n```")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("\n---\n", "")}
                className="h-8 w-8 text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
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
                className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 rounded-lg shrink-0"
                title="Link"
              >
                <Link className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("![alt text](", ")")}
                className="h-8 w-8 text-pink-600 hover:bg-pink-50 rounded-lg shrink-0"
                title="Image"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => applyFormatting("\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n", "")}
                className="h-8 w-8 text-cyan-600 hover:bg-cyan-50 rounded-lg shrink-0"
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
