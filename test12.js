const marked = require('marked');
console.log("1. NBSP:", JSON.stringify(marked.parse("1.\xA0test")));
console.log("1. SPACE:", JSON.stringify(marked.parse("1. test")));
