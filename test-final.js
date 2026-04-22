const TurndownService = require('turndown');
const turndownService = new TurndownService();
let md = turndownService.turndown('<p>Line 1</p><p><br></p>');
console.log("Final markdown:", md);
