// index.ts
/* eslint-disable @typescript-eslint/no-var-requires */

try {
  const nodeCrypto = require('crypto');
  const base: any = nodeCrypto.webcrypto ?? {};

  // Fallback for getRandomValues (some older Node builds)
  if (typeof base.getRandomValues !== 'function') {
    base.getRandomValues = (arr: ArrayBufferView) => {
      nodeCrypto.randomFillSync(arr as unknown as Uint8Array);
      return arr;
    };
  }

  // Provide crypto.randomUUID if Web Crypto doesn't have it
  if (typeof base.randomUUID !== 'function') {
    if (typeof nodeCrypto.randomUUID === 'function') {
      base.randomUUID = () => nodeCrypto.randomUUID();
    } else {
      // Pure v4 polyfill using getRandomValues
      base.randomUUID = () => {
        const b = new Uint8Array(16);
        base.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40; // version 4
        b[8] = (b[8] & 0x3f) | 0x80; // variant 10
        const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
        return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
      };
    }
  }

  Object.defineProperty(globalThis, 'crypto', {
    value: base,
    writable: false,
    configurable: true,
    enumerable: false,
  });
  console.log('crpyto shimmed!');
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
