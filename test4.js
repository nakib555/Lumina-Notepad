const marked = require('marked');
console.log("Without space:", JSON.stringify(marked.parse("-%%%%CARETMARKER%%%%")));
console.log("Newline:", JSON.stringify(marked.parse("-\n%%%%CARETMARKER%%%%")));
console.log("Space:", JSON.stringify(marked.parse("- %%%%CARETMARKER%%%%")));
