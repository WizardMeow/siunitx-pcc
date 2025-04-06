import {combineWithMathJax} from '../../node_modules/mathjax-full/mjs/components/global.js';
import {VERSION} from '../../node_modules/mathjax-full/mjs/components/version.js';

import * as module1 from '../../js/siunitx.js';

if (MathJax.loader) {
  MathJax.loader.checkVersion('[siunitx]/siunitx', VERSION, 'tex-extension');
}

combineWithMathJax({_: {
  siunitx: module1
}});
