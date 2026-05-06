const marked = require('marked');
const CARET_MARKER = '%%%%CARETMARKER%%%%';

const parseMarkdown = (text) => {
  // Strip zero-width characters that cause KaTeX console warnings
  // \u200B: Zero-width space, \u2061: Function application
  const cleanText = text.replace(/[\u200B\u2061]/g, '');
  // Append zero-width non-joiner so marked doesn't strip trailing newlines
  const html = marked.parse(cleanText + '\u200C', { breaks: true, gfm: true });
  return html;
};

console.log("parseMarkdown('- %%%%CARETMARKER%%%%'):\n" + parseMarkdown("- %%%%CARETMARKER%%%%"));

