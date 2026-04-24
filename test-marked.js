const { marked } = require('marked');
console.log(marked.parse('<div align="center">\n\n![img](url)\n\n</div>'));
