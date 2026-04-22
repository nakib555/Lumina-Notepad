let html = '<p class="testing"><span id="caret-marker"></span></p>';
html = html.replace(/<([a-z0-9]+)(?: [^>]*)?>\s*<span id="caret-marker"><\/span>\s*<\/\1>/gi, function(match, tag) {
    return match.replace('<span id="caret-marker"></span>', '<br><span id="caret-marker"></span>');
});
console.log(html);

let html2 = '<td><span id="caret-marker"></span></td>';
html2 = html2.replace(/<([a-z0-9]+)(?: [^>]*)?>\s*<span id="caret-marker"><\/span>\s*<\/\1>/gi, function(match, tag) {
    return match.replace('<span id="caret-marker"></span>', '<br><span id="caret-marker"></span>');
});
console.log(html2);
