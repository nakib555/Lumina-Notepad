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

console.log(turndownService.turndown('<p>Line 1</p><p><span id="caret-marker"></span><br></p>'));
