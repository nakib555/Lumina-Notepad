import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Check, Loader2, Sliders } from "lucide-react";
import { useGoogleFonts, POPULAR_FONTS, loadGoogleFont } from "./font-loader";
import { cn } from "@/lib/utils";

interface EditorSettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: string;
  onSelectFont: (font: string) => void;
  baseFontSize: string;
  onBaseFontSizeChange: (size: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

type FontCategory = "all" | "popular" | "sans" | "serif" | "mono" | "handwriting" | "display";

export function EditorSettingsDropdown({
  isOpen,
  onClose,
  currentFont,
  onSelectFont,
  baseFontSize,
  onBaseFontSizeChange,
  triggerRef,
}: EditorSettingsDropdownProps) {
  const { fonts, isLoading } = useGoogleFonts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory>("popular");
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close when clicking outside dropdown and trigger button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Pre-load the current font when the dropdown opens
  useEffect(() => {
    if (isOpen && currentFont) {
      loadGoogleFont(currentFont);
    }
  }, [isOpen, currentFont]);

  // Load dynamically on hover
  const handleHoverFont = (font: string) => {
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

  // Limit rendering to prevent DOM bloat in dropdown
  const visibleFonts = useMemo(() => {
    return filteredFonts.slice(0, 80);
  }, [filteredFonts]);

  const fontSizes = [
    { id: 'text-sm', label: 'Small', tag: 'S' },
    { id: 'text-base', label: 'Medium', tag: 'M' },
    { id: 'text-lg', label: 'Large', tag: 'L' },
    { id: 'text-xl', label: 'X-Large', tag: 'XL' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-1rem)] bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-0 z-50 overflow-hidden flex flex-col h-[480px]"
          style={{ transformOrigin: "top right" }}
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border/50 bg-muted/20">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Editor Typography Settings
            </h3>
          </div>

          {/* Base Font Size Selector Section */}
          <div className="p-3 border-b border-border/40 flex flex-col gap-2 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Text Size
            </span>
            <div className="grid grid-cols-4 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/30">
              {fontSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => onBaseFontSizeChange(size.id)}
                  className={cn(
                    "py-1.5 rounded-md text-xs font-medium transition-all focus:outline-none flex flex-col items-center justify-center",
                    baseFontSize === size.id
                      ? "bg-background shadow-sm text-foreground border border-border/50 font-semibold"
                      : "text-muted-foreground/80 hover:text-foreground hover:bg-background/20"
                  )}
                  title={size.label}
                >
                  <span className="text-[10px]">{size.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search bar & Categories scroll */}
          <div className="p-3 bg-muted/10 border-b border-border/40 flex flex-col gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (activeCategory === "popular" && e.target.value) {
                    setActiveCategory("all");
                  }
                }}
                placeholder="Search 2,000+ fonts..."
                className="pl-8 pr-7 h-8 w-full rounded-lg bg-background border border-border/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted text-muted-foreground rounded-full transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Scrollable Categories Pills */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 select-none shrink-0 flex-nowrap">
              {[
                { id: "popular", label: "🔥 Pop" },
                { id: "all", label: "🌐 All" },
                { id: "sans", label: "✍️ Sans" },
                { id: "serif", label: "📚 Serif" },
                { id: "mono", label: "💻 Mono" },
                { id: "handwriting", label: "🎨 Hand" },
                { id: "display", label: "🌟 Disp" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as FontCategory)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all shrink-0 cursor-pointer",
                    activeCategory === cat.id
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Container */}
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-background/40">
            {isLoading && fonts.length <= POPULAR_FONTS.length && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <span className="text-[10px] font-medium">Fetching 2,000+ fonts...</span>
              </div>
            )}

            {visibleFonts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="text-xl">🏜️</span>
                <span className="text-xs font-semibold text-foreground mt-2">No fonts found</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">
                  Try another query or select "All" category
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleFonts.map((font) => {
                  const isSelected = currentFont.toLowerCase() === font.toLowerCase();
                  const category = getFontCategory(font);
                  
                  return (
                    <button
                      key={font}
                      onClick={() => {
                        onSelectFont(font);
                      }}
                      onMouseEnter={() => handleHoverFont(font)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-lg border transition-all duration-150 flex items-center justify-between group relative overflow-hidden cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900"
                          : "bg-background border-border/50 hover:bg-muted/50 hover:border-border"
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[11px] font-bold text-foreground truncate">{font}</span>
                        <span 
                          style={{ fontFamily: font }}
                          className={cn(
                            "text-sm truncate tracking-tight text-muted-foreground/80 mt-0.5",
                            isSelected && "text-indigo-600 dark:text-indigo-400 font-medium"
                          )}
                        >
                          Aa Bb Cc Gg 123
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[8px] uppercase tracking-wider px-1 bg-muted rounded text-muted-foreground/75 font-semibold">
                          {category}
                        </span>
                        {isSelected && (
                          <div className="h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredFonts.length > visibleFonts.length && (
              <div className="text-center py-2 text-[9px] text-muted-foreground border-t border-border/40 mt-2 font-medium">
                Showing top {visibleFonts.length} of {filteredFonts.length} results.
              </div>
            )}
          </div>

          {/* Instant Apply Notice */}
          <div className="px-3 py-2 bg-muted/20 border-t border-border/50 text-[10px] text-muted-foreground/80 font-medium flex items-center justify-between shrink-0">
            <span>Font applies instantly to notes only</span>
            <span className="font-semibold text-indigo-500">Live Preview</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
