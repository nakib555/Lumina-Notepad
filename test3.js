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

let htmlWithMarker = `<div>- <span id="caret-marker"></span></div>`;
let mdWithMarker = service.turndown(htmlWithMarker);
console.log("Output 1:", JSON.stringify(mdWithMarker));

let htmlWithMarker2 = `<p>- <span id="caret-marker"></span></p>`;
console.log("Output 2:", JSON.stringify(service.turndown(htmlWithMarker2)));

let htmlWithMarker3 = `<div>-&nbsp;<span id="caret-marker"></span></div>`;
console.log("Output 3:", JSON.stringify(service.turndown(htmlWithMarker3)));
