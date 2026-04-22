import { marked } from 'marked';

console.log('1: ', marked.parse('<br>'));
console.log('2: ', marked.parse('A\n\n<br>\n\nB'));
