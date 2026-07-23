'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadEnv } = require('./helpers/loadEnv.js');

const DAY = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

// Les objets retournés viennent d'un contexte vm séparé (realm différent) : leur
// prototype n'est pas le même Object.prototype que celui de ce fichier de test, donc
// assert.deepEqual/deepStrictEqual les considère non égaux malgré des champs identiques.
// On compare les champs un par un plutôt que l'objet entier.
function assertStreak(result, expected) {
  assert.equal(result.current, expected.current);
  assert.equal(result.record, expected.record);
}

test('computeStreak: aucune session → 0/0', () => {
  const { computeStreak } = loadEnv();
  assertStreak(computeStreak([]), { current: 0, record: 0 });
});

test('computeStreak: une seule session aujourd\'hui → série de 1', () => {
  const { computeStreak } = loadEnv();
  const today = iso(Date.now());
  assertStreak(computeStreak([today]), { current: 1, record: 1 });
});

test('computeStreak: dernière session hier → série en cours toujours active', () => {
  const { computeStreak } = loadEnv();
  const yesterday = iso(Date.now() - DAY);
  const twoDaysAgo = iso(Date.now() - 2 * DAY);
  const result = computeStreak([twoDaysAgo, yesterday]);
  assert.equal(result.current, 2);
  assert.equal(result.record, 2);
});

test('computeStreak: dernière session avant-hier → série en cours retombée à 0', () => {
  const { computeStreak } = loadEnv();
  const twoDaysAgo = iso(Date.now() - 2 * DAY);
  const threeDaysAgo = iso(Date.now() - 3 * DAY);
  const result = computeStreak([threeDaysAgo, twoDaysAgo]);
  assert.equal(result.current, 0);
  // Le record, lui, reste acquis même si la série en cours est retombée.
  assert.equal(result.record, 2);
});

test('computeStreak: série interrompue puis reprise — le record garde la plus longue', () => {
  const { computeStreak } = loadEnv();
  const today = iso(Date.now());
  const y1 = iso(Date.now() - DAY);
  const y2 = iso(Date.now() - 2 * DAY);
  const y3 = iso(Date.now() - 3 * DAY);
  // Trou volontaire entre y3/y2 et un ancien bloc de 3 jours isolé plus loin dans le passé.
  const old1 = iso(Date.now() - 10 * DAY);
  const old2 = iso(Date.now() - 11 * DAY);
  const old3 = iso(Date.now() - 12 * DAY);
  const sessions = [old3, old2, old1, y3, y2, y1, today].sort();
  const result = computeStreak(sessions);
  assert.equal(result.current, 4); // y3,y2,y1,today consécutifs
  assert.equal(result.record, 4);
});
