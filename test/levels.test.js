'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadEnv } = require('./helpers/loadEnv.js');
const { fillGroupProgress } = require('./helpers/fillGroup.js');

test('getGroupPct: 0% sans progression, pour un groupe unifié (versionTabs × formeTabs)', () => {
  const env = loadEnv();
  assert.equal(env.getGroupPct('A4P1'), 0);
});

test('getGroupPct: 100% une fois toutes les combinaisons cochées', () => {
  const env = loadEnv();
  fillGroupProgress(env, 'A4P1');
  assert.equal(env.getGroupPct('A4P1'), 100);
});

test('getUnlockedLevel: niveau 1 débloqué par défaut, niveau 2 verrouillé tant que le niveau 1 n\'est pas fini', () => {
  const env = loadEnv();
  assert.equal(env.getUnlockedLevel(), 1);
  assert.equal(env.isLevelUnlocked(1), true);
  assert.equal(env.isLevelUnlocked(2), false);
});

test('getUnlockedLevel: passe à 2 une fois tous les groupes du niveau 1 à 100%', () => {
  const env = loadEnv();
  for (const groupKey of env.PATTERN_LEVEL_GROUPS[0]) {
    fillGroupProgress(env, groupKey);
  }
  assert.equal(env.getUnlockedLevel(), 2);
  assert.equal(env.isLevelUnlocked(2), true);
  assert.equal(env.isLevelUnlocked(3), false);
});

test('getUnlockedLevel: guidedMode désactivé → tous les niveaux sont débloqués d\'emblée', () => {
  const env = loadEnv();
  env.SETTINGS.guidedMode = false;
  assert.equal(env.getUnlockedLevel(), env.PATTERN_LEVEL_GROUPS.length);
  assert.equal(env.isLevelUnlocked(env.PATTERN_LEVEL_GROUPS.length), true);
});

test('isLevelComplete / isLevel1Complete: cohérents avec getGroupPct groupe par groupe', () => {
  const env = loadEnv();
  assert.equal(env.isLevel1Complete(), false);
  assert.equal(env.isLevelComplete(1), false);
  for (const groupKey of env.PATTERN_LEVEL_GROUPS[0]) {
    fillGroupProgress(env, groupKey);
  }
  assert.equal(env.isLevel1Complete(), true);
  assert.equal(env.isLevelComplete(1), true);
  assert.equal(env.isLevelComplete(2), false);
});

test('isLevelComplete: niveau inexistant renvoie false plutôt que de planter', () => {
  const env = loadEnv();
  assert.equal(env.isLevelComplete(999), false);
});

test('isAllLevelsComplete: false tant qu\'il reste un seul groupe incomplet, true une fois tout fini', () => {
  const env = loadEnv();
  const allGroupKeys = env.PATTERN_LEVEL_GROUPS.flat();
  for (const groupKey of allGroupKeys.slice(0, -1)) {
    fillGroupProgress(env, groupKey);
  }
  assert.equal(env.isAllLevelsComplete(), false);
  fillGroupProgress(env, allGroupKeys[allGroupKeys.length - 1]);
  assert.equal(env.isAllLevelsComplete(), true);
});

test('isLaboUnlocked: débloqué hors mode Guidé, verrouillé en mode Guidé tant que le niveau 3 n\'est pas atteint', () => {
  const env = loadEnv();
  // Avec guidedMode + lightMode actifs par défaut et aucune progression : Labo verrouillé.
  assert.equal(env.isLaboUnlocked(), false);
  env.SETTINGS.guidedMode = false;
  assert.equal(env.isLaboUnlocked(), true);
});

test('isLaboUnlocked: laboForceUnlocked débloque le Labo même sans progression', () => {
  const env = loadEnv();
  assert.equal(env.isLaboUnlocked(), false);
  env.state.laboForceUnlocked = true;
  assert.equal(env.isLaboUnlocked(), true);
});
