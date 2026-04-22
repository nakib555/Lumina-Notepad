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

let dom1 = '<p>(Slide 10-12)</p><p><br><span id="caret-marker">\u200B</span></p>';
let md1 = turndownService.turndown(dom1);
console.log("MD: ", JSON.stringify(md1));

const CARET_MARKER2 = '%%%%CARETMARKER%%%%';
const turndownService2 = new TurndownService();
turndownService2.addRule('caretMarker', {
  filter: function (node) {
    return node.nodeType === 1 && node.nodeName === 'SPAN' && node.id === 'caret-marker';
  },
  replacement: function () {
    return CARET_MARKER2;
  }
});
turndownService2.addRule('preserveBr', {
      filter: 'br',
      replacement: function () {
        return '\n';
      }
});
let md2 = turndownService2.turndown(dom1);
console.log("MD2:", JSON.stringify(md2));
