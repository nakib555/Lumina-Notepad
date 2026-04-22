const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('caretMarker', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.id === 'caret-marker';
  },
  replacement: function () {
    return '%%%%CARETMARKER%%%%';
  }
});
let md = turndownService.turndown('<p>Line 1</p><p><span id="caret-marker"></span><br></p>');
console.log("Empty line:", md);
