import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARET_MARKER,
  escapeHtml,
  sanitizeCodeLang,
  escapeScriptTagContent,
  isValidImageUrl,
  cleanAiResponse,
  escapeMarkdownTableCell,
  splitMarkdownTableRow,
  sanitizeUrl,
  sanitizeFontSizeValue,
  getCodeFenceDelimiter,
  insertMarkerIntoHighlightedHtml,
  hasOnlyDefaultImageStyles,
  formatMarkdownImage,
  markdownToPlainText,
} from './editor-helpers';

test('escapeHtml escapes all dangerous HTML characters', () => {
  assert.equal(
    escapeHtml(`<script>alert("xss" & '1')</script>`),
    '&lt;script&gt;alert(&quot;xss&quot; &amp; &#039;1&#039;)&lt;/script&gt;'
  );
  assert.equal(escapeHtml(''), '');
});

test('sanitizeCodeLang extracts and cleans first token only', () => {
  assert.equal(sanitizeCodeLang('typescript highlight=1'), 'typescript');
  assert.equal(sanitizeCodeLang('c++'), 'c');
  assert.equal(sanitizeCodeLang(`js'); alert(1);//`), 'js');
  assert.equal(sanitizeCodeLang('node_js-v20'), 'node_js-v20');
  assert.equal(sanitizeCodeLang(''), '');
});

test('escapeScriptTagContent prevents closing script tag injection', () => {
  assert.equal(
    escapeScriptTagContent('const s = "</script><script>evil()</script>";'),
    'const s = "<\\/script><script>evil()<\\/script>";'
  );
  assert.equal(
    escapeScriptTagContent('const u = "</SCRIPT>";'),
    'const u = "<\\/SCRIPT>";'
  );
  assert.equal(escapeScriptTagContent(''), '');
});

test('isValidImageUrl accepts valid image URLs and data URIs and rejects invalid/script strings', () => {
  assert.equal(isValidImageUrl('https://example.com/photo.png?w=800#top'), true);
  assert.equal(isValidImageUrl('/images/diagram.svg'), true);
  assert.equal(isValidImageUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isValidImageUrl('not a url.png'), false);
  assert.equal(isValidImageUrl('javascript:alert(1)//.png'), false);
  assert.equal(isValidImageUrl('hello.png" onerror="alert(1)'), false);
  assert.equal(isValidImageUrl(''), false);
});

test('cleanAiResponse strips code fences and conversational preambles/outros', () => {
  assert.equal(
    cleanAiResponse('Sure, here is the polished text:\n\n```markdown\nHello world\n```\n\nHope this helps!'),
    'Hello world'
  );
  assert.equal(
    cleanAiResponse('Here is the translation of your text into Spanish:\nHola mundo\nLet me know if you need anything else!'),
    'Hola mundo'
  );
  assert.equal(cleanAiResponse('Plain direct output'), 'Plain direct output');
  assert.equal(cleanAiResponse(''), '');
});

test('escapeMarkdownTableCell escapes unescaped pipes without double-escaping', () => {
  assert.equal(escapeMarkdownTableCell('a | b'), 'a \\| b');
  assert.equal(escapeMarkdownTableCell('already \\| escaped | raw'), 'already \\| escaped \\| raw');
  assert.equal(escapeMarkdownTableCell(''), '');
});

test('splitMarkdownTableRow splits columns while preserving escaped pipes', () => {
  assert.deepEqual(splitMarkdownTableRow('| A | B | C |'), ['A', 'B', 'C']);
  assert.deepEqual(splitMarkdownTableRow('| x \\| y | z |'), ['x | y', 'z']);
  assert.deepEqual(splitMarkdownTableRow('left | right'), ['left', 'right']);
});

test('sanitizeUrl allowlists safe schemes and blocks javascript/vbscript/data HTML', () => {
  assert.equal(sanitizeUrl('https://example.com/path?a=1'), 'https://example.com/path?a=1');
  assert.equal(sanitizeUrl('mailto:user@example.com'), 'mailto:user@example.com');
  assert.equal(sanitizeUrl('/docs/intro#top'), '/docs/intro#top');
  assert.equal(sanitizeUrl('//cdn.example.com/img.png'), 'https://cdn.example.com/img.png');
  assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeUrl('  JaVaScRiPt:\u0000alert(1)'), '');
  assert.equal(sanitizeUrl('vbscript:msgbox(1)'), '');
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: true }), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: false }), '');
  assert.equal(sanitizeUrl('mailto:user@example.com', { allowDataImage: true }), '');
});

test('sanitizeFontSizeValue validates CSS units and blocks injection', () => {
  assert.equal(sanitizeFontSizeValue('14'), '14pt');
  assert.equal(sanitizeFontSizeValue('1.25REM'), '1.25rem');
  assert.equal(sanitizeFontSizeValue('18px'), '18px');
  assert.equal(sanitizeFontSizeValue('12pt; background: url(javascript:alert(1))'), null);
  assert.equal(sanitizeFontSizeValue('expression(alert(1))'), null);
});

test('getCodeFenceDelimiter selects dynamically larger backtick run when code contains backticks', () => {
  assert.equal(getCodeFenceDelimiter('const x = 1;'), '```');
  assert.equal(getCodeFenceDelimiter('inline `code` here'), '```');
  assert.equal(getCodeFenceDelimiter('```js\nconsole.log(1)\n```'), '````');
  assert.equal(getCodeFenceDelimiter('````\nnested\n````'), '`````');
});

test('insertMarkerIntoHighlightedHtml inserts marker at visible offset skipping tags and entities', () => {
  const html = '<span class="hljs-keyword">const</span> a &lt; b = <span class="hljs-number">1</span>;';
  // Visible text: "const a < b = 1;"
  // Offset 0 -> before everything
  assert.equal(insertMarkerIntoHighlightedHtml(html, 0, CARET_MARKER), CARET_MARKER + html);
  // Offset 8 -> right after "const a " (before "&lt;")
  const at8 = insertMarkerIntoHighlightedHtml(html, 8, CARET_MARKER);
  assert.equal(at8, `<span class="hljs-keyword">const</span> a ${CARET_MARKER}&lt; b = <span class="hljs-number">1</span>;`);
  // Offset 9 -> right after "&lt;" (counts entity as 1 visible char)
  const at9 = insertMarkerIntoHighlightedHtml(html, 9, CARET_MARKER);
  assert.equal(at9, `<span class="hljs-keyword">const</span> a &lt;${CARET_MARKER} b = <span class="hljs-number">1</span>;`);
  // Past end -> appended
  assert.equal(insertMarkerIntoHighlightedHtml(html, 999, CARET_MARKER), html + CARET_MARKER);
});

test('hasOnlyDefaultImageStyles distinguishes plain images from resized/custom styled images', () => {
  assert.equal(hasOnlyDefaultImageStyles(''), true);
  assert.equal(hasOnlyDefaultImageStyles('max-width: 100%;'), true);
  assert.equal(hasOnlyDefaultImageStyles('width: 240px; max-width: 100%;'), false);
  assert.equal(hasOnlyDefaultImageStyles('', '200px', null), false);
});

test('formatMarkdownImage escapes brackets in alt text and quotes in title', () => {
  assert.equal(
    formatMarkdownImage('diagram [v1]', 'https://example.com/a(1).png', 'My "Chart"'),
    '![diagram \\[v1\\]](<https://example.com/a(1).png> "My \\"Chart\\"")'
  );
  assert.equal(
    formatMarkdownImage('plain', 'https://example.com/pic.png'),
    '![plain](https://example.com/pic.png)'
  );
});

test('markdownToPlainText cleanly strips markdown, sketches, tables, entities, and preserves snake_case', () => {
  const md = [
    '# Heading One',
    '',
    'Hello **world** with `my_var_name` and snake_case_ident and *italic* text.',
    '',
    '![Alt label](https://example.com/img.png) and [Read docs](https://example.com/docs)',
    '',
    '- [x] Completed task',
    '- [ ] Open task',
    '',
    '| Col A | Col B |',
    '| :--- | ---: |',
    '| a \\| b | 42 |',
    '',
    '<div class="sketch-container"><svg><path d="M0 0"/></svg></div>',
    '',
    '```js',
    'const val = a < b & c;',
    '```',
  ].join('\n');

  const plain = markdownToPlainText(md);
  assert.match(plain, /^Heading One/m);
  assert.match(plain, /Hello world with my_var_name and snake_case_ident and italic text\./);
  assert.match(plain, /Alt label and Read docs/);
  assert.doesNotMatch(plain, /https:\/\/example\.com/);
  assert.match(plain, /Completed task/);
  assert.match(plain, /Open task/);
  assert.match(plain, /Col A {2}Col B/);
  assert.match(plain, /a \| b {2}42/);
  assert.doesNotMatch(plain, /sketch-container|<svg/);
  assert.match(plain, /const val = a < b & c;/);
});
