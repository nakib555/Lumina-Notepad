let html = '<p><span id="caret-marker"></span></p>';
html = html.replace(/<([a-z1-6]+)><span id="caret-marker"><\/span><\/\1>/gi, '<$1><br><span id="caret-marker"></span></$1>');
console.log(html);

let html2 = '<h1><span id="caret-marker"></span></h1>';
html2 = html2.replace(/<([a-z1-6]+)><span id="caret-marker"><\/span><\/\1>/gi, '<$1><br><span id="caret-marker"></span></$1>');
console.log(html2);

let html3 = '<p>Text<span id="caret-marker"></span></p>';
html3 = html3.replace(/<([a-z1-6]+)><span id="caret-marker"><\/span><\/\1>/gi, '<$1><br><span id="caret-marker"></span></$1>');
console.log(html3);
