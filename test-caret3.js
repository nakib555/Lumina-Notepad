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

let md = turndownService.turndown('<p>Line 1</p><p>&#8203;<span id="caret-marker"></span><br></p>');
console.log("With zero-width space:", md);

let md2 = turndownService.turndown('<p>Line 1</p><p>a<span id="caret-marker"></span><br></p>');
console.log("With letter a:", md2);
