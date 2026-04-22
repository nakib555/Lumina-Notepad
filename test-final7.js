const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('blankRule', {
  filter: function (node) {
    return node.nodeName === 'P' && node.textContent.trim() === '';
  },
  replacement: function (content, node) {
    return '\n\n&nbsp;\n\n';
  }
});
let md = turndownService.turndown('<p>Line 1</p><p><br></p>');
console.log("Middle:", JSON.stringify(md));
