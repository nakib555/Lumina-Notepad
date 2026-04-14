import React from 'react';
import { cn } from "@/lib/utils";
import { FloatingToolbar } from "./floating-toolbar";

interface BottomBarProps {
  symbolMenuRef: React.RefObject<HTMLDivElement | null>;
  showSymbolMenu: boolean;
  setShowSymbolMenu: (show: boolean) => void;
  symbolScrollRef: React.RefObject<HTMLDivElement | null>;
  handleSymbolMouseDown: (e: React.MouseEvent) => void;
  handleSymbolMouseLeave: () => void;
  handleSymbolMouseUp: () => void;
  handleSymbolMouseMove: (e: React.MouseEvent) => void;
  isSymbolDragging: boolean;
  applyFormatting: (prefix: string, suffix?: string, toggle?: boolean) => void;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  applyFontSize: (size: string) => void;
  textareaRef: React.RefObject<HTMLDivElement | null>;
}

export const BottomBar = ({
  symbolMenuRef,
  showSymbolMenu,
  setShowSymbolMenu,
  symbolScrollRef,
  handleSymbolMouseDown,
  handleSymbolMouseLeave,
  handleSymbolMouseUp,
  handleSymbolMouseMove,
  isSymbolDragging,
  applyFormatting,
  toolbarRef,
  isDragging,
  handleMouseDown,
  handleMouseLeave,
  handleMouseUp,
  handleMouseMove,
  fontFamily,
  onFontFamilyChange,
  applyFontSize,
  textareaRef
}: BottomBarProps) => {

  return (
    <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-20 px-2 sm:px-4 flex justify-center pointer-events-none">
      <div 
        className="relative pointer-events-auto max-w-full flex flex-col items-center" 
        ref={symbolMenuRef}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) {
            e.preventDefault();
          }
        }}
        onTouchStart={() => {
          // Reset drag state on new touch
          if (symbolMenuRef.current) {
            symbolMenuRef.current.dataset.touchDragging = 'false';
          }
        }}
        onTouchMove={() => {
          // Mark as dragging if touch moves
          if (symbolMenuRef.current) {
            symbolMenuRef.current.dataset.touchDragging = 'true';
          }
        }}
        onTouchEnd={(e) => {
          const button = (e.target as HTMLElement).closest('button');
          const isDragging = symbolMenuRef.current?.dataset.touchDragging === 'true';
          
          if (button && !isDragging) {
            // Prevent default to stop iOS from blurring the textarea and closing the keyboard
            e.preventDefault();
            // Manually trigger the click since we prevented the default touch behavior
            button.click();
          }
        }}
      >
        {showSymbolMenu && (
          <div 
            ref={symbolScrollRef}
            onMouseDown={handleSymbolMouseDown}
            onMouseLeave={handleSymbolMouseLeave}
            onMouseUp={handleSymbolMouseUp}
            onMouseMove={handleSymbolMouseMove}
            className={cn(
              "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-md border border-border rounded-2xl py-1.5 px-2 z-50 animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200 flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[88vw] md:max-w-[700px] flex-nowrap select-none touch-pan-x",
              isSymbolDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            role="menu"
            aria-label="Symbols"
            aria-orientation="horizontal"
          >
            {['★', '✓', '→', '←', '↑', '↓', '•', '©', '®', '™', '°', '±', '≠', '∞', '≈', '×', '÷', '∑', 'π', 'Ω'].map(sym => (
              <button
                key={sym}
                onClick={() => {
                  applyFormatting(sym, "", false);
                  setShowSymbolMenu(false);
                }}
                className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label={`Insert symbol ${sym}`}
                role="menuitem"
              >
                {sym}
              </button>
            ))}
          </div>
        )}
        <FloatingToolbar 
          toolbarRef={toolbarRef}
          isDragging={isDragging}
          handleMouseDown={handleMouseDown}
          handleMouseLeave={handleMouseLeave}
          handleMouseUp={handleMouseUp}
          handleMouseMove={handleMouseMove}
          fontFamily={fontFamily}
          onFontFamilyChange={onFontFamilyChange}
          applyFontSize={applyFontSize}
          applyFormatting={applyFormatting}
          onToggleSymbolMenu={() => setShowSymbolMenu(!showSymbolMenu)}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
};
