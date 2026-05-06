const TurndownService = require('turndown');
const service = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});
service.escape = (string) => string;

const CARET_MARKER = '%%%%CARETMARKER%%%%';

service.addRule('caretMarker', {
  filter: function (node) {
    return node.nodeType === 1 && node.nodeName === 'SPAN' && node.id === 'caret-marker';
  },
  replacement: function () {
    return CARET_MARKER;
  }
});

let htmlWithMarker = `<div>-&nbsp;<span id="caret-marker">\u200B</span></div>`;
let mdWithMarker = service.turndown(htmlWithMarker);
console.log("Output NBSP:", JSON.stringify(mdWithMarker));

let htmlWithMarker2 = `<div>- <span id="caret-marker">\u200B</span></div>`;
console.log("Output SPACE:", JSON.stringify(service.turndown(htmlWithMarker2)));
