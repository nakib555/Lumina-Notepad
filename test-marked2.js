const { marked } = require('marked');
let html = marked.parse("Line 1\n\n%%%%CARETMARKER%%%%");
console.log(html);
