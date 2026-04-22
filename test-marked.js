const { marked } = require('marked');
let html = marked.parse("Line 1\n\n%%%%__CARET__%%%%");
console.log(html);
