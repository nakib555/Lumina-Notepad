import re
with open("components/editor/editor-area.tsx", "r") as f:
    text = f.read()

target = """    // Process active table row for floating delete icon
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) {
      setActiveTableRow(null);
      return;
    }
    
    const node = sel.anchorNode;
    if (!previewRef.current.contains(node)) {
      setActiveTableRow(null);
      return;
    }

    // Typewriter mode logic, now permanently enabled"""

replacement = """    // Process active table row for floating delete icon
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.anchorNode) {
      setActiveTableRow(null);
      return;
    }
    
    const node = sel.anchorNode;
    if (!previewRef.current.contains(node)) {
      setActiveTableRow(null);
      return;
    }

    // Update active table row if we're inside a table
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    if (el) {
      const cell = el.closest('td, th');
      if (cell) {
        const indices = getCellIndices(cell as HTMLElement);
        if (indices) {
          setActiveCell({ r: indices.r, c: indices.c });
          setActiveTableRow(indices.tr as HTMLTableRowElement);
          if (hoveredTable !== indices.table) {
            setHoveredTable(indices.table);
            updateTableRect(indices.table);
          }
        }
      } else {
         // Optionally clear activeTableRow if we navigated out of the table entirely
         // Wait, if we hover over the table, it stays, but if we navigate out with keyboard...
         setActiveTableRow(null);
      }
    }

    // Typewriter mode logic, now permanently enabled"""

if target in text:
    print("Found! Replacing...")
    new_text = text.replace(target, replacement)
    with open("components/editor/editor-area.tsx", "w") as f:
        f.write(new_text)
else:
    print("Not found!")
