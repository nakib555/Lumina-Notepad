import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  sanitizeCodeLang,
  escapeScriptTagContent,
  isValidImageUrl,
  cleanAiResponse,
  escapeMarkdownTableCell,
  splitMarkdownTableRow,
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
