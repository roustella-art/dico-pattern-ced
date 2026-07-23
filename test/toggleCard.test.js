'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const vm = require('vm');
const { loadEnv } = require('./helpers/loadEnv.js');
const { extractFunction } = require('./helpers/extractFunction.js');

const INDEX_HTML = path.join(__dirname, '..', 'index.html');

// toggleCard() (index.html) appelle render()/updateHeaderUI()/previewStop()/metroStop() comme
// simples effets de bord — on les stub pour isoler la vraie règle métier testée ici : un seul
// tiroir de pattern ouvert à la fois, et l'arrêt de la lecture à la fermeture. On extrait le
// code réel de la fonction (pas une réécriture) pour que le test suive le code de prod.
function setupToggleCard() {
  const env = loadEnv(); // fournit `state`, `saveState`
  const calls = { render: 0, updateHeaderUI: 0, previewStop: 0, metroStop: 0 };
  env.render = () => { calls.render++; };
  env.updateHeaderUI = () => { calls.updateHeaderUI++; };
  env.previewStop = () => { calls.previewStop++; };
  env.metroStop = () => { calls.metroStop++; };
  const code = extractFunction(INDEX_HTML, 'toggleCard');
  vm.runInContext(code + '\nglobalThis.toggleCard = toggleCard;', env, { filename: 'toggleCard.js' });
  return { env, calls };
}

test('toggleCard: ouvrir une carte fermée l\'ouvre, sans arrêter la lecture', () => {
  const { env, calls } = setupToggleCard();
  env.toggleCard('A4P1');
  assert.equal(env.state.openCards['A4P1'], true);
  assert.equal(calls.previewStop, 0);
  assert.equal(calls.metroStop, 0);
  assert.equal(calls.render, 1);
});

test('toggleCard: ouvrir une 2e carte referme la 1ère (un seul tiroir ouvert à la fois)', () => {
  const { env } = setupToggleCard();
  env.toggleCard('A4P1');
  env.toggleCard('A4P3');
  assert.equal(env.state.openCards['A4P3'], true);
  assert.equal(env.state.openCards['A4P1'], false);
});

test('toggleCard: refermer la carte ouverte stoppe preview + métronome', () => {
  const { env, calls } = setupToggleCard();
  env.toggleCard('A4P1'); // ouverture
  env.toggleCard('A4P1'); // fermeture
  assert.equal(env.state.openCards['A4P1'], false);
  assert.equal(calls.previewStop, 1);
  assert.equal(calls.metroStop, 1);
});

test('toggleCard: rouvrir une carte déjà ouverte ailleurs ne touche pas les autres qui sont déjà fermées', () => {
  const { env } = setupToggleCard();
  env.toggleCard('A4P1');
  env.toggleCard('A4P1'); // fermée
  env.toggleCard('A4P3'); // ouverte
  assert.equal(env.state.openCards['A4P1'], false);
  assert.equal(env.state.openCards['A4P3'], true);
});
