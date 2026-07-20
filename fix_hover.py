import re
with open("components/editor/editor-area.tsx", "r") as f:
    text = f.read()

target = """      if (table && previewRef.current.contains(table) && !target.closest('.table-floating-toolbar')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredTable !== table) setHoveredTable(table);
        updateTableRect(table);
        setHoveredImage(null);
        setHoveredSketch(null);
        setHoveredLink(null);
      } else if (sketch && previewRef.current.contains(sketch) && !target.closest('.sketch-floating-toolbar')) {"""

replacement = """      if (table && previewRef.current.contains(table) && !target.closest('.table-floating-toolbar')) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (hoveredTable !== table) setHoveredTable(table);
        
        // Update active table row based on mouse cursor position
        const tr = target.closest('tr');
        if (tr) {
          setActiveTableRow(tr as HTMLTableRowElement);
        }
        
        updateTableRect(table);
        setHoveredImage(null);
        setHoveredSketch(null);
        setHoveredLink(null);
      } else if (sketch && previewRef.current.contains(sketch) && !target.closest('.sketch-floating-toolbar')) {"""

if target in text:
    print("Found target! Replacing...")
    text = text.replace(target, replacement)
else:
    print("Not found!")

with open("components/editor/editor-area.tsx", "w") as f:
    f.write(text)
