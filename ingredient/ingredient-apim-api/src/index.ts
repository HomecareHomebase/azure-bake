// index.ts
/* eslint-disable @typescript-eslint/no-var-requires */

try {
  const { webcrypto } = require('crypto'); // Node's Web Crypto (Node 16+: experimental)
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      writable: false,
      configurable: true,
      enumerable: false,
    });
    console.log('Having to shim crypto...');
  }
} catch (e) {
  console.warn('No Crypto available:', e);
}

// Use require so TS doesn't hoist imports above the shim
const { ApimApiPlugin } = require('./plugin');
const { ApimApiUtils } = require('./functions');

/*  comment out these entries if you are not including an ingredient plugin runner*/
exports.plugin = ApimApiPlugin;
exports.pluginNS = '@azbake/ingredient-apim-api'; // name of the ingredient to reference in a bake.yaml recipe

/* comment out these entries if you are not including a set of expression functions*/
exports.functions = ApimApiUtils;
exports.functionsNS = 'apimapi'; // bake.yaml expressions can access your functions via "myutils.my_function()"
