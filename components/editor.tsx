import { useState, useRef, useEffect } from "react";
import { Note } from "@/hooks/use-notes";
import { 
  FileText, CheckCircle2, Menu, Eye, Edit3, 
  Bold, Italic, Underline, Strikethrough, Subscript, Superscript, 
  Copy, Play, ExternalLink, Check,
  Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
  Quote, Code, Link, Image, Minus, Table
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
  const code = String(children).replace(/\n$/, '');
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
    <div className="my-6 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50/80 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            <Play className="w-3 h-3 fill-current" />
            Run
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
            <ExternalLink className="w-3 h-3" />
            Open
          </button>
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="bg-[#f8fafc] p-0">
        <SyntaxHighlighter
          style={oneLight}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.9rem',
            backgroundColor: 'transparent',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

interface EditorProps {
  note: Note | null;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onToggleSidebar: () => void;
}

export function Editor({ note, onUpdateNote, onToggleSidebar }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Simulate saving status for UX (actual save happens instantly in use-notes hook)
  useEffect(() => {
    if (!note) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      setSaveStatus("saved");
    }, 800);
    return () => clearTimeout(timeout);
  }, [note?.content, note?.title, note]);

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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote(note.id, { title: e.target.value });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote(note.id, { content: e.target.value });
  };

  const applyFormatting = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = note.content;
    const selectedText = text.substring(start, end);
    
    const newText = 
      text.substring(0, start) + 
      prefix + selectedText + suffix + 
      text.substring(end);

    onUpdateNote(note.id, { content: newText });

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
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <Button 
              variant={!isPreviewMode ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setIsPreviewMode(false)}
              className={cn("h-7 px-3 gap-1.5 text-xs font-medium transition-all", !isPreviewMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button 
              variant={isPreviewMode ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setIsPreviewMode(true)}
              className={cn("h-7 px-3 gap-1.5 text-xs font-medium transition-all", isPreviewMode ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Button>
          </div>
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
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12 md:px-12 md:py-16 flex flex-col gap-6">
          <input
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Note Title"
            className="w-full text-4xl md:text-5xl font-bold text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent tracking-tight font-serif"
          />
          
          {isPreviewMode ? (
            <div className="prose prose-slate max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-a:text-indigo-600">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
                components={{
                  code: CodeBlock as React.FC<CodeBlockProps>
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
              className="w-full min-h-[500px] text-lg text-slate-700 placeholder:text-slate-300 border-none outline-none bg-transparent resize-none focus-visible:ring-0 p-0 leading-relaxed font-sans"
            />
          )}
        </div>
      </ScrollArea>

      {/* Bottom Formatting Bar */}
      {!isPreviewMode && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 w-full max-w-fit px-4">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1.5 overflow-x-auto no-scrollbar max-w-[90vw] sm:max-w-none">
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
