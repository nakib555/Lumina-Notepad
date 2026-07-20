import re
with open("components/editor/editor-area.tsx", "r") as f:
    text = f.read()

target = """        <div 
          className="table-floating-toolbar absolute z-30 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] pointer-events-auto p-1.5 transition-all duration-150 animate-in fade-in zoom-in-95 print:hidden select-none"
          style={(() => {
            let activeRowIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
            if (activeRowIdx === null && activeTableRow) {
              activeRowIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
            }
            if (activeRowIdx === null || activeRowIdx < 0) activeRowIdx = 0;
            const activeRowTop = (rowRects[activeRowIdx] && rowRects[activeRowIdx].top) ?? tableRect.top;
            return {
              top: Math.max(0, activeRowTop - 54),
              left: Math.max(0, tableRect.left),
            };
          })()}"""

replacement = """        <div 
          className="table-floating-toolbar absolute z-30 flex items-center gap-1 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] pointer-events-auto p-1.5 transition-all duration-150 animate-in fade-in zoom-in-95 print:hidden select-none"
          style={(() => {
            let activeRowIdx = selectedRowIndex !== null ? selectedRowIndex : (activeCell ? activeCell.r : null);
            if (activeRowIdx === null && activeTableRow) {
              activeRowIdx = Array.from(hoveredTable.querySelectorAll('tr')).indexOf(activeTableRow);
            }
            if (activeRowIdx === null || activeRowIdx < 0) activeRowIdx = 0;
            
            const activeRowTop = (rowRects[activeRowIdx] && rowRects[activeRowIdx].top) ?? tableRect.top;
            
            // Calculate viewport constraints
            const parentRect = previewRef.current?.parentElement?.getBoundingClientRect();
            let minTop = 0;
            if (parentRect && parentRect.top < 0) {
              // If the container is scrolled up, keep the toolbar visible
              minTop = -parentRect.top + 10; 
            }
            
            // Adjust position so it doesn't clip off screen
            let topPosition = activeRowTop - 54;
            if (topPosition < minTop) {
              topPosition = minTop; // stick to top of screen
            }
            // Keep it within the table bounds (don't go below the table)
            const maxTop = tableRect.top + tableRect.height - 40;
            if (topPosition > maxTop) {
              topPosition = maxTop;
            }

            return {
              top: topPosition,
              left: Math.max(0, tableRect.left),
            };
          })()}"""

if target in text:
    print("Found target 1! Replacing...")
    text = text.replace(target, replacement)
else:
    print("Not found 1!")

with open("components/editor/editor-area.tsx", "w") as f:
    f.write(text)
