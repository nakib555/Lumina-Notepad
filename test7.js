const CARET_MARKER = '%%%%CARETMARKER%%%%';
let newHtml = `<ul>
<li>%%%%CARETMARKER%%%%\u200C</li>
</ul>`;
newHtml = newHtml.replace(CARET_MARKER, '<span id="caret-marker"></span>');
newHtml = newHtml.replace(/<([a-z0-9]+)(?: [^>]*)?>\s*<span id="caret-marker"><\/span>\s*<\/\1>/gi, (match) => match.replace('<span id="caret-marker"></span>', '<br><span id="caret-marker"></span>'));
console.log(newHtml);
