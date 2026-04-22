const marked = require('marked');

console.log(marked.parse('Hello\\\nWorld'));
console.log('---');
console.log(marked.parse('Hello\\\n\\\nWorld'));
