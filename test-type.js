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

function simulateCycle(htmlInput, markerInsertion) {
  let htmlWithMarker = markerInsertion(htmlInput);
  
  let mdWithMarker = turndownService.turndown(htmlWithMarker);
  console.log("MD With Marker:", JSON.stringify(mdWithMarker));
  
  let newHtml = marked.parse(mdWithMarker, { breaks: true, gfm: true });
  newHtml = newHtml.replace(CARET_MARKER, '<span id="caret-marker"></span>');
  console.log("Final HTML:", newHtml.replace(/\n/g, '\\n'));
}

// User presses Enter and types "p"
simulateCycle('<p>Text</p><p>p</p>', html => html.replace('<p>p</p>', '<p>p<span id="caret-marker">\u200B</span></p>'));

