const { marked } = require('marked');

console.log(marked.parse("Text\n\n\n\nText"));
console.log(marked.parse("Text\n\n&nbsp;\n\nText"));
console.log(marked.parse("Text\n\n\\\nText"));
console.log(marked.parse("Text\n<br>\nText"));
console.log(marked.parse("Text  \nText"));
console.log(marked.parse("Text\n<br>\n<br>\nText"));
