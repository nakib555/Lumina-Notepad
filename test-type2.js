const TurndownService = require('turndown');
const { marked } = require('marked');

const CARET_MARKER = '%%%%CARETMARKER%%%%';

const turndownService = new TurndownService();
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
        return '\n';
      }
});

let dom1 = '<p>(Slide 10-12)</p><p><br><span id="caret-marker">\u200B</span></p>';
console.log("DOM:", dom1);
let md1 = turndownService.turndown(dom1);
console.log("MD: ", JSON.stringify(md1));

let dom2 = '<p>(Slide 10-12)</p><p>a<span id="caret-marker">\u200B</span></p>';
console.log("DOM2:", dom2);
let md2 = turndownService.turndown(dom2);
console.log("MD2: ", JSON.stringify(md2));
