import { marked } from 'marked';

console.log('1: ', marked.parse('A\\\nB'));
console.log('2: ', marked.parse('\\\n'));
console.log('3: ', marked.parse('A\n\n\\\n\nB'));
