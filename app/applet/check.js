const fs = require('fs');
const content = fs.readFileSync('components/editor/editor-area.tsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
for(let i=202; i<lines.length; i++){
  const line = lines[i];
  // naive depth tracking using braces
  depth += (line.match(/\{/g) || []).length;
  depth -= (line.match(/\}/g) || []).length;
  
  if (depth === 1 && line.includes('return')) {
    console.log('Return at depth 1 on line', i + 1, ':', line.trim());
  }
}
