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

function simulateCycle(htmlInput) {
  console.log("--- Cycle Start ---");
  console.log("Input HTML:", htmlInput);
  
  // Inject marker assuming caret is at the end of the empty P
  let htmlWithMarker = htmlInput.replace('</p>$', '<span id="caret-marker">\u200B</span></p>');
  if (htmlWithMarker === htmlInput) {
      // just append it to test
      htmlWithMarker = htmlInput.replace('</p>', '<span id="caret-marker">\u200B</span></p>');
  }
  console.log("With Marker:", htmlWithMarker);
  
  let mdWithMarker = turndownService.turndown(htmlWithMarker);
  console.log("MD With Marker:", JSON.stringify(mdWithMarker));
  
  // Fake the regex replacements from the applet
  mdWithMarker = mdWithMarker.replace(new RegExp(`^(\\s*---)\\s*(${CARET_MARKER})$`, 'gm'), '$1\n$2');
  const tableSepRegex = new RegExp(`^[ \\t]*\\|?[-: \\t]*${CARET_MARKER}[-: \\t]*\\|?[ \\t]*$`, 'm');
  if (tableSepRegex.test(mdWithMarker)) {
      const replaceRegex = new RegExp(`([^\\n]+)\\n([ \\t]*\\|?[-: \\t]*)(${CARET_MARKER})([-: \\t]*\\|?[ \\t]*(\\n|$))`, 'g');
      mdWithMarker = mdWithMarker.replace(replaceRegex, `$1${CARET_MARKER}\n$2$4`);
  }
  const afterPipeRegex = new RegExp(`(\\n[ \\t]*\\|[-: \\t]*)(${CARET_MARKER})([-: \\t]+\\|[ \\t]*\\n)`, 'g');
  mdWithMarker = mdWithMarker.replace(afterPipeRegex, '$1$3$2');
  
  console.log("MD After Regexes:", JSON.stringify(mdWithMarker));
  
  let newHtml = marked.parse(mdWithMarker, { breaks: true, gfm: true });
  console.log("Marked Output:", newHtml.trim());
  newHtml = newHtml.replace(CARET_MARKER, '<span id="caret-marker"></span>');
  console.log("Final HTML:", newHtml.trim());
}

simulateCycle('<p>Text</p><p><br></p>'); // Simulate pressing enter to getting a new paragraph
