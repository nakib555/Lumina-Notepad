import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X, Check, Loader2, Sparkles, SlidersHorizontal } from "lucide-react";
import { useGoogleFonts, POPULAR_FONTS, loadGoogleFont } from "./font-loader";
import { cn } from "@/lib/utils";

interface FontPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: string;
  onSelectFont: (font: string) => void;
}

type FontCategory = "all" | "popular" | "sans" | "serif" | "mono" | "handwriting" | "display";

export function FontPickerDialog({
  isOpen,
  onClose,
  currentFont,
  onSelectFont,
}: FontPickerDialogProps) {
  const { fonts, isLoading } = useGoogleFonts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory>("popular");
  const [hoveredFont, setHoveredFont] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("Lumina Notepad is beautiful, minimal, and fully customizable.");

  // Helper to categorize fonts
  const getFontCategory = (font: string): "sans" | "serif" | "mono" | "handwriting" | "display" | "other" => {
    const lower = font.toLowerCase();
    if (lower.includes("mono") || lower.includes("code") || lower.includes("console") || lower.includes("jetbrains")) return "mono";
    if (lower.includes("sans") || lower.includes("inter") || lower.includes("poppins") || lower.includes("roboto") || lower.includes("helvetica") || lower.includes("lato")) return "sans";
    if (lower.includes("serif") || lower.includes("slab") || lower.includes("lora") || lower.includes("merriweather") || lower.includes("baskerville") || lower.includes("garamond")) return "serif";
    if (lower.includes("script") || lower.includes("hand") || lower.includes("brush") || lower.includes("cursive") || lower.includes("signature") || lower.includes("drawing") || lower.includes("write")) return "handwriting";
    if (lower.includes("display") || lower.includes("black") || lower.includes("one") || lower.includes("neue") || lower.includes("grotesk") || lower.includes("headline") || lower.includes("bebas") || lower.includes("play")) return "display";
    return "other";
  };

  // Pre-load the current font when the dialog opens
  useEffect(() => {
    if (isOpen && currentFont) {
      loadGoogleFont(currentFont);
    }
  }, [isOpen, currentFont]);

  // Load dynamically on hover
  const handleHoverFont = (font: string) => {
    setHoveredFont(font);
    loadGoogleFont(font);
  };

  // Filter fonts
  const filteredFonts = useMemo(() => {
    return fonts.filter((font) => {
      // Search matching
      const matchesSearch = font.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Category matching
      if (activeCategory === "all") return true;
      if (activeCategory === "popular") return POPULAR_FONTS.includes(font);
      
      const cat = getFontCategory(font);
      return cat === activeCategory;
    });
  }, [fonts, search, activeCategory]);

  // Limit rendering to first 120 fonts to avoid lag, but show a "and X more" if it exceeds
  const visibleFonts = useMemo(() => {
    return filteredFonts.slice(0, 120);
  }, [filteredFonts]);

  const activeFontForPreview = hoveredFont || currentFont;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-background border border-border flex flex-col h-[85vh] sm:h-[620px]">
        {/* Header */}
        <div className="p-5 border-b border-border/60 pb-4">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 tracking-tight">
            <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-500/10 animate-pulse" />
            Lumina Font Explorer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs mt-1">
            Search and select from {isLoading ? "loading..." : "2,000+"} premium Google Fonts to elevate your typography.
          </DialogDescription>
        </div>

        {/* Search & Categories */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border/50 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                // Switch to "all" if user starts searching and nothing matches in current category
                if (activeCategory === "popular") {
                  setActiveCategory("all");
                }
              }}
              placeholder="Search font styles (e.g. Montserrat, Playfair, Pacifico)..."
              className="pl-9 pr-8 h-10 w-full rounded-lg bg-background border-border/80 focus-visible:ring-indigo-500 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted text-muted-foreground rounded-full transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Categories Tab Scroll */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 flex-nowrap select-none">
            {[
              { id: "popular", label: "🔥 Popular" },
              { id: "all", label: "🌐 All Fonts" },
              { id: "sans", label: "✍️ Sans Serif" },
              { id: "serif", label: "📚 Serif" },
              { id: "mono", label: "💻 Monospace" },
              { id: "handwriting", label: "🎨 Handwriting" },
              { id: "display", label: "🌟 Display" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as FontCategory);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full border transition-all duration-150 flex-shrink-0 cursor-pointer",
                  activeCategory === cat.id
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400"
                    : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font List Container */}
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-background/50">
          {isLoading && fonts.length <= POPULAR_FONTS.length && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Fetching 2,000+ Google Fonts...</span>
            </div>
          )}

          {visibleFonts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-3xl">🏜️</span>
              <span className="text-sm font-semibold text-foreground mt-3">No matching fonts found</span>
              <span className="text-xs text-muted-foreground mt-1 max-w-xs">
                Try searching for another font style or select "All Fonts".
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {visibleFonts.map((font) => {
                const isSelected = currentFont.toLowerCase() === font.toLowerCase();
                const category = getFontCategory(font);
                
                return (
                  <button
                    key={font}
                    onClick={() => {
                      onSelectFont(font);
                      onClose();
                    }}
                    onMouseEnter={() => handleHoverFont(font)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between group relative overflow-hidden cursor-pointer",
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900"
                        : "bg-background border-border/50 hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{font}</span>
                      <span 
                        style={{ fontFamily: font }}
                        className={cn(
                          "text-base truncate tracking-tight text-muted-foreground mt-0.5",
                          isSelected && "text-indigo-600 dark:text-indigo-400 font-medium"
                        )}
                      >
                        Sample Style
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded text-muted-foreground/80 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                        {category}
                      </span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-500/20">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredFonts.length > visibleFonts.length && (
            <div className="text-center py-4 text-xs text-muted-foreground border-t border-border/40 mt-4 font-medium">
              Showing top {visibleFonts.length} of {filteredFonts.length} results. Use the search bar to find more specific styles.
            </div>
          )}
        </div>

        {/* Live Preview Panel & Quick Input */}
        <div className="p-4 bg-muted/30 border-t border-border/60 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="w-3 h-3 text-indigo-500" />
              Active Preview: <span className="text-foreground font-semibold font-mono">{activeFontForPreview}</span>
            </span>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="text-[11px] bg-background border border-border/80 rounded px-2 py-0.5 w-[180px] sm:w-[240px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:text-foreground transition-all truncate"
              title="Edit preview text"
              placeholder="Edit preview text..."
            />
          </div>

          <div className="p-3 bg-background border border-border/80 rounded-xl min-h-[64px] flex items-center shadow-inner">
            <p 
              style={{ fontFamily: activeFontForPreview }} 
              className="text-base sm:text-lg text-foreground w-full leading-relaxed transition-all duration-200"
            >
              {previewText || "Type something to see the font in action..."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
