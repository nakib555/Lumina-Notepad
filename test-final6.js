const TurndownService = require('turndown');
const { marked } = require('marked');

const turndownService = new TurndownService();
turndownService.addRule('preserveBr', {
  filter: 'br',
  replacement: function () {
    return '<br>';
  }
});
let htmlText = '<p>Line 1</p><p><br></p>';
let md = turndownService.turndown(htmlText);
let html2 = marked.parse(md, {breaks: true});
console.log("HTML:", htmlText);
console.log("MD:  ", JSON.stringify(md));
console.log("HTML2:", html2.trim());

let md2 = turndownService.turndown(html2);
let html3 = marked.parse(md2, {breaks: true});
console.log("MD2: ", JSON.stringify(md2));
console.log("HTML3:", html3.trim());
