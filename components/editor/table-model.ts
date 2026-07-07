/**
 * Table architecture types and implementations
 * Operating on a logical table model separated from presentation and DOM.
 */

// --- 1. Selection Model & FSM States ---

export enum SelectionType {
  NONE = 'NONE',
  CELL = 'CELL',
  ROW = 'ROW',
  COLUMN = 'COLUMN',
  RECTANGLE = 'RECTANGLE',
  TABLE = 'TABLE'
}

export interface ITableSelection {
  type: SelectionType;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export enum FSMState {
  IDLE = 'IDLE',
  EDITING = 'EDITING',
  DISABLED = 'DISABLED',
  READONLY = 'READONLY',
  ANIMATING = 'ANIMATING',
  SERIALIZING = 'SERIALIZING',
  RECOVERING = 'RECOVERING'
}

// --- 2. Model Structure (Content Separated From Presentation) ---

export interface ITableCellStyle {
  alignment: 'left' | 'center' | 'right' | null;
  padding?: string;
  theme?: string;
  border?: string;
}

export interface ITableCell {
  value: string;
  style: ITableCellStyle;
  metadata?: Record<string, unknown>;
}

export interface ITableModel {
  id: string;
  cells: ITableCell[][];
  rowCount: number;
  colCount: number;
  metadata?: Record<string, unknown>;
}

// --- 3. Patches & Transactions ---

export enum PatchType {
  SET_CELL = 'SET_CELL',
  INSERT_ROW = 'INSERT_ROW',
  DELETE_ROW = 'DELETE_ROW',
  INSERT_COL = 'INSERT_COL',
  DELETE_COL = 'DELETE_COL',
  FORMAT_COL = 'FORMAT_COL',
  CLEAR_ROW = 'CLEAR_ROW',
  CLEAR_COL = 'CLEAR_COL',
  DUPLICATE_ROW = 'DUPLICATE_ROW',
  DUPLICATE_COL = 'DUPLICATE_COL'
}

export interface ITablePatch {
  patchId: string;
  type: PatchType;
  timestamp: number;
  author?: string;
  payload: Record<string, unknown>;
}

export interface ITableTransaction {
  id: string;
  patches: ITablePatch[];
  before: ITableModel;
  after: ITableModel;
  selectionBefore: ITableSelection | null;
  selectionAfter: ITableSelection | null;
  timestamp: number;
}

// --- 4. Extensible Interfaces (Dependency Injection) ---

export interface ITableSerializer {
  serialize(model: ITableModel): string;
  deserialize(raw: string): ITableModel | null;
}

export interface ITablePasteProvider {
  parseClipboard(text: string, currentModel: ITableModel, selection: ITableSelection): {
    patches: ITablePatch[];
    newSelection: ITableSelection;
  } | null;
}

export interface ITableDOMPatch {
  type: 'UPDATE_CELL_HTML' | 'REBUILD_TABLE' | 'UPDATE_CELL_STYLE';
  targetCell?: { r: number; c: number };
  html?: string;
  style?: ITableCellStyle;
}

export interface ITableRenderer {
  render(model: ITableModel, patches: ITableDOMPatch[]): void;
}

export interface ITableRecovery {
  checkpoint(model: ITableModel): void;
  rollback(): ITableModel | null;
  diagnose(model: ITableModel): string[];
}

// --- 5. Model Validation Class ---

export class TableModelValidator {
  static validate(model: ITableModel): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!model.id) {
      errors.push("Missing table ID.");
    }
    if (model.rowCount < 0 || model.colCount < 0) {
      errors.push("Row and column counts must be non-negative.");
    }
    if (model.cells.length !== model.rowCount) {
      errors.push(`Row count mismatch: Model lists rowCount as ${model.rowCount} but contains ${model.cells.length} rows.`);
    }
    
    model.cells.forEach((row, rIdx) => {
      if (row.length !== model.colCount) {
        errors.push(`Column count mismatch at row ${rIdx}: expected ${model.colCount} columns but got ${row.length}.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePatch(model: ITableModel, patch: ITablePatch): boolean {
    switch (patch.type) {
      case PatchType.SET_CELL: {
        const { r, c } = patch.payload;
        return r >= 0 && r < model.rowCount && c >= 0 && c < model.colCount;
      }
      case PatchType.DELETE_ROW: {
        const { r } = patch.payload;
        return r >= 0 && r < model.rowCount;
      }
      case PatchType.DELETE_COL: {
        const { c } = patch.payload;
        return c >= 0 && c < model.colCount;
      }
      default:
        return true;
    }
  }
}

// --- 6. Concrete Implementations: Serializers ---

export class MarkdownTableSerializer implements ITableSerializer {
  serialize(model: ITableModel): string {
    if (model.rowCount === 0 || model.colCount === 0) return '';
    
    // Convert to markdown table format
    const rows: string[] = [];
    
    // Header Row
    const headerRow = model.cells[0];
    const headerLine = '| ' + headerRow.map(cell => cell.value || ' ').join(' | ') + ' |';
    rows.push(headerLine);
    
    // Delimiter Row based on alignment
    const alignRow = model.cells[0]; // Alignments are usually specified per column at head level
    const delimiterLine = '| ' + alignRow.map(cell => {
      const align = cell.style.alignment;
      if (align === 'center') return ':---:';
      if (align === 'right') return '---:';
      return '---';
    }).join(' | ') + ' |';
    rows.push(delimiterLine);
    
    // Data Rows
    for (let r = 1; r < model.rowCount; r++) {
      const row = model.cells[r];
      const dataLine = '| ' + row.map(cell => cell.value || ' ').join(' | ') + ' |';
      rows.push(dataLine);
    }
    
    return rows.join('\n');
  }

  deserialize(raw: string): ITableModel | null {
    const lines = raw.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length < 2) return null; // Needs at least headers and separator

    const parseRow = (line: string): string[] => {
      // strip leading and trailing pipes
      const cleaned = line.replace(/^\|/, '').replace(/\|$/, '');
      return cleaned.split('|').map(s => s.trim());
    };

    const headers = parseRow(lines[0]);
    const delimiterRow = parseRow(lines[1]);
    const colCount = headers.length;

    // Parse alignment from delimiter row
    const alignments = delimiterRow.map(cell => {
      const left = cell.startsWith(':');
      const right = cell.endsWith(':');
      if (left && right) return 'center' as const;
      if (right) return 'right' as const;
      return 'left' as const;
    });

    const cells: ITableCell[][] = [];

    // Header cells
    cells.push(headers.map((h, i) => ({
      value: h,
      style: { alignment: alignments[i] }
    })));

    // Data rows
    for (let i = 2; i < lines.length; i++) {
      const rawCells = parseRow(lines[i]);
      // Pad cells if row was shorter
      while (rawCells.length < colCount) {
        rawCells.push('');
      }
      // Truncate if longer
      const rowCells = rawCells.slice(0, colCount);
      
      cells.push(rowCells.map((val, colIdx) => ({
        value: val,
        style: { alignment: alignments[colIdx] }
      })));
    }

    const model: ITableModel = {
      id: 'table_' + Math.random().toString(36).substring(2, 9),
      cells,
      rowCount: cells.length,
      colCount: colCount
    };

    const validation = TableModelValidator.validate(model);
    if (!validation.isValid) {
      console.error("Deserialized model has validation errors:", validation.errors);
      return null;
    }

    return model;
  }
}

// --- 7. Concrete Paste Provider ---

export class DeterministicTablePasteProvider implements ITablePasteProvider {
  parseClipboard(text: string, currentModel: ITableModel, selection: ITableSelection): {
    patches: ITablePatch[];
    newSelection: ITableSelection;
  } | null {
    if (!text) return null;

    // TSV/CSV parsing with support for basic quoted fields, commas, etc.
    const parseGrid = (tsv: string): string[][] => {
      const delimiter = tsv.includes('\t') ? '\t' : ',';
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < tsv.length; i++) {
        const char = tsv[i];
        const nextChar = tsv[i + 1];

        if (inQuotes) {
          if (char === '"') {
            if (nextChar === '"') {
              currentField += '"';
              i++; // skip next double quote
            } else {
              inQuotes = false;
            }
          } else {
            currentField += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === delimiter) {
            currentRow.push(currentField);
            currentField = '';
          } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            if (char === '\r') i++; // skip extra LF
          } else if (char === '\r') {
            currentRow.push(currentField);
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
          } else {
            currentField += char;
          }
        }
      }

      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
      }

      return rows.map(r => r.map(c => c.trim()));
    };

    const grid = parseGrid(text);
    if (grid.length === 0 || grid[0].length === 0) return null;

    const patches: ITablePatch[] = [];
    const startRow = selection.startRow;
    const startCol = selection.startCol;

    const sourceRows = grid.length;
    const sourceCols = Math.max(...grid.map(r => r.length));

    // Support deterministic expand boundaries
    const targetMaxRows = startRow + sourceRows;
    const targetMaxCols = startCol + sourceCols;

    // Generate insert structural patches if we overflow current model limits
    if (targetMaxRows > currentModel.rowCount) {
      const rowsToAdd = targetMaxRows - currentModel.rowCount;
      patches.push({
        patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
        type: PatchType.INSERT_ROW,
        timestamp: Date.now(),
        payload: { count: rowsToAdd, at: currentModel.rowCount }
      });
    }

    if (targetMaxCols > currentModel.colCount) {
      const colsToAdd = targetMaxCols - currentModel.colCount;
      patches.push({
        patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
        type: PatchType.INSERT_COL,
        timestamp: Date.now(),
        payload: { count: colsToAdd, at: currentModel.colCount }
      });
    }

    // Generate value modifications
    grid.forEach((rowVals, dr) => {
      rowVals.forEach((val, dc) => {
        const r = startRow + dr;
        const c = startCol + dc;
        patches.push({
          patchId: 'patch_' + Math.random().toString(36).substring(2, 9),
          type: PatchType.SET_CELL,
          timestamp: Date.now(),
          payload: { r, c, value: val }
        });
      });
    });

    const newSelection: ITableSelection = {
      type: SelectionType.RECTANGLE,
      startRow,
      startCol,
      endRow: targetMaxRows - 1,
      endCol: targetMaxCols - 1
    };

    return { patches, newSelection };
  }
}

// --- 8. Prioritized Mutation Queue & Scheduler ---

export enum QueuePriority {
  HIGH = 0,   // typing, selection, navigation
  MEDIUM = 1, // formatting toolbar, layout adjustments
  LOW = 2     // background serialization, remote syncing, diagnostics
}

interface MutationTask {
  priority: QueuePriority;
  execute: () => void;
  timestamp: number;
}

export class TableMutationQueue {
  private queue: MutationTask[] = [];
  private isProcessing = false;

  enqueue(priority: QueuePriority, action: () => void) {
    this.queue.push({
      priority,
      execute: action,
      timestamp: Date.now()
    });
    // Sort so HIGH priority (smaller index) runs first
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.timestamp - b.timestamp;
    });

    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    // Coalesce within next animation frame
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  private flush() {
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          task.execute();
        }
      }
    } catch (e) {
      console.error("Mutation Queue execution error:", e);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  clear() {
    this.queue = [];
  }
}

// --- 9. Recovery Manager ---

export class TableRecoveryManager implements ITableRecovery {
  private historyStack: ITableModel[] = [];
  private diagnosticsLog: string[] = [];

  checkpoint(model: ITableModel): void {
    // Keep immutable deep copies
    const copy: ITableModel = {
      id: model.id,
      rowCount: model.rowCount,
      colCount: model.colCount,
      cells: model.cells.map(row => row.map(c => ({
        value: c.value,
        style: { ...c.style },
        metadata: c.metadata ? { ...c.metadata } : undefined
      }))),
      metadata: model.metadata ? { ...model.metadata } : undefined
    };
    this.historyStack.push(copy);
    if (this.historyStack.length > 50) {
      this.historyStack.shift();
    }
  }

  rollback(): ITableModel | null {
    if (this.historyStack.length > 1) {
      this.historyStack.pop(); // Pop current state
      return this.historyStack[this.historyStack.length - 1];
    }
    return null;
  }

  diagnose(model: ITableModel): string[] {
    this.diagnosticsLog = [];
    const validation = TableModelValidator.validate(model);
    if (!validation.isValid) {
      this.diagnosticsLog.push(...validation.errors);
    }

    // Check empty structure or severe alignment anomalies
    if (model.rowCount === 0) {
      this.diagnosticsLog.push("Model contains zero rows.");
    }
    if (model.colCount === 0) {
      this.diagnosticsLog.push("Model contains zero columns.");
    }

    return this.diagnosticsLog;
  }
}

// --- 10. Table Controller (Single Coordinator) ---

export class TableController {
  private currentModel: ITableModel;
  private selection: ITableSelection | null = null;
  private state: FSMState = FSMState.IDLE;
  
  private serializer: ITableSerializer;
  private pasteProvider: ITablePasteProvider;
  private recoveryManager: TableRecoveryManager;
  private mutationQueue: TableMutationQueue;
  private transactionHistory: ITableTransaction[] = [];

  constructor(
    initialModel: ITableModel,
    dependencies?: {
      serializer?: ITableSerializer;
      pasteProvider?: ITablePasteProvider;
      recoveryManager?: TableRecoveryManager;
      mutationQueue?: TableMutationQueue;
    }
  ) {
    this.currentModel = initialModel;
    this.serializer = dependencies?.serializer || new MarkdownTableSerializer();
    this.pasteProvider = dependencies?.pasteProvider || new DeterministicTablePasteProvider();
    this.recoveryManager = dependencies?.recoveryManager || new TableRecoveryManager();
    this.mutationQueue = dependencies?.mutationQueue || new TableMutationQueue();
    
    this.recoveryManager.checkpoint(this.currentModel);
  }

  getModel(): ITableModel {
    return this.currentModel;
  }

  getSelection(): ITableSelection | null {
    return this.selection;
  }

  getFSMState(): FSMState {
    return this.state;
  }

  transitionTo(nextState: FSMState) {
    // Basic guard constraints on state changes
    if (this.state === FSMState.DISABLED && nextState !== FSMState.IDLE) {
      console.warn("FSM restricted: cannot transition out of DISABLED except to IDLE.");
      return;
    }
    this.state = nextState;
  }

  setSelection(sel: ITableSelection | null) {
    this.selection = sel;
  }

  /**
   * Applies patches and forms a transaction, pushing to recovery and updating the model.
   * Emits DOM modifications lists to render targets.
   */
  applyPatches(patches: ITablePatch[], nextSelectionState: ITableSelection | null = null): {
    domPatches: ITableDOMPatch[];
    success: boolean;
  } {
    const beforeState = this.currentModel;
    const selectionBefore = this.selection;
    
    this.transitionTo(FSMState.ANIMATING);

    try {
      // Create immutable copy of model to apply changes
      const updatedCells: ITableCell[][] = this.currentModel.cells.map(row => 
        row.map(c => ({ value: c.value, style: { ...c.style }, metadata: c.metadata }))
      );

      let nextRowCount = this.currentModel.rowCount;
      let nextColCount = this.currentModel.colCount;

      const domPatches: ITableDOMPatch[] = [];
      let structuralChange = false;

      patches.forEach(patch => {
        if (!TableModelValidator.validatePatch({ id: beforeState.id, cells: updatedCells, rowCount: nextRowCount, colCount: nextColCount }, patch)) {
          throw new Error(`Invalid patch applied to model: ${patch.type}`);
        }

        switch (patch.type) {
          case PatchType.SET_CELL: {
            const { r, c, value, style } = patch.payload;
            if (value !== undefined) {
              updatedCells[r][c].value = value;
            }
            if (style !== undefined) {
              updatedCells[r][c].style = { ...updatedCells[r][c].style, ...style };
            }
            domPatches.push({
              type: 'UPDATE_CELL_HTML',
              targetCell: { r, c },
              html: value,
              style: updatedCells[r][c].style
            });
            break;
          }

          case PatchType.INSERT_ROW: {
            const { count, at } = patch.payload;
            structuralChange = true;
            for (let k = 0; k < count; k++) {
              const newRow: ITableCell[] = Array.from({ length: nextColCount }, () => ({
                value: '',
                style: { alignment: 'left' }
              }));
              updatedCells.splice(at + k, 0, newRow);
            }
            nextRowCount += count;
            break;
          }

          case PatchType.DELETE_ROW: {
            const { r } = patch.payload;
            structuralChange = true;
            updatedCells.splice(r, 1);
            nextRowCount--;
            break;
          }

          case PatchType.INSERT_COL: {
            const { count, at } = patch.payload;
            structuralChange = true;
            updatedCells.forEach((row, rowIndex) => {
              for (let k = 0; k < count; k++) {
                const isHeader = rowIndex === 0;
                row.splice(at + k, 0, {
                  value: isHeader ? 'Header' : '',
                  style: { alignment: 'left' }
                });
              }
            });
            nextColCount += count;
            break;
          }

          case PatchType.DELETE_COL: {
            const { c } = patch.payload;
            structuralChange = true;
            updatedCells.forEach(row => {
              row.splice(c, 1);
            });
            nextColCount--;
            break;
          }

          case PatchType.FORMAT_COL: {
            const { c, alignment } = patch.payload;
            updatedCells.forEach(row => {
              if (row[c]) {
                row[c].style.alignment = alignment;
                domPatches.push({
                  type: 'UPDATE_CELL_STYLE',
                  targetCell: { r: updatedCells.indexOf(row), c },
                  style: row[c].style
                });
              }
            });
            break;
          }

          case PatchType.CLEAR_ROW: {
            const { r } = patch.payload;
            updatedCells[r].forEach((cell, colIdx) => {
              cell.value = '';
              domPatches.push({
                type: 'UPDATE_CELL_HTML',
                targetCell: { r, c: colIdx },
                html: ''
              });
            });
            break;
          }

          case PatchType.CLEAR_COL: {
            const { c } = patch.payload;
            updatedCells.forEach((row, rowIdx) => {
              row[c].value = '';
              domPatches.push({
                type: 'UPDATE_CELL_HTML',
                targetCell: { r: rowIdx, c },
                html: ''
              });
            });
            break;
          }

          case PatchType.DUPLICATE_ROW: {
            const { r } = patch.payload;
            structuralChange = true;
            const rowCopy = updatedCells[r].map(cell => ({
              value: cell.value,
              style: { ...cell.style }
            }));
            updatedCells.splice(r + 1, 0, rowCopy);
            nextRowCount++;
            break;
          }

          case PatchType.DUPLICATE_COL: {
            const { c } = patch.payload;
            structuralChange = true;
            updatedCells.forEach(row => {
              const cellCopy = {
                value: row[c].value,
                style: { ...row[c].style }
              };
              row.splice(c + 1, 0, cellCopy);
            });
            nextColCount++;
            break;
          }
        }
      });

      const nextModel: ITableModel = {
        id: beforeState.id,
        cells: updatedCells,
        rowCount: nextRowCount,
        colCount: nextColCount,
        metadata: beforeState.metadata
      };

      const validation = TableModelValidator.validate(nextModel);
      if (!validation.isValid) {
        throw new Error(`Validation failed after applying patches: ${validation.errors.join(', ')}`);
      }

      this.currentModel = nextModel;
      this.selection = nextSelectionState || this.selection;

      // Log transaction
      const transaction: ITableTransaction = {
        id: 'tx_' + Math.random().toString(36).substring(2, 9),
        patches,
        before: beforeState,
        after: nextModel,
        selectionBefore,
        selectionAfter: this.selection,
        timestamp: Date.now()
      };
      this.transactionHistory.push(transaction);

      // Store in recoveryStack
      this.recoveryManager.checkpoint(nextModel);

      this.transitionTo(FSMState.IDLE);

      if (structuralChange) {
        return {
          domPatches: [{ type: 'REBUILD_TABLE' }],
          success: true
        };
      }

      return {
        domPatches,
        success: true
      };

    } catch (e) {
      console.error("Failed to apply patches, rolling back.", e);
      this.transitionTo(FSMState.RECOVERING);
      
      const rolledBackModel = this.recoveryManager.rollback();
      if (rolledBackModel) {
        this.currentModel = rolledBackModel;
      }
      this.selection = selectionBefore;
      this.transitionTo(FSMState.IDLE);

      return {
        domPatches: [{ type: 'REBUILD_TABLE' }],
        success: false
      };
    }
  }

  handlePaste(text: string): { domPatches: ITableDOMPatch[]; success: boolean } {
    if (!this.selection) return { domPatches: [], success: false };
    
    const pasteResult = this.pasteProvider.parseClipboard(text, this.currentModel, this.selection);
    if (!pasteResult) return { domPatches: [], success: false };

    return this.applyPatches(pasteResult.patches, pasteResult.newSelection);
  }

  serialize(): string {
    this.transitionTo(FSMState.SERIALIZING);
    const md = this.serializer.serialize(this.currentModel);
    this.transitionTo(FSMState.IDLE);
    return md;
  }
}
