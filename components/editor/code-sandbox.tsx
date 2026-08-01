import { useState, useEffect, useRef, useMemo } from "react";
import { X, RefreshCw, Terminal, Eye, Code, Trash2, ExternalLink, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CodeSandboxProps {
  isOpen: boolean;
  onClose: () => void;
  code: string | null;
  language: string;
  theme: string;
}

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
}

export const CodeSandbox = ({ isOpen, onClose, code, language, theme }: CodeSandboxProps) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'console' | 'code'>('preview');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [runTrigger, setRunTrigger] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Clear logs when code or language changes
  useEffect(() => {
    setLogs([]);
    if (code) {
      // Auto switch to preview for visual languages, or console for scripts
      const lowerLang = language.toLowerCase();
      if (['js', 'javascript', 'ts', 'typescript', 'py', 'python', 'sql'].includes(lowerLang)) {
        setActiveTab('console');
      } else {
        setActiveTab('preview');
      }
    }
  }, [code, language]);

  // Listen to iframe console log messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'IFRAME_CONSOLE_LOG') {
        setLogs(prev => [
          ...prev,
          {
            type: e.data.logType,
            message: e.data.message,
            timestamp: new Date()
          }
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    setRunTrigger(prev => prev + 1);
    setLogs([]);
    toast.success("Code reloaded & rerun");
  };

  const clearConsole = () => {
    setLogs([]);
    toast.success("Console logs cleared");
  };

  // Build the sandboxed iframe HTML srcDoc depending on the language
  const iframeSrcDoc = useMemo(() => {
    if (!code) return "";

    // Reference runTrigger to track dependencies properly
    void runTrigger;

    const lowerLang = language.toLowerCase();

    // Capturing console events script
    const consoleCaptureScript = `
      <script>
        (function() {
          const _log = console.log;
          const _error = console.error;
          const _warn = console.warn;
          const _info = console.info;

          function sendLog(type, args) {
            window.parent.postMessage({
              type: 'IFRAME_CONSOLE_LOG',
              logType: type,
              message: args.map(arg => {
                if (arg === null) return 'null';
                if (arg === undefined) return 'undefined';
                if (typeof arg === 'object') {
                  try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                }
                return String(arg);
              }).join(' ')
            }, '*');
          }

          console.log = function(...args) {
            sendLog('log', args);
            _log.apply(console, args);
          };
          console.error = function(...args) {
            sendLog('error', args);
            _error.apply(console, args);
          };
          console.warn = function(...args) {
            sendLog('warn', args);
            _warn.apply(console, args);
          };
          console.info = function(...args) {
            sendLog('info', args);
            _info.apply(console, args);
          };

          window.onerror = function(message, source, lineno, colno, error) {
            window.parent.postMessage({
              type: 'IFRAME_CONSOLE_LOG',
              logType: 'error',
              message: message + (lineno ? ' (line ' + lineno + ')' : '')
            }, '*');
          };
        })();
      </script>
    `;

    // Modern Reset & Theme Styling matching application theme
    const commonStyle = `
      <style>
        body {
          margin: 0;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: ${theme === 'dark' ? '#f4f4f5' : '#18181b'};
          background-color: ${theme === 'dark' ? '#09090b' : '#ffffff'};
          line-height: 1.5;
        }
        button {
          background-color: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        button:hover {
          background-color: #2563eb;
        }
        pre {
          background-color: ${theme === 'dark' ? '#18181b' : '#f4f4f5'};
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
        }
      </style>
    `;

    if (['html', 'xml', 'svg'].includes(lowerLang)) {
      // Check if it already has body/html
      if (code.toLowerCase().includes('<html') || code.toLowerCase().includes('<body')) {
        // Inject our capturing console script inside the head or body
        const headIndex = code.toLowerCase().indexOf('<head>');
        if (headIndex !== -1) {
          return code.substring(0, headIndex + 6) + consoleCaptureScript + code.substring(headIndex + 6);
        }
        return consoleCaptureScript + code;
      }
      // Simple HTML snippet
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <!-- Add Tailwind Play CDN for rich styling in code block previews -->
            <script src="https://cdn.tailwindcss.com"></script>
            ${commonStyle}
            ${consoleCaptureScript}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }

    if (['css'].includes(lowerLang)) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyle}
            <style>${code}</style>
            ${consoleCaptureScript}
          </head>
          <body>
            <div class="css-preview">
              <h2 style="margin-top: 0;">Live CSS Preview</h2>
              <p>Your styles have been loaded. Below are standard components matching standard selectors.</p>
              
              <div style="margin: 16px 0; display: flex; gap: 12px;">
                <button class="btn btn-primary">Primary Button</button>
                <button class="btn btn-secondary" style="background-color: transparent; border: 1px solid #ccc; color: inherit;">Secondary Button</button>
              </div>

              <div class="card" style="border: 1px solid ${theme === 'dark' ? '#3f3f46' : '#e4e4e7'}; padding: 16px; border-radius: 8px;">
                <h3 style="margin-top: 0;">Sample Card Component</h3>
                <p>This is a container representing an active element or card. Customize it using selectors like <code>.card</code> or general styling.</p>
                <a href="#" style="color: #3b82f6;">Sample Link</a>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    if (['js', 'javascript', 'ts', 'typescript'].includes(lowerLang)) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyle}
            ${consoleCaptureScript}
          </head>
          <body>
            <h2 style="margin-top: 0; font-size: 18px; font-weight: 600;">JavaScript Playground</h2>
            <p style="font-size: 14px; opacity: 0.8;">The script ran successfully. Open the <strong>Console</strong> tab below to see standard logs and execution history.</p>
            <div style="margin-top: 16px; font-size: 13px; font-family: monospace; opacity: 0.6;">
              Running block code...
            </div>
            <script>
              try {
                ${code}
              } catch(err) {
                console.error(err.message);
              }
            </script>
          </body>
        </html>
      `;
    }

    if (['py', 'python'].includes(lowerLang)) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            ${commonStyle}
            ${consoleCaptureScript}
            <!-- Pyodide to run actual python live in the frame! -->
            <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
          </head>
          <body>
            <h2 style="margin-top: 0; font-size: 18px;">Python Web Sandbox</h2>
            <div id="status" style="font-size: 13px; color: #888; margin-bottom: 12px;">Initializing Python environment (Pyodide)...</div>
            
            <pre id="output" style="display: none;"></pre>

            <script>
              async function runPython() {
                const statusEl = document.getElementById('status');
                const outputEl = document.getElementById('output');
                try {
                  statusEl.innerText = "Running Python script...";
                  let pyodide = await loadPyodide();
                  statusEl.style.display = 'none';
                  outputEl.style.display = 'block';
                  
                  // Redirect standard out
                  pyodide.setStdout({
                    batched: (msg) => {
                      console.log(msg);
                      outputEl.innerText += msg + '\\n';
                    }
                  });
                  pyodide.setStderr({
                    batched: (msg) => {
                      console.error(msg);
                      outputEl.innerText += 'Error: ' + msg + '\\n';
                    }
                  });

                  await pyodide.runPythonAsync(\`${code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                } catch(err) {
                  statusEl.style.display = 'none';
                  outputEl.style.display = 'block';
                  statusEl.innerText = "";
                  console.error(err.message);
                  outputEl.innerText += "Execution Error: " + err.message + '\\n';
                }
              }
              runPython();
            </script>
          </body>
        </html>
      `;
    }

    // Default fallback (renders it as formatted text / simple markdown style)
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          ${commonStyle}
          ${consoleCaptureScript}
        </head>
        <body>
          <h2 style="margin-top: 0;">Execution Complete</h2>
          <p>This code format is not natively executed, but ran successfully inside the sandbox.</p>
          <pre>${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </body>
      </html>
    `;
  }, [code, language, theme, runTrigger]);

  const handleOpenExternal = () => {
    if (!code) return;
    const blob = new Blob([iframeSrcDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (!isOpen || !code) return null;

  return (
    <div className={cn(
      "w-full md:w-[480px] lg:w-[540px] xl:w-[600px] border-l border-border h-full flex flex-col bg-background relative shrink-0 z-40 transition-all duration-300 animate-in slide-in-from-right",
      "max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:shadow-2xl"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-muted/20 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold text-foreground text-[15px]">Code Sandbox</h3>
          <span className="text-[11px] font-mono font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            {language || "raw"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" 
            onClick={handleReload}
            title="Reload Sandbox"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" 
            onClick={handleOpenExternal}
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted" 
            onClick={onClose}
            title="Close Panel"
          >
            <X className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/60 bg-muted/10">
        <button
          onClick={() => setActiveTab('preview')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all",
            activeTab === 'preview' 
              ? "bg-background text-foreground shadow-sm border border-border" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Live Frame</span>
        </button>
        <button
          onClick={() => setActiveTab('console')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all relative",
            activeTab === 'console' 
              ? "bg-background text-foreground shadow-sm border border-border" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Console</span>
          {logs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-semibold w-4.5 h-4.5 rounded-full flex items-center justify-center scale-90 border border-background">
              {logs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all",
            activeTab === 'code' 
              ? "bg-background text-foreground shadow-sm border border-border" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Source</span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {activeTab === 'console' && logs.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 px-2" 
              onClick={clearConsole}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2" 
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-muted/5">
        {/* Live Preview Tab */}
        <div className={cn(
          "w-full h-full relative transition-all",
          activeTab === 'preview' ? "block" : "hidden"
        )}>
          <iframe
            ref={iframeRef}
            srcDoc={iframeSrcDoc}
            title="Code Sandbox Runner"
            className="w-full h-full border-none bg-white"
            sandbox="allow-scripts allow-modals"
          />
        </div>

        {/* Console Tab */}
        <div className={cn(
          "w-full h-full flex flex-col font-mono text-[13px] p-4 overflow-y-auto custom-scrollbar bg-slate-950 text-slate-100",
          activeTab === 'console' ? "block" : "hidden"
        )}>
          {logs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2 h-full py-20 select-none">
              <Terminal className="w-8 h-8 opacity-40 stroke-[1.5]" />
              <p className="font-sans text-sm">No console logs output yet.</p>
              <p className="font-sans text-xs opacity-75">Click 'Reload' or edit and run code blocks to see live telemetry.</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex flex-col">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "py-1 border-b border-slate-900/40 flex items-start gap-2.5 break-all animate-in fade-in duration-200",
                    log.type === 'error' ? "text-rose-400 bg-rose-950/10 px-2 rounded" :
                    log.type === 'warn' ? "text-amber-400 bg-amber-950/10 px-2 rounded" :
                    log.type === 'info' ? "text-sky-400" : "text-slate-300"
                  )}
                >
                  <span className="text-[10px] text-slate-500 select-none shrink-0 pt-0.5">
                    {log.timestamp.toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={cn(
                    "font-semibold select-none shrink-0 uppercase text-[9px] tracking-wide px-1 rounded h-fit pt-0.5 mt-0.5",
                    log.type === 'error' ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" :
                    log.type === 'warn' ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
                    "bg-slate-800 text-slate-400 border border-slate-700/30"
                  )}>
                    {log.type}
                  </span>
                  <span className="whitespace-pre-wrap leading-relaxed">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source Tab */}
        <div className={cn(
          "w-full h-full p-4 overflow-y-auto custom-scrollbar bg-muted/20",
          activeTab === 'code' ? "block" : "hidden"
        )}>
          <pre className="font-mono text-sm p-4 rounded-xl border border-border bg-background whitespace-pre-wrap break-all leading-relaxed">
            {code}
          </pre>
        </div>
      </div>
    </div>
  );
};
