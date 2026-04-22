const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.addRule('caretMarker', {
  filter: function (node) {
    return node.nodeName === 'SPAN' && node.id === 'caret-marker';
  },
  replacement: function () {
    return '%%%%__CARET__%%%%';
  }
});

let md = turndownService.turndown('<p>Line 1</p><p><span id="caret-marker">&#8203;</span><br></p>');
console.log("With zero-width inside span:", md);
