import re
with open("components/editor/editor-area.tsx", "r") as f:
    text = f.read()

target = """      {!isViewMode && hoveredTable && tableRect && (
        <>
          {/* Notion-style bottom "+" button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const controller = getTableController(hoveredTable);
              const model = controller.getModel();
              const result = controller.applyPatches([{
                patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
                type: PatchType.INSERT_ROW,
                timestamp: Date.now(),
                payload: { count: 1, at: model.rowCount }
              }]);
              if (result.success) {
                renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
                
                // Focus the first cell of the newly added row
                setTimeout(() => {
                  const rows = Array.from(hoveredTable.querySelectorAll('tr'));
                  const newTr = rows[model.rowCount];
                  if (newTr) {
                    const addedCell = newTr.children[0] as HTMLElement;
                    if (addedCell) focusCell(addedCell);
                  }
                }, 50);
              }
            }}
            className="table-overlay-btn absolute z-20 w-5 h-5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 print:hidden cursor-pointer"
            style={{
              top: tableRect.top + tableRect.height + 6,
              left: tableRect.left + tableRect.width / 2 - 10,
            }}
            title="Add Row"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Notion-style right "+" button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const controller = getTableController(hoveredTable);
              const model = controller.getModel();
              const result = controller.applyPatches([{
                patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
                type: PatchType.INSERT_COL,
                timestamp: Date.now(),
                payload: { count: 1, at: model.colCount }
              }]);
              if (result.success) {
                renderDOMPatches(hoveredTable, controller, result.domPatches, flushPreviewEdit);
              }
            }}
            className="table-overlay-btn absolute z-20 w-5 h-5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 active:scale-95 print:hidden cursor-pointer"
            style={{
              top: tableRect.top + tableRect.height / 2 - 10,
              left: tableRect.left + tableRect.width + 6,
            }}
            title="Add Column"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </>
      )}"""

if target in text:
    print("Found! Removing...")
    new_text = text.replace(target + "\n", "")
    with open("components/editor/editor-area.tsx", "w") as f:
        f.write(new_text)
else:
    print("Not found!")
