import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Loader2, Copy, Check, CornerDownLeft, 
  Globe, Wand2, RefreshCw, FileText
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { marked } from "marked";

interface AiAssistantDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: string;
  noteContext: string;
  onInsertText: (newText: string) => void;
}

export const AiAssistantDialog = ({
  isOpen,
  onClose,
  selectedText,
  noteContext,
  onInsertText
}: AiAssistantDialogProps) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomPrompt("");
      setResult("");
      setCopied(false);
      // Auto focus custom input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleAction = async (action: string, overridePrompt?: string) => {
    setIsLoading(true);
    setResult("");
    try {
      const response = await fetch("/api/gemini/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: selectedText || noteContext || "",
          context: noteContext,
          customPrompt: overridePrompt || customPrompt || (action === "translate" ? targetLanguage : undefined)
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to process request");
      }

      const data = await response.json();
      setResult(data.result || "");
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to get AI assistance.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied AI output to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (!result) return;
    onInsertText(result);
    toast.success("AI suggestion inserted!");
    onClose();
  };

  const presets = [
    { id: "summarize", label: "Summarize", desc: "Create a summary", icon: FileText, color: "text-blue-500 hover:bg-blue-500/10" },
    { id: "improve", label: "Improve Writing", desc: "Polish & refine writing", icon: Wand2, color: "text-violet-500 hover:bg-violet-500/10" },
    { id: "grammar", label: "Fix Grammar", desc: "Correct spelling & typos", icon: Check, color: "text-emerald-500 hover:bg-emerald-500/10" },
    { id: "longer", label: "Expand", desc: "Make longer & detailed", icon: Sparkles, color: "text-amber-500 hover:bg-amber-500/10" },
    { id: "shorter", label: "Condense", desc: "Make highly concise", icon: Sparkles, color: "text-rose-500 hover:bg-rose-500/10" },
  ];

  const tones = [
    { id: "tone_professional", label: "Professional" },
    { id: "tone_casual", label: "Casual" },
    { id: "tone_creative", label: "Creative" },
  ];

  const languages = ["Spanish", "French", "German", "Japanese", "Chinese", "Italian"];

  const renderResultHtml = () => {
    try {
      return { __html: marked.parse(result) as string };
    } catch {
      return { __html: result };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col p-6 overflow-hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
            Lumina AI Writing Partner
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {selectedText 
              ? `Processing selected text (${selectedText.length} characters)` 
              : "No text selected. Operating on the entire note context."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin">
          {/* Preset Commands Grid */}
          {!result && !isLoading && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick Prompts</span>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleAction(p.id)}
                    className="flex items-start gap-3 p-3 text-left border border-border/40 rounded-2xl hover:border-border hover:bg-muted/40 transition-all focus:outline-none group"
                  >
                    <div className={`p-2 bg-background border border-border/40 rounded-xl group-hover:scale-105 transition-transform ${p.color}`}>
                      <p.icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground leading-tight">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">{p.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Tones Row */}
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Adjust Tone</span>
                <div className="flex flex-wrap gap-1.5">
                  {tones.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(t.id)}
                      className="rounded-xl border-border/40 hover:bg-muted text-xs px-3 py-1.5"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Translation Row */}
              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Translate Selection</span>
                <div className="flex items-center gap-2">
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="h-9 rounded-xl border border-border/40 bg-background px-3 py-1 text-xs outline-none focus:ring-1 focus:ring-primary focus:border-primary max-w-[150px] cursor-pointer"
                  >
                    {languages.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("translate")}
                    className="rounded-xl border-border/40 hover:bg-muted text-xs gap-1.5 h-9"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    Translate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-foreground">Lumina is thinking...</p>
                <p className="text-xs text-muted-foreground animate-pulse">Polishing your sentences with Gemini 3.5 Flash</p>
              </div>
            </div>
          )}

          {/* AI Result Area */}
          {result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">AI Generated Suggestion</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleAction("custom")}
                  className="h-7 text-xs rounded-lg gap-1.5 text-violet-500 hover:text-violet-600 hover:bg-violet-500/10"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </Button>
              </div>
              
              <div className="border border-border/40 bg-muted/30 rounded-2xl p-4 overflow-y-auto max-h-[300px] text-sm prose dark:prose-invert prose-compact">
                <div dangerouslySetInnerHTML={renderResultHtml()} />
              </div>
            </div>
          )}

          {/* Custom Instruction Prompt Input */}
          {!isLoading && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Custom Instructions</span>
              <div className="relative flex items-center">
                <Textarea
                  ref={inputRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ask AI to 'summarize in 3 bullet points', 'make it sound witty', 'translate to Japanese'..."
                  className="min-h-[70px] pr-12 rounded-2xl resize-none border-border/40 bg-background/50 text-xs shadow-sm focus-visible:ring-1 focus-visible:ring-violet-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (customPrompt.trim()) {
                        handleAction("custom");
                      }
                    }
                  }}
                />
                <Button
                  size="icon"
                  onClick={() => customPrompt.trim() && handleAction("custom")}
                  disabled={!customPrompt.trim()}
                  className="absolute right-3 bottom-3 h-7 w-7 rounded-xl bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition-transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <DialogFooter className="shrink-0 border-t border-border/30 pt-4 flex sm:justify-between items-center gap-2">
          {result ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setResult("");
                  setCustomPrompt("");
                }}
                className="rounded-xl border-border/40 hover:bg-muted text-xs h-9"
              >
                Go Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="rounded-xl border-border/40 hover:bg-muted text-xs gap-1.5 h-9"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </Button>
                <Button
                  onClick={handleInsert}
                  className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs h-9 shadow-md shadow-violet-500/15"
                >
                  Insert / Replace Selection
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl text-xs text-muted-foreground hover:text-foreground h-9"
              >
                Cancel
              </Button>
              {selectedText && (
                <Button
                  onClick={() => handleAction("complete")}
                  className="rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-xs h-9 shadow-md shadow-violet-500/15 gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Smart Continue
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
