const marked = require('marked');
console.log("NBSP:", JSON.stringify(marked.parse("-\xA0%%%%CARETMARKER%%%%")));
console.log("SPACE:", JSON.stringify(marked.parse("- %%%%CARETMARKER%%%%")));
