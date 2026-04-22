const TurndownService = require('turndown');
const turndownService = new TurndownService();
turndownService.keep(['span']);
console.log(turndownService.turndown('<p>Line 1</p><p><span id="caret-marker"></span><br></p>'));
