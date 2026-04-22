const fs = require('fs');
const content = fs.readFileSync('components/editor/editor-area.tsx', 'utf8');

const regex = /use(State|Effect|Callback|Memo|Ref|ImperativeHandle)\b/g;
let match;
while ((match = regex.exec(content)) !== null) {
  // get line number
  const prefix = content.slice(0, match.index);
  const lineNum = prefix.split('\n').length;
  console.log(`Line ${lineNum}: ${match[0]} - ${content.split('\n')[lineNum-1].trim()}`);
}
