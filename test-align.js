const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('alignTag', {
  filter: function (node) {
    if (node.nodeType !== 1) return false;
    const isBlock = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName);
    return isBlock && (node.getAttribute('align') || (node.style && node.style.textAlign));
  },
  replacement: function (content, node) {
    const align = node.getAttribute('align') || node.style.textAlign;
    return `\n<div align="${align}">\n\n${content}\n\n</div>\n`;
  }
});
console.log(turndownService.turndown('<h1 style="text-align: center;">Text</h1>'));
console.log(turndownService.turndown('<blockquote><p style="text-align: center;">Text</p></blockquote>'));
