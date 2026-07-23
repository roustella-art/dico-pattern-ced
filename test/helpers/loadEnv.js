'use strict';
// Charge data.js + state.js (scripts classiques, pas des modules) dans un contexte
// vm sandboxé, avec un stub localStorage minimal. Permet de tester la logique pure
// (calculs de progression, streak, etc.) sans navigateur ni DOM.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

function loadEnv() {
  const root = path.join(__dirname, '..', '..');
  const sandbox = {
    console,
    localStorage: makeLocalStorage(),
  };
  vm.createContext(sandbox);
  for (const file of ['data.js', 'state.js']) {
    const code = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  // Les scripts classiques déclarent leurs top-level const/let dans l'environnement
  // lexical du contexte vm, pas comme propriétés de l'objet global sandboxé — on les
  // ré-expose explicitement ici pour que les tests puissent y accéder via `env.X`.
  const exposedNames = [
    'PATTERNS', 'PATTERN_LEVEL_GROUPS', 'PATTERN_LEVEL_ORDER', 'LIGHT_MODE_FORME_EXCLUSIONS',
    'MODES', 'MODE_LABELS', 'INTERPS', 'INTERP_LABELS', 'TEMPOS', 'FINGERINGS',
    'state', 'SETTINGS', 'STRING_LINES', 'STRING_SHIFTS',
  ];
  const bridge = exposedNames.map(n => `try { globalThis.__bridge.${n} = ${n}; } catch(e) {}`).join('\n');
  sandbox.__bridge = {};
  vm.runInContext(bridge, sandbox, { filename: 'bridge.js' });
  Object.assign(sandbox, sandbox.__bridge);
  delete sandbox.__bridge;
  return sandbox;
}

module.exports = { loadEnv };
