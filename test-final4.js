const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('preserveBr', {
  filter: 'br',
  replacement: function () {
    return '\n';
  }
});
let md = turndownService.turndown('<p>Line 1</p><p><br></p><p><br></p><p>Line 2</p>');
let md2 = turndownService.turndown('<p>Line 1</p><p><br></p>');
console.log("Middle:", JSON.stringify(md));
console.log("End:", JSON.stringify(md2));
