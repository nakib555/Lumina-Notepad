import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MarkdownTableSerializer,
  DeterministicTablePasteProvider,
  TableController,
  TableModelValidator,
  PatchType,
  SelectionType,
  FSMState,
  type ITableModel,
} from './table-model';

const createSampleModel = (): ITableModel => ({
  id: 'table_test',
  rowCount: 2,
  colCount: 2,
  cells: [
    [
      { value: 'Col A', style: { alignment: 'left' } },
      { value: 'Col B', style: { alignment: 'right' } },
    ],
    [
      { value: 'Val 1', style: { alignment: 'left' } },
      { value: 'Val 2', style: { alignment: 'right' } },
    ],
  ],
});

test('MarkdownTableSerializer round-trips escaped pipes and CRLF newlines cleanly', () => {
  const serializer = new MarkdownTableSerializer();
  const model = createSampleModel();
  model.cells[1][0].value = 'foo | bar';

  const md = serializer.serialize(model);
  assert.equal(
    md,
    '| Col A | Col B |\n| --- | ---: |\n| foo \\| bar | Val 2 |'
  );

  const crlf = md.replace(/\n/g, '\r\n');
  const parsed = serializer.deserialize(crlf);
  assert.ok(parsed);
  assert.equal(parsed.rowCount, 2);
  assert.equal(parsed.colCount, 2);
  assert.equal(parsed.cells[0][1].style.alignment, 'right');
  assert.equal(parsed.cells[1][0].value, 'foo | bar');
});

test('TableController applies structural patches and validates dimensions', () => {
  const controller = new TableController(createSampleModel());

  const insertRowRes = controller.applyPatches([
    {
      patchId: 'p1',
      type: PatchType.INSERT_ROW,
      timestamp: 1,
      payload: { count: 1, at: 2 },
    },
  ]);
  assert.equal(insertRowRes.success, true);
  assert.equal(controller.getModel().rowCount, 3);
  assert.equal(controller.getFSMState(), FSMState.IDLE);

  const formatColRes = controller.applyPatches([
    {
      patchId: 'p2',
      type: PatchType.FORMAT_COL,
      timestamp: 2,
      payload: { c: 0, alignment: 'center' },
    },
  ]);
  assert.equal(formatColRes.success, true);
  assert.equal(controller.getModel().cells[0][0].style.alignment, 'center');
  assert.equal(TableModelValidator.validate(controller.getModel()).isValid, true);
});

test('TableController rolls back model on invalid patch', () => {
  const controller = new TableController(createSampleModel());
  const invalidRes = controller.applyPatches([
    {
      patchId: 'p_bad',
      type: PatchType.SET_CELL,
      timestamp: 3,
      payload: { r: 99, c: 0, value: 'oops' },
    },
  ]);
  assert.equal(invalidRes.success, false);
  assert.equal(controller.getModel().rowCount, 2);
  assert.equal(controller.getFSMState(), FSMState.IDLE);
});

test('DeterministicTablePasteProvider expands rows for TSV paste while clamping columns', () => {
  const controller = new TableController(createSampleModel());
  const pasteProvider = new DeterministicTablePasteProvider();
  const parsed = pasteProvider.parseClipboard(
    'A1\tB1\tEXTRA\nA2\tB2\tEXTRA2\nA3\tB3\tEXTRA3',
    controller.getModel(),
    { type: SelectionType.CELL, startRow: 1, startCol: 0, endRow: 1, endCol: 0 }
  );

  assert.ok(parsed);
  const res = controller.applyPatches(parsed.patches, parsed.newSelection);
  assert.equal(res.success, true);
  const updated = controller.getModel();
  assert.equal(updated.colCount, 2);
  assert.equal(updated.rowCount, 4);
  assert.equal(updated.cells[1][0].value, 'A1');
  assert.equal(updated.cells[3][1].value, 'B3');
});
