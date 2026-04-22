const fs = require('fs');
const content = fs.readFileSync('components/editor/floating-toolbar.tsx', 'utf8');
const newContent = content.replace(/onClick=\{\(\) => applyFormatting\(/g, 'onClick={() => handleApplyFormatting(');
fs.writeFileSync('components/editor/floating-toolbar.tsx', newContent);
