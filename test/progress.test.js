'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadEnv } = require('./helpers/loadEnv.js');

test('getProgressKey: format stable, sans shuffle', () => {
  const { getProgressKey } = loadEnv();
  assert.equal(getProgressKey('A4P1', 1, 'U', 'Down', 'lent'), 'A4P1__1__U__Down__lent');
});

test('getProgressKey: accepte un objet tempo (utilise sa clé) ou une string tempo', () => {
  const { getProgressKey } = loadEnv();
  const byString = getProgressKey('A4P1', 1, 'U', 'Down', 'lent');
  const byObject = getProgressKey('A4P1', 1, 'U', 'Down', { key: 'lent', label: 'Tempo' });
  assert.equal(byString, byObject);
});

test('getProgressKey: suffixe __sh ajouté quand SETTINGS.shuffleMode est actif', () => {
  const env = loadEnv();
  env.SETTINGS.shuffleMode = true;
  assert.equal(env.getProgressKey('A4P1', 1, 'U', 'Down', 'lent'), 'A4P1__1__U__Down__lent__sh');
});

test('getPatternPct: 0% quand rien n\'est complété', () => {
  const env = loadEnv();
  const patId = env.PATTERNS[0].id;
  assert.equal(env.getPatternPct(patId), 0);
});

test('getPatternPct: 100% quand toutes les combinaisons (interp × tempo) sont marquées faites', () => {
  const env = loadEnv();
  const pat = env.PATTERNS[0];
  // getPatternPct calcule sa clé avec `pat.dir` tel quel (peut être undefined selon les
  // données) — le test doit utiliser exactement la même valeur pour rester représentatif
  // du vrai contrat entre lecture et écriture de la progression.
  for (const interp of env.INTERPS) {
    for (const tempo of env.TEMPOS) {
      env.state.progress[env.getProgressKey(pat.id, 1, pat.dir, interp, tempo)] = true;
    }
  }
  assert.equal(env.getPatternPct(pat.id), 100);
});

test('getPatternPct: pattern inconnu ne plante pas (mode par défaut U)', () => {
  const env = loadEnv();
  assert.equal(env.getPatternPct('__inexistant__'), 0);
});
