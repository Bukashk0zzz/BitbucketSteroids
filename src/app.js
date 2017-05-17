const syntaxHighlight = require('./syntax-highlight/syntax-highlight');
const events = require('./events');
const occurrencesHighlighter = require('./occurrences-highlighter/occurrences-highlighter');
const keymap = require('./keymap/keymap');

syntaxHighlight.init();
occurrencesHighlighter.init();
keymap.init(Mousetrap);
events.init();

// Tree
require('./tree/main');
