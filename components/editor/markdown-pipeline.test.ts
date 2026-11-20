import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { CARET_MARKER } from '@/lib/editor-helpers';
import {
  parseMarkdown,
  applyParsedHtmlWithCaretMarker,
  createTurndownService,
  setGlobalDefaultZebra,
} from './markdown-pipeline';
import { processCustomMarkdown } from './utils';

const createDomContainer = (html = '') => {
  const dom = new JSDOM(`<!DOCTYPE html><body><div id="editor">${html}</div></body>`);
  return {
    dom,
    doc: dom.window.document,
    editor: dom.window.document.getElementById('editor') as HTMLElement,
  };
};

test('auto-detected code block preserves empty language without leaking (Auto) into markdown fence', () => {
  const md = '```\nfunction hello() {\n  return 42;\n}\n```';
  const html = parseMarkdown(md);
  const { editor } = createDomContainer(html);

  const wrapper = editor.querySelector('.code-block-wrapper');
  assert.ok(wrapper, 'code-block-wrapper should be rendered');
  assert.equal(wrapper.getAttribute('data-lang'), '');

  const turndown = createTurndownService();
  const roundTripped = turndown.turndown(editor.innerHTML).trim();
  assert.equal(roundTripped, '```\nfunction hello() {\n  return 42;\n}\n```');
});

test('explicit language and nested triple backticks round-trip with dynamic outer fence', () => {
  const innerCode = 'Here is nested markdown:\n```js\nconsole.log(1);\n```';
  const md = `\`\`\`\`markdown\n${innerCode}\n\`\`\`\``;
  const html = parseMarkdown(md);
  const { editor } = createDomContainer(html);

  const wrapper = editor.querySelector('.code-block-wrapper');
  assert.equal(wrapper?.getAttribute('data-lang'), 'markdown');

  const turndown = createTurndownService();
  const roundTripped = turndown.turndown(editor.innerHTML).trim();
  assert.equal(roundTripped, md);
});

test('CARET_MARKER inside highlighted code block is restored at exact visible offset without breaking hljs markup', () => {
  const md = `\`\`\`ts\nconst ${CARET_MARKER}count = 1 < 2 ? 3 : 4;\n\`\`\``;
  const html = parseMarkdown(md);
  const { editor } = createDomContainer();
  applyParsedHtmlWithCaretMarker(editor, html);

  const codeEl = editor.querySelector('.code-element');
  assert.ok(codeEl);
  const marker = codeEl.querySelector('#caret-marker');
  assert.ok(marker, 'caret-marker span should exist inside highlighted code element');
  assert.equal(codeEl.textContent, 'const count = 1 < 2 ? 3 : 4;');

  const turndown = createTurndownService();
  const backToMd = turndown.turndown(editor.innerHTML).trim();
  assert.equal(backToMd, md);
});

test('CARET_MARKER near/inside KaTeX expression does not corrupt MathML or annotation', () => {
  const md = `Euler $e^{i\\pi${CARET_MARKER}} + 1 = 0$ done.`;
  const html = parseMarkdown(md);
  const { editor } = createDomContainer();
  applyParsedHtmlWithCaretMarker(editor, html);

  const katex = editor.querySelector('.katex');
  assert.ok(katex);
  assert.equal(katex.textContent?.includes(CARET_MARKER), false);
  const annotation = katex.querySelector('annotation[encoding="application/x-tex"]');
  assert.ok(annotation);
  assert.equal(annotation.textContent?.includes(CARET_MARKER), false);
  assert.ok(editor.querySelector('#caret-marker'), 'caret-marker should still exist in DOM');
});

test('standard GFM table with escaped pipes and alignments round-trips cleanly without raw HTML', () => {
  setGlobalDefaultZebra(false);
  const md = [
    '| Name | Pipe \\| Value | Score |',
    '| :--- | :---: | ---: |',
    '| Alpha | x \\| y | 100 |',
    '| Beta |  | 50 |',
  ].join('\n');

  const html = parseMarkdown(md);
  const { editor } = createDomContainer(html);

  const wrapper = editor.querySelector('.table-wrapper');
  assert.equal(wrapper?.getAttribute('data-md-table'), 'true');

  const turndown = createTurndownService();
  const roundTripped = turndown.turndown(editor.innerHTML).trim();
  assert.doesNotMatch(roundTripped, /<div|<table|<td/);
  assert.match(roundTripped, /\| Name \| Pipe \\\| Value \| Score \|/);
  assert.match(roundTripped, /\| Alpha \| x \\\| y \| 100 \|/);
  assert.match(roundTripped, /\| Beta \| {3}\| 50 \|/);
});

test('custom-styled table preserves HTML wrapper and cleans transient selection classes', () => {
  const { editor } = createDomContainer(`
    <div data-md-table="true" data-custom-style="true" class="table-wrapper rounded-2xl table-zebra">
      <table>
        <thead><tr><th class="active-cell ring-2 ring-blue-500">H1</th><th>H2</th></tr></thead>
        <tbody><tr><td>A</td><td>B</td></tr></tbody>
      </table>
    </div>
    <p><br></p>
  `);

  const turndown = createTurndownService();
  const md = turndown.turndown(editor.innerHTML).trim();
  assert.match(md, /<div data-custom-style="true" class="[^"]*rounded-2xl[^"]*table-zebra/);
  assert.doesNotMatch(md, /active-cell|ring-blue-500/);
  assert.doesNotMatch(md, /<br>\s*$/);
});

test('images round-trip as CommonMark and preserve custom resized dimensions safely', () => {
  const turndown = createTurndownService();

  const { editor: plainImgEditor } = createDomContainer(
    '<p><img src="https://example.com/a.png" alt="Logo [1]" title="Main" style="max-width: 100%;" /></p>'
  );
  assert.equal(
    turndown.turndown(plainImgEditor.innerHTML).trim(),
    '![Logo \\[1\\]](https://example.com/a.png "Main")'
  );

  const { editor: resizedImgEditor } = createDomContainer(
    '<p><img src="https://example.com/a.png" alt="Resized" style="width: 320px; height: auto;" /></p>'
  );
  assert.equal(
    turndown.turndown(resizedImgEditor.innerHTML).trim(),
    '<img src="https://example.com/a.png" alt="Resized" style="width: 320px; height: auto;" />'
  );
});

test('aligned headings preserve markdown heading hashes inside div align wrapper', () => {
  const turndown = createTurndownService();
  const { editor } = createDomContainer('<h2 style="text-align: center;">Centered Heading</h2><p style="text-align: left;">Default Left</p>');

  const md = turndown.turndown(editor.innerHTML).trim();
  assert.match(md, /<div align="center">\s*## Centered Heading\s*<\/div>/);
  assert.doesNotMatch(md, /align="left"/);
  assert.match(md, /Default Left$/);
});

test('interactive task lists render enabled checkboxes and serialize checked state accurately', () => {
  const md = '- [x] Done task\n- [ ] Pending task';
  const html = parseMarkdown(md);
  assert.doesNotMatch(html, /\sdisabled/i);

  const { editor } = createDomContainer(html);
  const checkboxes = Array.from(editor.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
  assert.equal(checkboxes.length, 2);
  assert.equal(checkboxes[0].disabled, false);
  assert.equal(checkboxes[0].hasAttribute('checked'), true);
  assert.equal(checkboxes[1].hasAttribute('checked'), false);

  // Simulate user toggling checkbox in DOM as done in EditorArea onChange
  checkboxes[0].removeAttribute('checked');
  checkboxes[1].setAttribute('checked', '');

  const turndown = createTurndownService();
  const updatedMd = turndown.turndown(editor.innerHTML);
  assert.match(updatedMd, /\[ \]\s+Done task/);
  assert.match(updatedMd, /\[x\]\s+Pending task/);
});

test('zero-width spacer paragraphs and trailing block-widget spacers do not leak phantom <br> lines', () => {
  const { editor } = createDomContainer(
    '<p>Hello</p><p>&#8203;</p><div class="code-block-wrapper" data-lang="js"><pre><code>let x = 1;</code></pre></div><p><br></p>'
  );
  const turndown = createTurndownService();
  const md = turndown.turndown(editor.innerHTML).trim();
  assert.equal(md, 'Hello\n\n```js\nlet x = 1;\n```');
});

test('XSS URLs in markdown links, images, turndown images, and font-size syntax are neutralized', () => {
  const md = '[click](javascript:alert(1)) and ![pic](javascript:alert(2))';
  const html = parseMarkdown(md);
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, />click and pic</);

  const turndown = createTurndownService();
  const { editor } = createDomContainer('<p><img src="javascript:alert(1)" alt="bad" /><span style="font-size: 14px; color: red;">ok</span></p>');
  const out = turndown.turndown(editor.innerHTML).trim();
  assert.doesNotMatch(out, /javascript:/i);
  assert.equal(out, '<span style="font-size: 14px">ok</span>');

  const customOut = processCustomMarkdown('[<b>x</b>]{14px;background:red} and [<img src=x onerror=alert(1)>]{18}');
  assert.doesNotMatch(customOut, /style="[^"]*background:red/);
  assert.doesNotMatch(customOut, /<img/);
  assert.match(customOut, /<span style="font-size: 18pt;">&lt;img src=x onerror=alert\(1\)&gt;<\/span>/);
});
