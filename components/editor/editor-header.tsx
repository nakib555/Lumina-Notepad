import { 
  Menu, Undo2, Redo2, 
  Download, FileCode, FileText, Printer, 
  Copy, CheckCircle2, Bug,
  Eye, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorHeaderProps {
  onToggleSidebar: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  historyIndex: number;
  historyLength: number;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  exportMenuRef: React.RefObject<HTMLDivElement | null>;
  exportNote: (format: 'txt' | 'md' | 'pdf') => void;
  showCopyMenu: boolean;
  setShowCopyMenu: (show: boolean) => void;
  copyMenuRef: React.RefObject<HTMLDivElement | null>;
  handleCopyNote: (format: 'normal' | 'markdown') => void;
  stats: { words: number; chars: number; readingTime: number };
  saveStatus: "saved" | "saving";
  downloadLogs: () => void;
  isViewMode: boolean;
  setIsViewMode: (viewMode: boolean) => void;
}

export const EditorHeader = ({
  onToggleSidebar,
  handleUndo,
  handleRedo,
  historyIndex,
  historyLength,
  showExportMenu,
  setShowExportMenu,
  exportMenuRef,
  exportNote,
  showCopyMenu,
  setShowCopyMenu,
  copyMenuRef,
  handleCopyNote,
  stats,
  saveStatus,
  downloadLogs,
  isViewMode,
  setIsViewMode
}: EditorHeaderProps) => {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-2 sm:px-4 shrink-0 bg-background/80 backdrop-blur-md z-10 print:hidden">
      <div className="flex items-center gap-1 sm:gap-2 py-1 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar} 
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </Button>
        <div className="h-4 w-px bg-border mx-1 hidden sm:block shrink-0" aria-hidden="true" />
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsViewMode(!isViewMode)} 
          className={`h-9 px-3 gap-2 shrink-0 ${isViewMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}`}
          title={isViewMode ? "Switch to Edit Mode" : "Switch to View Mode"}
        >
          {isViewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="hidden sm:inline font-medium">{isViewMode ? "Edit Mode" : "View Mode"}</span>
        </Button>

        {!isViewMode && (
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleUndo} 
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              disabled={historyIndex <= 0}
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleRedo} 
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              disabled={historyIndex >= historyLength - 1}
            >
              <Redo2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <div className="relative" ref={copyMenuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCopyMenu(!showCopyMenu)}
            className="h-9 px-2 sm:px-3 gap-2 text-muted-foreground hover:bg-muted rounded-xl shrink-0"
            aria-label="Copy options"
            aria-haspopup="menu"
            aria-expanded={showCopyMenu}
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          
          {showCopyMenu && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200"
              role="menu"
              aria-orientation="vertical"
            >
              <div className="px-2 py-1.5 mb-1" role="presentation">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" id="copy-options-heading">Copy Options</h3>
              </div>
              <button 
                onClick={() => handleCopyNote('normal')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="copy-plain-text"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="copy-plain-text">Plain Text</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Strips all markdown formatting</span>
                </div>
              </button>
              <button 
                onClick={() => handleCopyNote('markdown')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="copy-markdown"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="copy-markdown">Markdown</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Preserves raw markdown syntax</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={exportMenuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="h-9 px-2 sm:px-3 gap-2 text-muted-foreground hover:bg-muted rounded-xl shrink-0"
            aria-label="Export options"
            aria-haspopup="menu"
            aria-expanded={showExportMenu}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          {showExportMenu && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200"
              role="menu"
              aria-orientation="vertical"
            >
              <div className="px-2 py-1.5 mb-1" role="presentation">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" id="export-options-heading">Export Options</h3>
              </div>
              <button 
                onClick={() => exportNote('md')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="export-markdown"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="export-markdown">Markdown (.md)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Export with raw formatting</span>
                </div>
              </button>
              <button 
                onClick={() => exportNote('txt')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="export-text"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="export-text">Plain Text (.txt)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Export without formatting</span>
                </div>
              </button>
              <button 
                onClick={() => exportNote('pdf')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="export-pdf"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="export-pdf">Print / PDF</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Print or save as PDF</span>
                </div>
              </button>
              <div className="h-px bg-border my-1" aria-hidden="true" />
              <button 
                onClick={() => { downloadLogs(); setShowExportMenu(false); }}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                role="menuitem"
                aria-labelledby="export-logs"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors" aria-hidden="true">
                  <Bug className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium" id="export-logs">Download Debug Logs</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Export markdown conversion logs</span>
                </div>
              </button>
            </div>
          )}
        </div>

        <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block" aria-live="polite">
          {stats.words} words {'\u2022'} {stats.chars} chars {'\u2022'} {stats.readingTime} min read
        </span>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground" aria-live="polite">
          {saveStatus === "saving" ? (
            <span className="animate-pulse">Saving...</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Autosaved
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
