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
      replacement: function () {
        return '\n'; // NOTE: NO LEADING SPACES OR BACKSLASH
      }
});

let dom2 = '<p>(Slide 10-12)<br>a<span id="caret-marker">\u200B</span></p>';
let md2 = turndownService.turndown(dom2);
console.log("MD: ", JSON.stringify(md2));

const { marked } = require('marked');
console.log("HTML:", marked.parse(md2, {breaks: true}));
