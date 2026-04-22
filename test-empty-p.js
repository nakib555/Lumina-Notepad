const { marked } = require('marked');

let md = "Text\n\n%%%%CARETMARKER%%%%";
let html = marked.parse(md, {breaks: true});
console.log(html);
