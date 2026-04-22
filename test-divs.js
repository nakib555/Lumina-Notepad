const TurndownService = require('turndown');
const turndownService = new TurndownService();
const md = turndownService.turndown('<div>(Slide 10-12)</div><div>p<span id="caret-marker"></span></div>');
console.log(JSON.stringify(md));
