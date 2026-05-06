const marked = require('marked');
console.log(marked.parse("- __CARET__"));
console.log(marked.parse("* __CARET__"));
console.log(marked.parse("-"));
