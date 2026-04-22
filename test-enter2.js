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

function simulateCycle(htmlInput, markerInsertion) {
  console.log("--- Cycle Start ---");
  console.log("Input HTML:", htmlInput);
  
  let htmlWithMarker = markerInsertion(htmlInput);
  console.log("With Marker:", htmlWithMarker);
  
  let mdWithMarker = turndownService.turndown(htmlWithMarker);
  console.log("MD With Marker:", JSON.stringify(mdWithMarker));
  
  let newHtml = marked.parse(mdWithMarker, { breaks: true, gfm: true });
  console.log("Marked Output:", newHtml.trim());
  newHtml = newHtml.replace(CARET_MARKER, '<span id="caret-marker"></span>');
  console.log("Final HTML:", newHtml.trim());
}

// User presses Enter
simulateCycle('<p>Text</p><p><br></p>', html => html.replace('<p><br></p>', '<p><br><span id="caret-marker">\u200B</span></p>'));

// User presses Enter again
simulateCycle('<p>Text</p><p><br></p><p><br></p>', html => html.replace(/<p><br><\/p>$/, '<p><br><span id="caret-marker">\u200B</span></p>'));

