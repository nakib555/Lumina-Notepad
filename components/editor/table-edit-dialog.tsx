/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Rows3, Columns3, Plus, Minus, Settings2, ArrowLeftToLine, ArrowRightToLine, ArrowUpToLine, ArrowDownToLine, Trash2, AlignLeft, AlignCenter, AlignRight, Lock, Unlock } from "lucide-react";

const CURVE_LEVELS = [
  { value: 0, class: '' },
  { value: 1, class: 'rounded-sm' },
  { value: 2, class: 'rounded-md' },
  { value: 3, class: 'rounded-lg' },
  { value: 4, class: 'rounded-xl' },
  { value: 5, class: 'rounded-2xl' },
  { value: 6, class: 'rounded-3xl' },
];

interface TableEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  table: HTMLTableElement | null;
  onConfirm: (rows: number, cols: number, curveClass: string, tableData?: { headers: string[], rows: string[][], alignments: string[] }) => void;
}

export const TableEditDialog = ({ isOpen, onClose, table, onConfirm }: TableEditDialogProps) => {
  const [rows, setRows] = useState<number | string>(2);
  const [cols, setCols] = useState<number | string>(2);
  const [activeTab, setActiveTab] = useState<'rows' | 'cols'>('rows');
  const [curveLevel, setCurveLevel] = useState<number>(0);
  const [tableData, setTableData] = useState<{headers: string[], rows: string[][], alignments: string[]}>({ headers: [], rows: [], alignments: [] });
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
  const [isKeyboardLocked, setIsKeyboardLocked] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && table) {
      const currentRows = table.querySelectorAll('tr').length;
      const firstRow = table.querySelector('tr');
      const currentCols = firstRow ? firstRow.querySelectorAll('th, td').length : 0;
      
      const thElements = Array.from(table.querySelectorAll('thead th'));
      const headers = thElements.map(th => th.innerHTML || '');
      const alignments = thElements.map(th => (th.getAttribute('align') || (th as HTMLElement).style.textAlign || '') as string);

      const rowsData = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.innerHTML || '')
      );
      
      const wrapper = table.closest('.overflow-x-auto');
      let currentCurveLevel = 0;
      if (wrapper && wrapper.classList.contains('rounded-table')) {
        const classes = Array.from(wrapper.classList);
        const curveClass = classes.find(c => c.startsWith('rounded-') && c !== 'rounded-table');
        const levelIndex = CURVE_LEVELS.findIndex(l => l.class === curveClass);
        if (levelIndex !== -1) {
          currentCurveLevel = levelIndex;
        } else {
          currentCurveLevel = 4;
        }
      }
      setCurveLevel(currentCurveLevel);
      
      setRows(currentRows);
      setCols(currentCols);
      setTableData({ headers, rows: rowsData, alignments });
      setActiveTab('rows'); // Reset to rows when opened
      setSelectedCell(null);
    }
  }, [isOpen, table]);

  const handleConfirm = () => {
    const finalRows = Math.max(1, Number(rows) || 1);
    const finalCols = Math.max(1, Number(cols) || 1);
    const curveClass = CURVE_LEVELS[curveLevel].class;
    
    // Scrape latest values deeply from the preview DOM in case user didn't blur the field
    const previewTable = document.getElementById('table-settings-preview');
    const latestTableData = { ...tableData, headers: [...tableData.headers], rows: tableData.rows.map(r => [...r]) };
    
    if (previewTable) {
        const ths = previewTable.querySelectorAll('thead th');
        ths.forEach((th, i) => {
            if (i < latestTableData.headers.length) {
                latestTableData.headers[i] = th.innerHTML;
            }
        });
        const trs = previewTable.querySelectorAll('tbody tr');
        trs.forEach((tr, r) => {
            const tds = tr.querySelectorAll('td');
            tds.forEach((td, c) => {
                if (latestTableData.rows[r] && c < latestTableData.rows[r].length) {
                    latestTableData.rows[r][c] = td.innerHTML;
                }
            });
        });
    }

    onConfirm(finalRows, finalCols, curveClass, latestTableData);
    onClose();
  };

  const handleCellClick = (r: number, c: number) => {
    if (selectedCell?.r !== r || selectedCell?.c !== c) {
      setSelectedCell({ r, c });
    }
  };

  const handleCellTextChange = (r: number, c: number, value: string) => {
    setTableData(prev => {
      const newData = { ...prev, headers: [...prev.headers], rows: prev.rows.map(row => [...row]) };
      if (r === -1) {
        newData.headers[c] = value;
      } else {
        if (newData.rows[r]) newData.rows[r][c] = value;
      }
      return newData;
    });
  };

  const setColAlign = (c: number, align: string) => {
    setTableData(prev => {
      const newAlignments = [...prev.alignments];
      // Toggle if already set
      newAlignments[c] = newAlignments[c] === align ? '' : align;
      return { ...prev, alignments: newAlignments };
    });
  };

  const insertCol = (index: number) => {
    setTableData(prev => {
      const headers = [...prev.headers];
      headers.splice(index, 0, 'Header');
      const alignments = [...prev.alignments];
      alignments.splice(index, 0, '');
      const rowData = prev.rows.map(r => {
        const newR = [...r];
        newR.splice(index, 0, 'Cell');
        return newR;
      });
      return { headers, rows: rowData, alignments };
    });
    setCols(c => Number(c) + 1);
  };
  const [draggedRowIndex, setDraggedRowIndex] = useState<number | null>(null);
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  const deleteCol = (index: number) => {
    if (Number(cols) <= 1) return;
    setTableData(prev => {
      const headers = [...prev.headers];
      headers.splice(index, 1);
      const alignments = [...prev.alignments];
      alignments.splice(index, 1);
      const rowData = prev.rows.map(r => {
        const newR = [...r];
        newR.splice(index, 1);
        return newR;
      });
      return { headers, rows: rowData, alignments };
    });
    setCols(c => Number(c) - 1);
    setSelectedCell(null);
  };

  const handleDragColStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    setDraggedRowIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    /* Create a visually helpful image for column drop is hard, but native element works */
  };

  const handleDragColOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === targetIndex) return;
    
    setTableData(prev => {
      const headers = [...prev.headers];
      const draggedHeader = headers[draggedColIndex];
      headers.splice(draggedColIndex, 1);
      headers.splice(targetIndex, 0, draggedHeader);
      
      const alignments = [...prev.alignments];
      const draggedAlign = alignments[draggedColIndex];
      alignments.splice(draggedColIndex, 1);
      alignments.splice(targetIndex, 0, draggedAlign);
      
      const rows = prev.rows.map(row => {
        const r = [...row];
        const draggedCell = r[draggedColIndex];
        r.splice(draggedColIndex, 1);
        r.splice(targetIndex, 0, draggedCell);
        return r;
      });
      
      return { headers, alignments, rows };
    });
    setDraggedColIndex(null);
  };

  const handleDragRowStart = (e: React.DragEvent, index: number) => {
    setDraggedRowIndex(index);
    setDraggedColIndex(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragRowOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRowIndex === null || draggedRowIndex === targetIndex) return;
    
    setTableData(prev => {
      const rows = [...prev.rows];
      const draggedRow = rows[draggedRowIndex];
      rows.splice(draggedRowIndex, 1);
      rows.splice(targetIndex, 0, draggedRow);
      return { ...prev, rows };
    });
    setDraggedRowIndex(null);
  };

  const insertRow = (index: number) => {
    setTableData(prev => {
      const rowData = [...prev.rows];
      rowData.splice(index, 0, Array(prev.headers.length).fill('Cell'));
      return { ...prev, rows: rowData };
    });
    setRows(r => Number(r) + 1);
  };
  const deleteRow = (index: number) => {
    if (Number(rows) <= 1) return;
    if (index === -1) return;
    setTableData(prev => {
      const rowData = [...prev.rows];
      rowData.splice(index, 1);
      return { ...prev, rows: rowData };
    });
    setRows(r => Number(r) - 1);
    setSelectedCell(null);
  };

  const updateTableDimensions = (newRows: number, newCols: number) => {
    // Only update if changes are necessary
    setTableData(prev => {
        let headers = [...prev.headers];
        let alignments = [...prev.alignments];
        let rowData = prev.rows.map(r => [...r]);

        // adjust columns
        if (newCols > headers.length) {
            const diff = newCols - headers.length;
            headers.push(...Array(diff).fill('Header'));
            alignments.push(...Array(diff).fill(''));
            rowData = rowData.map(r => [...r, ...Array(diff).fill('Cell')]);
        } else if (newCols < headers.length) {
            headers = headers.slice(0, newCols);
            alignments = alignments.slice(0, newCols);
            rowData = rowData.map(r => r.slice(0, newCols));
        }

        // adjust rows
        // body rows = newRows - 1
        const targetBodyRows = Math.max(0, newRows - 1);
        if (targetBodyRows > rowData.length) {
            const diff = targetBodyRows - rowData.length;
            for (let i=0; i<diff; i++) {
                rowData.push(Array(newCols).fill('Cell'));
            }
        } else if (targetBodyRows < rowData.length) {
            rowData = rowData.slice(0, targetBodyRows);
        }

        return { headers, rows: rowData, alignments };
    });
    setRows(newRows);
    setCols(newCols);
    setSelectedCell(null);
  };

  const updateActive = (delta: number) => {
    if (activeTab === 'rows') {
      const current = Number(rows) || 1;
      updateTableDimensions(Math.max(1, current + delta), Number(cols) || 1);
    } else {
      const current = Number(cols) || 1;
      updateTableDimensions(Number(rows) || 1, Math.max(1, current + delta));
    }
  };

  const previewRows = Math.max(1, Number(rows) || 1);
  const previewCols = Math.max(1, Number(cols) || 1);
  const isRounded = curveLevel > 0;
  const previewCurveClass = CURVE_LEVELS[curveLevel].class;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-border/50 shadow-2xl gap-0 max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/10 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <LayoutGrid className="w-5 h-5" />
              </div>
              Table Settings
            </DialogTitle>
            <DialogDescription className="pt-1">
              Customize your table dimensions and appearance.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pt-4 bg-background flex flex-col md:flex-row gap-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full md:w-1/2 flex flex-col order-2 md:order-1">
            <Tabs defaultValue="dimensions" className="w-full pb-2 flex-1">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="dimensions" className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Dimensions
                </TabsTrigger>
                <TabsTrigger value="style" className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Style
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="dimensions" className="space-y-4 mt-0 outline-none">
                <div className="flex flex-row flex-wrap items-center gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 flex-[2] min-w-[140px]">
                    <button
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'rows' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setActiveTab('rows')}
                    >
                      <Rows3 className="w-3 h-3 sm:w-4 sm:h-4" /> Rows
                    </button>
                    <button
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'cols' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setActiveTab('cols')}
                    >
                      <Columns3 className="w-3 h-3 sm:w-4 sm:h-4" /> Cols
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-background rounded-lg border border-border/50 p-1 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 flex-[1] min-w-[120px]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" 
                      onClick={() => updateActive(-1)}
                    >
                      <Minus className="w-3 h-3 sm:w-4 sm:h-4"/>
                    </Button>
                    <Input 
                      type="number" 
                      min={1}
                      max={20}
                      readOnly={isKeyboardLocked}
                      inputMode={isKeyboardLocked ? "none" : "numeric"}
                      onFocus={(e) => isKeyboardLocked && e.target.blur()}
                      className={`h-8 w-16 border-0 bg-transparent text-center text-sm sm:text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 px-0 ${isKeyboardLocked ? 'pointer-events-none' : ''}`} 
                      value={activeTab === 'rows' ? rows : cols} 
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                        if (activeTab === 'rows') setRows(val);
                        else setCols(val);
                      }} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 sm:h-9 sm:w-9 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" 
                      onClick={() => updateActive(1)}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4"/>
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="style" className="space-y-4 mt-0 outline-none">
                <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="curve-slider" className="text-sm font-medium">Corner Radius</Label>
                    <p className="text-xs text-muted-foreground">Apply rounded corners to the table outer border.</p>
                  </div>
                  <span className="text-xs font-medium bg-background px-2 py-1 rounded-md border border-border/50">
                      {curveLevel === 0 ? 'None' : CURVE_LEVELS[curveLevel].class.replace('rounded-', '')}
                    </span>
                  </div>
                  <input 
                    id="curve-slider"
                    type="range" 
                    min="0" 
                    max="6" 
                    step="1" 
                    value={curveLevel} 
                    onChange={(e) => setCurveLevel(parseInt(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>Square</span>
                    <span>Rounded</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-full md:w-1/2 pb-6 order-1 md:order-2">
            {/* Preview */}
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between h-9">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap mr-2 flex items-center gap-2">
                  Preview
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-6 w-6 rounded-md ${isKeyboardLocked ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    onClick={() => setIsKeyboardLocked(!isKeyboardLocked)}
                    title={isKeyboardLocked ? "Unlock text editing" : "Lock text editing (prevents virtual keyboard)"}
                  >
                    {isKeyboardLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </Button>
                </Label>
                {selectedCell && (
                   <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-right-4 duration-200 mask-edges pb-1">
                      {/* Column Actions */}
                      <div className="flex items-center gap-0.5 bg-background border border-border/50 p-0.5 rounded-md shadow-sm">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-1.5 select-none">Col</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => insertCol(selectedCell.c)} title="Insert Column Left"><ArrowLeftToLine className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => insertCol(selectedCell.c + 1)} title="Insert Column Right"><ArrowRightToLine className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteCol(selectedCell.c)} title="Delete Column" disabled={Number(cols) <= 1}><Trash2 className="w-3 h-3" /></Button>
                      </div>

                      {/* Formatting Actions */}
                      <div className="flex items-center gap-0.5 bg-background border border-border/50 p-0.5 rounded-md shadow-sm">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-1.5 select-none">Align</span>
                        <Button variant="ghost" size="icon" className={`h-6 w-6 ${tableData.alignments[selectedCell.c] === 'left' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`} onClick={() => setColAlign(selectedCell.c, 'left')} title="Align Left"><AlignLeft className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className={`h-6 w-6 ${tableData.alignments[selectedCell.c] === 'center' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`} onClick={() => setColAlign(selectedCell.c, 'center')} title="Align Center"><AlignCenter className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className={`h-6 w-6 ${tableData.alignments[selectedCell.c] === 'right' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`} onClick={() => setColAlign(selectedCell.c, 'right')} title="Align Right"><AlignRight className="w-3 h-3" /></Button>
                      </div>

                      {/* Row Actions */}
                      <div className="flex items-center gap-0.5 bg-background border border-border/50 p-0.5 rounded-md shadow-sm">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold px-1.5 select-none">Row</span>
                        {selectedCell.r > -1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => insertRow(selectedCell.r)} title="Insert Row Above"><ArrowUpToLine className="w-3 h-3" /></Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-muted" onClick={() => insertRow(selectedCell.r > -1 ? selectedCell.r + 1 : 0)} title="Insert Row Below"><ArrowDownToLine className="w-3 h-3" /></Button>
                        {selectedCell.r > -1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteRow(selectedCell.r)} title="Delete Row" disabled={Number(rows) <= 2}><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                   </div>
                )}
              </div>
              <div className="border border-border/50 rounded-xl p-4 bg-muted/20 overflow-hidden relative group flex flex-col">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" onClick={() => setSelectedCell(null)}></div>
                
                <div className={`relative z-10 bg-background/80 backdrop-blur-md shadow-sm overflow-x-auto overflow-y-auto max-h-[164px] w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isRounded ? `rounded-table ${previewCurveClass} border border-border` : ''}`}>
                  <table id="table-settings-preview" className={`w-full border-collapse ${isRounded ? 'border-0' : 'border border-border/50'}`}>
                    <thead className="relative z-20">
                      <tr>
                        {Array.from({ length: previewCols }).map((_, i) => (
                          <th 
                            key={i} 
                            draggable
                            onDragStart={(e) => handleDragColStart(e, i)}
                            onDragOver={(e) => {
                             if (draggedColIndex !== null) {
                               e.preventDefault();
                               handleDragColOver(e, i);
                             }
                             else if (draggedRowIndex !== null) {
                               e.preventDefault();
                               handleDragRowOver(e, 0);
                             }
                            }}
                            onDrop={(e) => {
                             if (draggedColIndex !== null) {
                               e.preventDefault();
                               handleDragColDrop(e, i);
                             }
                             else if (draggedRowIndex !== null) {
                               e.preventDefault();
                               handleDragRowDrop(e, 0);
                             }
                            }}
                            onDragEnd={() => {
                              setDraggedColIndex(null);
                              setDraggedRowIndex(null);
                            }}
                            onClick={() => handleCellClick(-1, i)} 
                            className={`p-3 bg-muted text-xs font-medium text-muted-foreground whitespace-nowrap cursor-text transition-colors hover:bg-muted/80 ${selectedCell?.r === -1 && selectedCell?.c === i ? 'ring-2 ring-inset ring-primary z-30 relative' : ''} ${draggedColIndex === i ? 'opacity-50 blur-[1px]' : ''} ${isRounded ? 'border-b border-r last:border-r-0 border-border/50' : 'border border-border/50'}`}
                            style={{ textAlign: (tableData.alignments[i] as any) || 'left', cursor: 'grab' }}
                            contentEditable={!isKeyboardLocked}
                            suppressContentEditableWarning
                            onBlur={(e) => handleCellTextChange(-1, i, e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ __html: tableData.headers[i] ?? `Header ${i + 1}` }}
                          />
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(0, previewRows - 1) }).map((_, r) => (
                        <tr 
                          key={r} 
                          draggable
                          onDragStart={(e) => handleDragRowStart(e, r)}
                          onDragEnd={() => {
                            setDraggedColIndex(null);
                            setDraggedRowIndex(null);
                          }}
                          className={`transition-colors hover:bg-muted/30 cursor-grab ${draggedRowIndex === r ? 'opacity-50 blur-[1px] bg-muted/50' : ''}`}
                        >
                          {Array.from({ length: previewCols }).map((_, c) => (
                            <td 
                              key={c} 
                              onDragOver={(e) => {
                              if (draggedColIndex !== null) {
                                e.preventDefault();
                                handleDragColOver(e, c);
                              }
                              else if (draggedRowIndex !== null) {
                                e.preventDefault();
                                handleDragRowOver(e, r);
                              }
                              }}
                              onDrop={(e) => {
                              if (draggedColIndex !== null) {
                                e.preventDefault();
                                handleDragColDrop(e, c);
                              }
                              else if (draggedRowIndex !== null) {
                                e.preventDefault();
                                handleDragRowDrop(e, r);
                              }
                              }}
                              onClick={() => handleCellClick(r, c)} 
                              className={`p-3 text-xs text-foreground whitespace-nowrap cursor-text transition-colors hover:bg-muted/50 ${selectedCell?.r === r && selectedCell?.c === c ? 'ring-2 ring-inset ring-primary z-10 relative bg-background' : ''} ${draggedColIndex === c ? 'bg-muted/30' : ''} ${isRounded ? `border-b border-r last:border-r-0 ${r === Math.max(0, previewRows - 1) - 1 ? 'border-b-0' : ''} border-border/50` : 'border border-border/50'}`}
                              style={{ textAlign: (tableData.alignments[c] as any) || 'left' }}
                              contentEditable={!isKeyboardLocked}
                              suppressContentEditableWarning
                              onBlur={(e) => handleCellTextChange(r, c, e.currentTarget.innerHTML)}
                              dangerouslySetInnerHTML={{ __html: tableData.rows[r]?.[c] ?? 'Cell' }}
                            />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="hover:bg-background">Cancel</Button>
          <Button onClick={handleConfirm} className="shadow-sm px-6">Apply Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
