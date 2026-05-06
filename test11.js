const TurndownService = require('turndown');
const service = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});
service.escape = (string) => string;
const md1 = service.turndown('<div>1.&nbsp;test</div>');
console.log(JSON.stringify(md1));
