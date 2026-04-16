/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Rows3, Columns3, Plus, Minus, Settings2 } from "lucide-react";

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
  onConfirm: (rows: number, cols: number, curveClass: string) => void;
}

export const TableEditDialog = ({ isOpen, onClose, table, onConfirm }: TableEditDialogProps) => {
  const [rows, setRows] = useState<number | string>(2);
  const [cols, setCols] = useState<number | string>(2);
  const [activeTab, setActiveTab] = useState<'rows' | 'cols'>('rows');
  const [curveLevel, setCurveLevel] = useState<number>(0);
  const [tableData, setTableData] = useState<{headers: string[], rows: string[][]}>({ headers: [], rows: [] });

  useEffect(() => {
    if (isOpen && table) {
      const currentRows = table.querySelectorAll('tr').length;
      const firstRow = table.querySelector('tr');
      const currentCols = firstRow ? firstRow.querySelectorAll('th, td').length : 0;
      
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent || '');
      const rowsData = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent || '')
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
      setTableData({ headers, rows: rowsData });
      setActiveTab('rows'); // Reset to rows when opened
    }
  }, [isOpen, table]);

  const handleConfirm = () => {
    const finalRows = Math.max(1, Number(rows) || 1);
    const finalCols = Math.max(1, Number(cols) || 1);
    const curveClass = CURVE_LEVELS[curveLevel].class;
    onConfirm(finalRows, finalCols, curveClass);
    onClose();
  };

  const updateActive = (delta: number) => {
    if (activeTab === 'rows') {
      const current = Number(rows) || 1;
      setRows(Math.max(1, current + delta));
    } else {
      const current = Number(cols) || 1;
      setCols(Math.max(1, current + delta));
    }
  };

  const previewRows = Math.max(1, Number(rows) || 1);
  const previewCols = Math.max(1, Number(cols) || 1);
  const isRounded = curveLevel > 0;
  const previewCurveClass = CURVE_LEVELS[curveLevel].class;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-border/50 shadow-2xl gap-0">
        <div className="p-6 pb-4 border-b border-border/50 bg-muted/10">
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

        <div className="px-6 pt-4 bg-background">
          <div className="pb-6">
            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</Label>
              <div className="border border-border/50 rounded-xl p-4 bg-muted/20 overflow-auto max-h-[250px] relative group">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>
                
                <div className={`relative z-10 bg-background/80 backdrop-blur-md shadow-sm overflow-x-auto w-full ${isRounded ? `rounded-table ${previewCurveClass} border border-border` : ''}`}>
                  <table className={`w-full border-collapse ${isRounded ? 'border-0' : 'border border-border/50'}`}>
                    <thead>
                      <tr>
                        {Array.from({ length: previewCols }).map((_, i) => (
                          <th key={i} className={`p-3 bg-muted/50 text-xs font-medium text-left text-muted-foreground whitespace-nowrap ${isRounded ? 'border-b border-r last:border-r-0 border-border/50' : 'border border-border/50'}`}>
                            {tableData.headers[i] || `Header ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(0, previewRows - 1) }).map((_, r) => (
                        <tr key={r} className="transition-colors hover:bg-muted/30">
                          {Array.from({ length: previewCols }).map((_, c) => (
                            <td key={c} className={`p-3 text-xs text-muted-foreground/70 whitespace-nowrap ${isRounded ? 'border-b last:border-b-0 border-r last:border-r-0 border-border/50' : 'border border-border/50'}`}>
                              {tableData.rows[r]?.[c] || 'Cell'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="dimensions" className="w-full pb-2">
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
              <div className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
                  <button
                    className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'rows' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('rows')}
                  >
                    <Rows3 className="w-3 h-3 sm:w-4 sm:h-4" /> Rows
                  </button>
                  <button
                    className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${activeTab === 'cols' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('cols')}
                  >
                    <Columns3 className="w-3 h-3 sm:w-4 sm:h-4" /> Cols
                  </button>
                </div>

                <div className="flex items-center bg-background rounded-lg border border-border/50 p-1 shadow-sm transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50">
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
                    className="h-8 w-10 sm:h-9 sm:w-16 border-0 bg-transparent text-center text-sm sm:text-base font-medium focus-visible:ring-0 focus-visible:ring-offset-0 px-0" 
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

        <div className="p-4 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} className="hover:bg-background">Cancel</Button>
          <Button onClick={handleConfirm} className="shadow-sm px-6">Apply Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
