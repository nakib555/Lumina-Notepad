const TurndownService = require('turndown');
const turndownService = new TurndownService();
const CARET_MARKER = '%%%%CARETMARKER%%%%';
turndownService.addRule('caretMarker', {
  filter: function (node) {
    return node.nodeType === 1 && node.nodeName === 'SPAN' && node.id === 'caret-marker';
  },
  replacement: function () {
    return CARET_MARKER;
  }
});
turndownService.addRule('preserveBr', {
      filter: 'br',
      replacement: function (content, node) {
          // Check if parent is empty P
          if (node.parentNode && node.parentNode.nodeName === 'P' && node.parentNode.childNodes.length <= 2) {
             return '<br>';
          }
          return '\n';
      }
});

let dom1 = '<p>(Slide 10-12)</p><p><br><span id="caret-marker">\u200B</span></p>';
let md1 = turndownService.turndown(dom1);
console.log("MD: ", JSON.stringify(md1));

const { marked } = require('marked');
console.log("HTML:", marked.parse(md1, {breaks: true}));
