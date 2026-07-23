'use strict';
// Reproduit la logique de `_debugFillGroup100()` (index.html) : coche dans state.progress
// toutes les combinaisons attendues par getGroupPct() pour amener un groupe à 100%.
// Dupliquée ici volontairement plutôt qu'importée (index.html n'est pas un module JS
// chargeable) — voir test/levels.test.js pour le test qui vérifie que ça correspond bien
// au calcul réel de getGroupPct().
function fillGroupProgress(env, groupKey) {
  const { PATTERNS, TEMPOS, INTERPS, getLightModeVersionTabs, getLightModeFormeTabs, getLightModeInterps, getProgressKey, state } = env;
  const pats = PATTERNS.filter(p => p.cat + 'P' + p.num === groupKey);
  pats.forEach(p => {
    if (p.hasDirectionTabs && p.versionTabs && p.formeTabs) {
      const versionsToUse = getLightModeVersionTabs(p);
      const formesToUse = getLightModeFormeTabs(p);
      const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
      versionsToUse.forEach(vk => {
        formesToUse.forEach(fk => {
          const progressId = p.id + '__' + vk + '_' + fk;
          interpsToUse.forEach(i => TEMPOS.forEach(t => {
            state.progress[getProgressKey(progressId, 1, 'U', i, t)] = true;
          }));
        });
      });
    } else if (p.special && p.hasDirectionTabs && p.directions) {
      const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
      Object.keys(p.directions).forEach(dirKey => {
        const progressId = p.id + '__' + dirKey.replace(/[→↔]/g, '-');
        interpsToUse.forEach(i => TEMPOS.forEach(t => {
          state.progress[getProgressKey(progressId, 1, 'U', i, t)] = true;
        }));
      });
    } else if (p.dir) {
      const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
      interpsToUse.forEach(i => TEMPOS.forEach(t => {
        state.progress[getProgressKey(p.id, 1, p.dir, i, t)] = true;
      }));
    }
  });
}

module.exports = { fillGroupProgress };
