import { 
  Menu, Eye, Edit3, Undo2, Redo2, 
  Download, FileCode, FileText, Printer, 
  Copy, CheckCircle2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  onToggleSidebar: () => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (mode: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  historyIndex: number;
  historyLength: number;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  exportMenuRef: React.RefObject<HTMLDivElement>;
  exportNote: (format: 'txt' | 'md' | 'pdf') => void;
  showCopyMenu: boolean;
  setShowCopyMenu: (show: boolean) => void;
  copyMenuRef: React.RefObject<HTMLDivElement>;
  handleCopyNote: (format: 'normal' | 'markdown') => void;
  stats: { words: number; chars: number; readingTime: number };
  saveStatus: "saved" | "saving";
}

export const EditorHeader = ({
  onToggleSidebar,
  isPreviewMode,
  setIsPreviewMode,
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
  saveStatus
}: EditorHeaderProps) => {
  return (
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
                disabled={historyIndex >= historyLength - 1}
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
        <div className="relative" ref={copyMenuRef}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowCopyMenu(!showCopyMenu)}
            className="h-9 px-2 sm:px-3 gap-2 text-muted-foreground hover:bg-muted rounded-xl shrink-0"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          
          {showCopyMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200">
              <div className="px-2 py-1.5 mb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Copy Options</h3>
              </div>
              <button 
                onClick={() => handleCopyNote('normal')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Plain Text</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Strips all markdown formatting</span>
                </div>
              </button>
              <button 
                onClick={() => handleCopyNote('markdown')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Markdown</span>
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
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-2 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200">
              <div className="px-2 py-1.5 mb-1">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Export Options</h3>
              </div>
              <button 
                onClick={() => exportNote('md')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  <FileCode className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Markdown (.md)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Export with raw formatting</span>
                </div>
              </button>
              <button 
                onClick={() => exportNote('txt')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Plain Text (.txt)</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Export without formatting</span>
                </div>
              </button>
              <button 
                onClick={() => exportNote('pdf')}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left text-popover-foreground hover:bg-muted/80 rounded-xl transition-all group"
              >
                <div className="mt-0.5 bg-background shadow-sm border border-border/50 p-1.5 rounded-md group-hover:text-primary group-hover:border-primary/30 transition-colors">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Print / PDF</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Print or save as PDF</span>
                </div>
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
        </div>
      </div>
    </header>
  );
};
