'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadDomEnv } = require('./helpers/loadDomEnv.js');

// skFavPage est un `let` top-level : sa valeur exposée sur `window` est un instantané pris
// au chargement, pas une référence vivante (les mutations internes via skGoFavPage() ne s'y
// reflètent pas). On lit donc l'état affiché via le DOM (classe 'active' des points de page)
// plutôt que via win.skFavPage, pour rester fidèle à ce que voit vraiment l'utilisateur.
function activeDotIndex(win) {
  const dots = [...win.document.getElementById('sk-fav-dots').children];
  return dots.findIndex(d => d.classList.contains('active'));
}
function pinNames(win, count) {
  const db = { presets: {}, folders: ['Mes créations'], groups: {} };
  for (let i = 1; i <= count; i++) {
    db.presets['P' + i] = { folder: 'Mes créations', pinned: true, createdAt: i };
  }
  win.localStorage.setItem(win.SK_PRESETS_V2_KEY, JSON.stringify(db));
  return db;
}

test('skBuildFavBar: aucun preset épinglé → 8 chips vides, 3 points de page', () => {
  const win = loadDomEnv();
  win.skBuildFavBar();
  const bar = win.document.getElementById('sk-fav-bar');
  assert.equal(bar.querySelectorAll('.sk-fav-chip-empty').length, 8);
  assert.equal(bar.querySelectorAll('.sk-fav-chip:not(.sk-fav-chip-empty)').length, 0);
  assert.equal(win.document.getElementById('sk-fav-dots').children.length, 3);
});

test('skBuildFavBar: 10 presets épinglés → page 1 pleine (8), page 2 avec 2 + 6 emplacements vides', () => {
  const win = loadDomEnv();
  pinNames(win, 10);
  win.skBuildFavBar();
  const bar = win.document.getElementById('sk-fav-bar');
  assert.equal(bar.querySelectorAll('.sk-fav-chip:not(.sk-fav-chip-empty)').length, 8);
  assert.equal(bar.querySelectorAll('.sk-fav-chip-empty').length, 0);

  win.skGoFavPage(1);
  assert.equal(activeDotIndex(win), 1);
  assert.equal(bar.querySelectorAll('.sk-fav-chip:not(.sk-fav-chip-empty)').length, 2);
  assert.equal(bar.querySelectorAll('.sk-fav-chip-empty').length, 6);
});

test('skGoFavPage: ignore les indices hors bornes (pas de page -1 ni page 3)', () => {
  const win = loadDomEnv();
  pinNames(win, 24);
  win.skBuildFavBar();
  win.skGoFavPage(2);
  assert.equal(activeDotIndex(win), 2);
  win.skGoFavPage(3); // hors bornes (SK_FAV_PAGE_COUNT === 3, indices 0-2) → ignoré
  assert.equal(activeDotIndex(win), 2);
  win.skGoFavPage(-1); // hors bornes → ignoré
  assert.equal(activeDotIndex(win), 2);
});

test('skTogglePin: refuse d\'épingler un 25e preset (limite SK_MAX_PINNED)', () => {
  const win = loadDomEnv();
  const db = pinNames(win, 24);
  db.presets['P25'] = { folder: 'Mes créations', pinned: false, createdAt: 25 };
  win.localStorage.setItem(win.SK_PRESETS_V2_KEY, JSON.stringify(db));

  let alerted = false;
  win.alert = () => { alerted = true; };
  win.skTogglePin('P25');

  const after = JSON.parse(win.localStorage.getItem(win.SK_PRESETS_V2_KEY));
  assert.equal(after.presets['P25'].pinned, false);
  assert.equal(alerted, true);
});

test('skMoveFavPad: échange bien deux pads adjacents sur la page courante', () => {
  const win = loadDomEnv();
  pinNames(win, 8);
  win.skBuildFavBar();
  win.skMoveFavPad('P1', 'right');
  const bar = win.document.getElementById('sk-fav-bar');
  const labels = [...bar.querySelectorAll('.sk-fav-chip:not(.sk-fav-chip-empty) .sk-fav-chip-label')].map(el => el.textContent);
  assert.equal(labels[0], 'P2');
  assert.equal(labels[1], 'P1');
});

test('skMoveFavPad: ignore un déplacement qui sortirait de la grille (ex: "left" en 1ère colonne)', () => {
  const win = loadDomEnv();
  pinNames(win, 8);
  win.skBuildFavBar();
  win.skMoveFavPad('P1', 'left'); // P1 est déjà en position 0 (colonne 0) → no-op attendu
  const bar = win.document.getElementById('sk-fav-bar');
  const labels = [...bar.querySelectorAll('.sk-fav-chip:not(.sk-fav-chip-empty) .sk-fav-chip-label')].map(el => el.textContent);
  assert.equal(labels[0], 'P1');
});
