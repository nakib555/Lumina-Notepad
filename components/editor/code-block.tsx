import { useState } from "react";
import { Check, Copy, Play, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  theme?: string;
}

export const CodeBlock = ({ inline, className, children, theme, ...props }: CodeBlockProps) => {
  const match = /language-([^\s]+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  // Ensure children is a string and handle potential undefined/null
  const code = Array.isArray(children) 
    ? children.map(child => String(child)).join('') 
    : String(children || '').replace(/\n$/, '');
    
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    window.dispatchEvent(new CustomEvent('run-code-block', { detail: { code, language } }));
  };

  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent('open-code-block', { detail: { code, language } }));
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
            <button onClick={handleRun} aria-label="Run code" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium transition-all text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400" title="Run Code">
              <Play className="w-3.5 h-3.5 fill-current" />
              Run
            </button>
            <button onClick={handleOpen} aria-label="Open code in sandbox" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-purple-600 hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400 transition-all" title="Open in Side Panel">
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[13px] font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all active:scale-95"
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
            showLineNumbers={true}
            wrapLines={true}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: 'var(--muted-foreground)',
              opacity: 0.4,
              textAlign: 'right',
              userSelect: 'none',
              borderRight: '1px solid var(--border)',
              marginRight: '1em'
            }}
            customStyle={{
              margin: 0,
              padding: '1rem 0',
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
