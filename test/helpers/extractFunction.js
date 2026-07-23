'use strict';
// Extrait le code source d'une fonction top-level `function name(...) { ... }` depuis un
// fichier, par comptage d'accolades — utile pour index.html dont le JS inline n'est pas
// chargeable comme un module/fichier JS entier (mélangé au markup).
const fs = require('fs');

function extractFunction(filePath, name) {
  const src = fs.readFileSync(filePath, 'utf8');
  const startRe = new RegExp(`function\\s+${name}\\s*\\(`);
  const m = startRe.exec(src);
  if (!m) throw new Error(`extractFunction: "${name}" introuvable dans ${filePath}`);
  const start = m.index;
  let depth = 0, i = start, seenFirstBrace = false;
  for (; i < src.length; i++) {
    if (src[i] === '{') { depth++; seenFirstBrace = true; }
    else if (src[i] === '}') { depth--; if (seenFirstBrace && depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

module.exports = { extractFunction };
