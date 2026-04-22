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
        return '\n';
      }
});

const html = '<p>Line 1</p><p><br><span id="caret-marker">\u200B</span></p>';
let md = turndownService.turndown(html);
console.log("MD: ", JSON.stringify(md));

const markdown = require('marked');
let newHtml = markdown.marked.parse(md, {breaks: true});
console.log("HTML:", newHtml);
