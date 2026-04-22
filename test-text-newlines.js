const TurndownService = require('turndown');
const turndownService = new TurndownService();
const md = turndownService.turndown('<p>(Slide 10-12)\np<span id="caret-marker"></span></p>');
const md2 = turndownService.turndown('<p>(Slide 10-12) \n p<span id="caret-marker"></span></p>');
console.log(JSON.stringify(md));
console.log(JSON.stringify(md2));
