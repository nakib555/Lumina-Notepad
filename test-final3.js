const TurndownService = require('turndown');
const turndownService = new TurndownService();
let md = turndownService.turndown('<p>Line 1</p><p><br></p><p><br></p><p>Line 2</p>');
console.log(JSON.stringify(md));
