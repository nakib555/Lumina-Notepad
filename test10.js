const marked = require('marked');
console.log("HEADING NBSP:", JSON.stringify(marked.parse("#\xA0Heading")));
console.log("HEADING SPACE:", JSON.stringify(marked.parse("# Heading")));
