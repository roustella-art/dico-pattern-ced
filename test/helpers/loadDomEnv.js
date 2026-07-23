'use strict';
// Charge data.js, state.js et shaker.js (scripts classiques) dans une fenêtre jsdom,
// pour tester la logique du Labo (shaker.js) qui manipule directement le DOM
// (bar.innerHTML, document.getElementById, etc.) — un simple contexte vm ne suffit
// plus ici, contrairement à test/helpers/loadEnv.js.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// squelette minimal des éléments que shaker.js va chercher via getElementById
const HTML_SKELETON = `<!doctype html><html><body>
  <div id="sk-fav-bar"></div>
  <div id="sk-fav-dots"></div>
  <div id="sk-pad-dialog"></div>
</body></html>`;

// Bindings top-level (const/let) qu'on doit pouvoir lire depuis les tests — les function
// declarations s'attachent automatiquement à `window`, mais pas les const/let (même
// comportement que dans un vrai navigateur), donc on les ré-expose explicitement.
const EXPOSED_NAMES = [
  'PATTERNS', 'SETTINGS', 'state',
  'SK_PAD_PALETTE', 'SK_FAV_PAGE_COUNT', 'SK_PADS_PER_PAGE', 'SK_MAX_PINNED',
  'SK_PRESETS_V2_KEY', 'skFavPage', 'skCurrentPreset',
];

function loadDomEnv() {
  const root = path.join(__dirname, '..', '..');
  // runScripts:'dangerously' est requis pour que window.eval() exécute réellement le code
  // dans la portée globale de la fenêtre (sinon les function declarations ne s'attachent
  // même pas à `window`) — sans risque ici puisqu'on ne charge que nos propres fichiers.
  const dom = new JSDOM(HTML_SKELETON, { url: 'http://localhost/', runScripts: 'dangerously' });
  const { window } = dom;

  window.alert = () => {}; // shaker.js utilise alert() pour la limite de pads épinglés

  // Un seul eval() pour les 3 fichiers concaténés : des appels window.eval() séparés
  // créeraient chacun leur propre scope de haut niveau pour les const/let (comme des
  // <script> distincts non partagés), et data.js (PATTERNS) ne serait alors pas visible
  // depuis shaker.js. Un seul appel les fait partager le même scope top-level, comme s'ils
  // étaient concaténés dans une seule balise <script> — ce qu'ils sont in fine dans
  // www/ (index.html les charge l'un après l'autre, dans le même document).
  const bridge = `\nwindow.__bridge = {};\n` +
    EXPOSED_NAMES.map(n => `try { window.__bridge.${n} = ${n}; } catch(e) {}`).join('\n');
  const code = ['data.js', 'state.js', 'shaker.js']
    .map(file => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n;\n') + bridge;
  window.eval(code);
  Object.assign(window, window.__bridge);
  delete window.__bridge;
  return window;
}

module.exports = { loadDomEnv };
