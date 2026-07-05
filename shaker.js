// ─── SHAKER ───────────────────────────────────────────────────────────────────
// Séquenceur pas-à-pas intégré à DicoPattern (v4)
// Dépendances : data.js (PATTERNS), audio.js (PREVIEW, HCTRL, previewCtx,
//               previewStop, pluckNote, startClickLoop, startPulseTicker,
//               stopPulseTicker, metroStop), state.js (SETTINGS)
// ─────────────────────────────────────────────────────────────────────────────

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const SK_DISPLAY_ORDER  = ['e','B','G','D','A','E'];
const SK_STRING_OPTIONS = ['e','B','G','D','A','E'];
const SK_OPEN_FREQS     = { E:82.41, A:110.0, D:146.83, G:196.0, B:246.94, e:329.63 };
const SK_MAX_STEPS      = 60;
const SK_DURATION_MULT  = { '1/4':1, '1/8':0.5, '1/16':0.25, '1/8t':1/3, '6:16':1/6 };
const SK_DURATION_DW    = { '1/4':4, '1/8':3, '1/16':2, '1/8t':3, '6:16':1 };  // tirets avant chaque chiffre
const SK_REST_TAB_WIDTH = 4;
const SK_PRESETS_KEY    = 'shaker_presets';

// ── ÉTAT ──────────────────────────────────────────────────────────────────────
let skSteps           = [];
let skLastAssignments = [];
let skPlayMode        = 'strict';
let skPatronOffset    = 1;
let skLoopTimer       = null;
let skIsPlaying       = false;
let skOpenStep        = -1;  // index de l'accordéon ouvert (-1 = aucun)
let skSeqCollapsed    = false;

// ── DONNÉES PATTERNS ──────────────────────────────────────────────────────────
function skBuildPatGroups() {
  const groups = {};
  PATTERNS.forEach(p => {
    if (!p.cat || !p.cat.match(/^A\d/)) return;
    const key = p.cat + 'P' + p.num;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  return groups;
}
const SK_PAT_GROUPS = skBuildPatGroups();
const SK_PAT_KEYS   = Object.keys(SK_PAT_GROUPS).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));

function skGetBasePat(key) {
  const pats = SK_PAT_GROUPS[key];
  if (!pats) return null;
  return pats.find(p => p.hasDirectionTabs) ||
         pats.find(p => !p.dir || p.dir === 'U') ||
         pats[0];
}

function skGetFormes(key) {
  const base = skGetBasePat(key);
  if (!base) return ['standard'];
  return base.formeTabs && base.formeTabs.length ? base.formeTabs : ['standard'];
}

function skParseNotesFromTab(tabStr) {
  if (!tabStr) return [];
  const mainSection = tabStr.split(/\n?↩/)[0];
  const lines = mainSection.split('\n');
  const dLine = lines.find(l => /^D\s*\|/.test(l.trim()));
  if (!dLine) return [];
  const content = dLine.replace(/^D\s*\|/, '').replace(/\|+$/, '').replace(/[o]+/g, '');
  const matches = content.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

function skGetNotes(key, forme, dir) {
  const pats = SK_PAT_GROUPS[key];
  if (!pats || !pats.length) return [];
  const consolidated = pats.find(p => p.hasDirectionTabs);
  if (consolidated && consolidated.directions) {
    const tabKey = dir + '|' + forme;
    let tabStr = consolidated.directions[tabKey];
    if (!tabStr) {
      const fallbackKey = Object.keys(consolidated.directions).find(k => k.endsWith('|' + forme));
      tabStr = fallbackKey ? consolidated.directions[fallbackKey] : null;
    }
    if (!tabStr) tabStr = consolidated.directions[Object.keys(consolidated.directions)[0]];
    return skParseNotesFromTab(tabStr);
  }
  const dirPat = pats.find(p => p.dir === dir) || pats.find(p => p.dir === 'U') || pats[0];
  return skParseNotesFromTab(dirPat.tab || '');
}

function skTransposedNotes(notes, startFret) {
  const offset = startFret - 5;
  if (offset === 0) return notes;
  return notes.map(n => n === 0 ? 0 : Math.max(0, n + offset));
}

// ── GESTION DES PAS ───────────────────────────────────────────────────────────
function skAddStep() {
  if (skSteps.length >= SK_MAX_STEPS) return;
  skSteps.push({ string:'e', patKey:'', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' });
  skOpenStep = skSteps.length - 1;  // ouvre le nouveau pas automatiquement
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skRemoveStep(i) {
  skSteps.splice(i, 1);
  if (skOpenStep >= i) skOpenStep = Math.max(-1, skOpenStep - 1);
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skDuplicateStep(i) {
  if (skSteps.length >= SK_MAX_STEPS) return;
  skSteps.splice(i + 1, 0, { ...skSteps[i] });
  skOpenStep = i + 1;
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skMoveStep(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= skSteps.length) return;
  [skSteps[i], skSteps[j]] = [skSteps[j], skSteps[i]];
  skOpenStep = j;
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skToggleStepActive(i) {
  skSteps[i].active = !skSteps[i].active;
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skToggleStepHeader(i) {
  skOpenStep = (skOpenStep === i) ? -1 : i;
  const cards = document.querySelectorAll('.sk-step-card');
  cards.forEach((c, idx) => c.classList.toggle('open', idx === skOpenStep));
}

function skToggleMenu() {
  const menu = document.getElementById('sk-menu');
  if (menu) menu.classList.toggle('open');
}

function skSetStepString(i, val)   { skSteps[i].string   = val;   skRefreshStepSummary(i); skGenerateAndShow(); }
function skSetStepForme(i, forme)  { skSteps[i].forme     = forme; skRefreshStepSummary(i); skGenerateAndShow(); }
function skSetStepDuration(i, d)   { skSteps[i].duration  = d;     skRefreshStepSummary(i); skGenerateAndShow(); }

function skRefreshStepSummary(i) {
  const nameEl = document.querySelector(`.sk-step-card:nth-child(${i+1}) .sk-step-name`);
  if (!nameEl) return;
  const st = skSteps[i];
  const isRest  = st.patKey === 'rest';
  const isMuted = st.patKey === 'muted';
  const DUR_LABELS = { '1/4':'♩', '1/8':'♪', '1/16':'♬', '1/8t':'T3', '6:16':'⑥' };
  const dur = st.duration || '1/4';
  const patName = st.patKey || '—';
  const formeName = st.forme || '';
  nameEl.textContent = isRest
    ? `— Silence · ${DUR_LABELS[dur]||dur}`
    : isMuted
    ? `✕ Note muté · ${st.string || 'e'} · ${DUR_LABELS[dur]||dur}`
    : (patName !== '—'
        ? `${patName}${formeName ? ' / '+formeName : ''} · ${st.string} · ${st.dir==='U'?'↑':'↓'} · ${DUR_LABELS[dur]||dur}`
        : '— choisir un pattern —');
}

function skSetStepDir(i, d) {
  skSteps[i].dir = d;
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skSetStepPat(i, key) {
  if (key.startsWith('__preset__')) {
    const name = key.slice('__preset__'.length);
    const db   = skLoadPresetsV2();
    const preset = db.presets[name];
    if (!preset?.steps?.length) return;
    const incoming = preset.steps.map(s => ({ ...s }));
    const after    = skSteps.length - 1; // step courant sera remplacé
    const total    = skSteps.length - 1 + incoming.length;
    if (total > SK_MAX_STEPS) {
      alert(`Impossible d'insérer "${name}" : dépasserait la limite de ${SK_MAX_STEPS} pas (${total} nécessaires).`);
      skBuildStepsUI(true);
      return;
    }
    skSteps.splice(i, 1, ...incoming);
    skOpenStep = i;
    skBuildStepsUI(true);
    skGenerateAndShow();
    return;
  }
  skSteps[i].patKey = key;
  if (key === 'rest' || key === 'measure' || key === 'repeat-start') skSteps[i].duration = '1/4';
  else if (key === 'repeat-end') { skSteps[i].repeatCount = skSteps[i].repeatCount || 2; }
  else if (key) skSteps[i].forme = skGetFormes(key)[0] || 'standard';
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skSetRepeatCount(i, n) {
  skSteps[i].repeatCount = Math.max(2, Math.min(8, parseInt(n) || 2));
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skChangeStepFret(i, delta) {
  skSteps[i].startFret = Math.max(0, Math.min(17, (skSteps[i].startFret ?? 5) + delta));
  // Mise à jour ciblée sans rebuild complet
  const valEl = document.querySelector(`.sk-step-card:nth-child(${i+1}) .sk-stepper-val`);
  if (valEl) {
    valEl.textContent = skSteps[i].startFret;
    valEl.className = 'sk-stepper-val' + (skSteps[i].startFret !== 5 ? ' offset' : '');
  }
  skGenerateAndShow();
}

// ── UI DES PAS ────────────────────────────────────────────────────────────────
function skBuildStepsUI(keepOpen) {
  const list    = document.getElementById('sk-steps-list');
  const countEl = document.getElementById('sk-step-count');
  const addBtn  = document.getElementById('sk-add-step-btn');
  if (!list) return;

  if (countEl) countEl.textContent = skSteps.length;
  if (addBtn)  addBtn.disabled = skSteps.length >= SK_MAX_STEPS;

  if (!skSteps.length) { list.innerHTML = ''; skOpenStep = -1; return; }

  // Si l'index ouvert dépasse la liste (suppression), on ferme tout
  if (skOpenStep >= skSteps.length) skOpenStep = -1;

  const atMax = skSteps.length >= SK_MAX_STEPS;
  const DUR_LABELS = { '1/4':'♩', '1/8':'♪', '1/16':'♬', '1/8t':'T3', '6:16':'⑥' };

  list.innerHTML = skSteps.map((st, i) => {
    const isMeasure     = st.patKey === 'measure';
    const isRepeatStart = st.patKey === 'repeat-start';
    const isRepeatEnd   = st.patKey === 'repeat-end';
    const isStop        = st.patKey === 'stop';
    const isStructural  = isMeasure || isRepeatStart || isRepeatEnd || isStop;
    const isRest        = st.patKey === 'rest';
    const isMuted       = st.patKey === 'muted';
    const formes        = (!isRest && !isMuted && !isStructural && st.patKey) ? skGetFormes(st.patKey) : [];
    const dur           = st.duration || '1/4';
    const patName       = st.patKey || '—';
    const formeName     = st.forme || (formes[0] || '');
    const isOpen        = keepOpen && i === skOpenStep;
    const fretIsOffset  = st.startFret !== 5;

    const strOptions = SK_STRING_OPTIONS.map(s =>
      `<option value="${s}" ${st.string === s ? 'selected':''}>${s}</option>`
    ).join('');

    const patOptions = SK_PAT_KEYS.map(k => {
      const ff    = skGetFormes(k)[0] || 'standard';
      const notes = skGetNotes(k, ff, st.dir || 'U');
      const ns    = notes.length ? notes.map(n => '-'+n).join('')+'-' : '?';
      return `<option value="${k}" ${st.patKey === k ? 'selected':''}>${k} : ${ns}</option>`;
    }).join('');

    const pinnedPresets = (() => {
      const db = skLoadPresetsV2();
      const pinned = Object.entries(db.presets).filter(([,p]) => p.pinned);
      if (!pinned.length) return '';
      const opts = pinned.map(([name]) =>
        `<option value="__preset__${name}">★ ${name}</option>`
      ).join('');
      return `<option disabled>── Favoris ──</option>${opts}`;
    })();

    const formeOptions = formes.map(f =>
      `<option value="${f}" ${st.forme === f ? 'selected':''}>${f}</option>`
    ).join('');

    // Résumé affiché dans le header (fermé)
    const summary = isMeasure     ? `║ Mesure`
      : isRepeatStart ? `|: Renvoie début`
      : isRepeatEnd   ? `:|  Renvoie fin · ×${st.repeatCount || 2}`
      : isStop        ? `‖ Stop`
      : isRest        ? `— Silence · ${DUR_LABELS[dur]||dur}`
      : isMuted       ? `✕ Note muté · ${st.string || 'e'} · ${DUR_LABELS[dur]||dur}`
      : (patName !== '—'
          ? `${patName}${formeName ? ' / '+formeName : ''} · ${st.string} · ${st.dir==='U'?'↑':'↓'} · ${DUR_LABELS[dur]||dur}`
          : '— choisir un pattern —');

    const structClass = isRepeatStart ? ' sk-repeat-start-card'
      : isRepeatEnd ? ' sk-repeat-end-card'
      : isMeasure ? ' sk-measure-card'
      : isStop ? ' sk-stop-card'
      : isMuted ? ' sk-muted-card' : '';

    return `
<div class="sk-step-card${isOpen ? ' open' : ''}${st.active ? '' : ' inactive'}${structClass}">
  <div class="sk-step-header" onclick="skToggleStepHeader(${i})">
    <button class="sk-active-toggle ${st.active ? 'on' : ''}" onclick="event.stopPropagation();skToggleStepActive(${i})">${st.active ? 'ON' : 'OFF'}</button>
    <div class="sk-step-badge">${i+1}</div>
    <div class="sk-step-name">${summary}</div>
    <div class="sk-header-actions" onclick="event.stopPropagation()">
      <button onclick="skMoveStep(${i},-1)" ${i===0?'disabled':''} class="sk-hact-btn" title="Monter">▲</button>
      <button onclick="skMoveStep(${i},+1)" ${i===skSteps.length-1?'disabled':''} class="sk-hact-btn" title="Descendre">▼</button>
      <button onclick="skDuplicateStep(${i})" ${atMax?'disabled':''} class="sk-hact-btn" title="Dupliquer">⧉</button>
      <button onclick="skRemoveStep(${i})" class="sk-hact-btn del" title="Supprimer">✕</button>
    </div>
    <div class="sk-step-arrow">▶</div>
  </div>
  <div class="sk-step-content">
    <div class="sk-step-controls">
      ${isStructural ? `
      <div style="padding:12px 16px">
        <div class="sk-control-label" style="margin-bottom:8px">Type de pas</div>
        <select class="sk-pat-select" onchange="skSetStepPat(${i},this.value)" style="width:100%">
          <option value="measure"      ${isMeasure     ? 'selected':''}>∣ Mesure</option>
          <option value="repeat-start" ${isRepeatStart ? 'selected':''}>|: Renvoie début</option>
          <option value="repeat-end"   ${isRepeatEnd   ? 'selected':''}>:| Renvoie fin</option>
          <option value="stop"         ${isStop        ? 'selected':''}>‖ Stop</option>
        </select>
        ${isRepeatEnd ? `
        <div class="sk-control-label" style="margin-top:12px;margin-bottom:6px">Répétitions</div>
        <div class="sk-stepper">
          <button onclick="skSetRepeatCount(${i},${(st.repeatCount||2)-1})">−</button>
          <span class="sk-stepper-val">×${st.repeatCount || 2}</span>
          <button onclick="skSetRepeatCount(${i},${(st.repeatCount||2)+1})">+</button>
        </div>` : ''}
      </div>
      ` : `
      <div class="sk-control-row">
        <div class="sk-ctrl-block" style="flex:1">
          <div class="sk-control-label">Pattern</div>
          <select class="sk-pat-select" onchange="skSetStepPat(${i},this.value)">
            <option value="" ${!st.patKey && !isRest && !isStructural ? 'selected':''}>— choisir —</option>
            <option value="rest"         ${isRest        ? 'selected':''}>— Silence</option>
            <option value="muted"        ${isMuted       ? 'selected':''}>✕ Note muté</option>
            <option value="measure"      ${isMeasure     ? 'selected':''}>∣ Mesure</option>
            <option value="repeat-start" ${isRepeatStart ? 'selected':''}>|: Renvoie début</option>
            <option value="repeat-end"   ${isRepeatEnd   ? 'selected':''}>:| Renvoie fin</option>
            <option value="stop"         ${isStop        ? 'selected':''}>‖ Stop</option>
            ${patOptions}
            ${pinnedPresets}
          </select>
        </div>
        ${(isRest || isMuted) ? `
        <div class="sk-ctrl-block" style="flex:0 0 auto">
          <div class="sk-control-label">Durée</div>
          <select class="sk-dur-select" onchange="skSetStepDuration(${i},this.value)">
            <option value="1/4"  ${dur==='1/4'  ? 'selected':''}>♩ Noire</option>
            <option value="1/8"  ${dur==='1/8'  ? 'selected':''}>♪ Croche</option>
            <option value="1/16" ${dur==='1/16' ? 'selected':''}>♬ D.croche</option>
            <option value="1/8t" ${dur==='1/8t' ? 'selected':''}>T Triolet</option>
            <option value="6:16" ${dur==='6:16' ? 'selected':''}>⑥ Sextolet</option>
          </select>
        </div>` : `
        <div class="sk-ctrl-block" style="flex:0 0 auto">
          <div class="sk-control-label">Fret <span style="color:var(--text2);font-weight:400">(déf.5)</span></div>
          <div class="sk-stepper">
            <button onclick="skChangeStepFret(${i},-1)">−</button>
            <span class="sk-stepper-val ${fretIsOffset ? 'offset' : ''}">${st.startFret}</span>
            <button onclick="skChangeStepFret(${i},+1)">+</button>
          </div>
        </div>`}
      </div>

      ${isMuted ? `
      <div class="sk-control-row">
        <div class="sk-ctrl-block">
          <div class="sk-control-label">Corde</div>
          <select class="sk-str-select" onchange="skSetStepString(${i},this.value)">${strOptions}</select>
        </div>
      </div>
      ` : ''}
      ${(!isRest && !isMuted) ? `
      <div class="sk-control-row">
        <div class="sk-ctrl-block">
          <div class="sk-control-label">Corde de départ</div>
          <select class="sk-str-select" onchange="skSetStepString(${i},this.value)">${strOptions}</select>
        </div>
        <div class="sk-ctrl-block">
          <div class="sk-control-label">Forme</div>
          <select class="sk-forme-select" onchange="skSetStepForme(${i},this.value)">${formeOptions}</select>
        </div>
      </div>

      <div class="sk-control-row">
        <div class="sk-ctrl-block">
          <div class="sk-control-label">Direction</div>
          <div class="sk-dir-btns">
            <button onclick="skSetStepDir(${i},'U')" class="${st.dir!=='D'?'active-U':''}">↑ Mont.</button>
            <button onclick="skSetStepDir(${i},'D')" class="${st.dir==='D'?'active-D':''}">↓ Desc.</button>
          </div>
        </div>
        <div class="sk-ctrl-block">
          <div class="sk-control-label">Durée</div>
          <select class="sk-dur-select" onchange="skSetStepDuration(${i},this.value)">
            <option value="1/4"  ${dur==='1/4'  ? 'selected':''}>♩ Noire</option>
            <option value="1/8"  ${dur==='1/8'  ? 'selected':''}>♪ Croche</option>
            <option value="1/16" ${dur==='1/16' ? 'selected':''}>♬ D.croche</option>
            <option value="1/8t" ${dur==='1/8t' ? 'selected':''}>T Triolet</option>
            <option value="6:16" ${dur==='6:16' ? 'selected':''}>⑥ Sextolet</option>
          </select>
        </div>
      </div>
      ` : ''}
      `}

    </div>
  </div>
</div>`;
  }).join('');
}

// ── ASSIGNATIONS ──────────────────────────────────────────────────────────────
function skBuildAssignments() {
  return skSteps.map(st => {
    if (!st.active) return null;
    if (st.patKey === 'measure')       return { isMeasure: true };
    if (st.patKey === 'repeat-start')  return { isRepeatStart: true };
    if (st.patKey === 'repeat-end')    return { isRepeatEnd: true, repeatCount: st.repeatCount || 2 };
    if (st.patKey === 'stop')          return { isStop: true };
    if (st.patKey === 'rest') {
      return { string:null, notes:[], isRest:true, duration: st.duration || '1/4' };
    }
    if (st.patKey === 'muted') {
      return { string: st.string || 'e', notes:[], isMuted:true, duration: st.duration || '1/16' };
    }
    if (!st.patKey) return null;
    const forme = st.forme || 'standard';
    const raw   = skGetNotes(st.patKey, forme, st.dir || 'U');
    if (!raw.length) return null;
    const neckOff = (SETTINGS.neckPosition === 'high') ? 12 : 0;
    return { string: st.string, notes: skTransposedNotes(raw, (st.startFret ?? 5) + neckOff), duration: st.duration || '1/4' };
  }).filter(Boolean);
}

// Déplie les reprises pour l'audio (les marqueurs de mesure sont ignorés dans skToTimedEvents)
function skExpandRepeats(assignments) {
  const result = [];
  let i = 0;
  while (i < assignments.length) {
    const a = assignments[i];
    if (a.isRepeatStart) {
      let endIdx = -1;
      for (let j = i + 1; j < assignments.length; j++) {
        if (assignments[j].isRepeatEnd) { endIdx = j; break; }
      }
      if (endIdx === -1) { i++; continue; }
      const count = assignments[endIdx].repeatCount || 2;
      const section = assignments.slice(i + 1, endIdx);
      for (let r = 0; r < count; r++) result.push(...section);
      i = endIdx + 1;
    } else if (a.isRepeatEnd) {
      i++; // marqueur orphelin, ignoré
    } else if (a.isStop) {
      result.push(a);
      break; // rien après le stop
    } else {
      result.push(a);
      i++;
    }
  }
  return result;
}

// ── RENDU TABLATURE ───────────────────────────────────────────────────────────
function skSplitBlocks(assignments) {
  const blocks = [];
  let steps = [];
  assignments.forEach(a => {
    if (a.isMeasure) {
      if (steps.length) blocks.push({ steps, repeatCount: null });
      steps = [];
    } else if (a.isRepeatStart) {
      if (steps.length) blocks.push({ steps, repeatCount: null });
      steps = [];
    } else if (a.isRepeatEnd) {
      if (steps.length) blocks.push({ steps, repeatCount: a.repeatCount || 2 });
      steps = [];
    } else if (a.isStop) {
      if (steps.length) blocks.push({ steps, repeatCount: null, isStop: true });
      steps = [];
    } else {
      steps.push(a);
    }
  });
  if (steps.length) blocks.push({ steps, repeatCount: null });
  return blocks.length ? blocks : [{ steps: [], repeatCount: null }];
}

function skRenderBlock({ steps, repeatCount, isStop }) {
  const stepWidths = steps.map(a => {
    const dw = SK_DURATION_DW[a.duration || '1/4'] ?? 2;
    const contentW = a.isRest ? dw + 2 :
      a.isMuted ? dw + 1 :
      a.notes.reduce((sum, n) => sum + dw + String(n).length, 0);
    return contentW;
  });
  let pos = 0;
  const stepStarts = stepWidths.map(w => { const s = pos; pos += w; return s; });
  const totalWidth = pos;
  const pre  = repeatCount ? '|:' : ' |';
  const post = repeatCount ? ':|' : isStop ? '‖' : '|';
  const lines = SK_DISPLAY_ORDER.map(s => {
    const chars = Array(totalWidth).fill('-');
    steps.forEach((a, i) => {
      if (a.isRest) return;
      const dw = SK_DURATION_DW[a.duration || '1/4'] ?? 2;
      const dash = '-'.repeat(dw);
      if (a.isMuted && a.string === s) {
        (dash + 'X').split('').forEach((c, j) => { chars[stepStarts[i] + j] = c; });
        return;
      }
      if (a.string !== s) return;
      a.notes.map(n => dash + n).join('').split('').forEach((c, j) => {
        chars[stepStarts[i] + j] = c;
      });
    });
    return `${s} ${pre}${chars.join('')}${post}`;
  });
  if (repeatCount) lines.push(`    ×${repeatCount}`);
  return lines.join('\n');
}

function skRenderStepCascade(assignments) {
  return skSplitBlocks(assignments).map(skRenderBlock).join('\n\n');
}

// ── MESURE 2 ──────────────────────────────────────────────────────────────────
function skIsStructural(a) { return a.isMeasure || a.isRepeatStart || a.isRepeatEnd || a.isStop; }

function skMirrorOf(assignments) {
  // Les repeatCounts sont sur les isRepeatEnd ; après inversion ils doivent
  // migrer vers les nouveaux isRepeatEnd (anciens isRepeatStart), en ordre inverse.
  const repeatCounts = assignments.filter(a => a.isRepeatEnd).map(a => a.repeatCount || 2);
  let rcIdx = repeatCounts.length - 1;
  return assignments.slice().reverse().map(a => {
    if (a.isRepeatEnd)   return { isRepeatStart: true };
    if (a.isRepeatStart) return { isRepeatEnd: true, repeatCount: repeatCounts[rcIdx--] || 2 };
    if (skIsStructural(a)) return { ...a };
    if (a.isRest) return { ...a };
    return { ...a, notes: [...a.notes].reverse() };
  });
}

function skBuildMeasure2(assignments) {
  if (skPlayMode === 'strict' || skPlayMode === 'mirror') return null;
  if (skPlayMode === 'inverse') return skMirrorOf(assignments);
  return assignments.map(a =>
    skIsStructural(a) ? { ...a } : a.isRest ? { ...a } : { ...a, notes: a.notes.map(n => n === 0 ? 0 : n + skPatronOffset) }
  );
}

function skModeLabel2() {
  if (skPlayMode === 'strict' || skPlayMode === 'mirror') return null;
  if (skPlayMode === 'inverse') return 'Mesure 2 — retour inversé';
  return `Mesure 2 — retour +${skPatronOffset}`;
}

// ── GÉNÉRATION & AFFICHAGE ────────────────────────────────────────────────────
function skGenerateAndShow() {
  const assignments = skBuildAssignments();
  const wrap = document.getElementById('sk-tab-wrap');
  if (!wrap) return;

  if (!assignments.length) {
    wrap.innerHTML = `<div class="sk-tab-display"><div class="sk-empty-state">Ajoute et configure au moins un pas pour voir la tablature</div></div>`;
    skLastAssignments = [];
    skUpdateInfoBar([]);
    return;
  }

  const displayAssignments = skPlayMode === 'mirror' ? skMirrorOf(assignments) : assignments;
  skLastAssignments = displayAssignments;

  const noteCount = displayAssignments.filter(a => !a.isRest && !skIsStructural(a)).reduce((s,a) => s + a.notes.length, 0);
  const m2 = skBuildMeasure2(assignments);

  const presetTag = skCurrentPreset
    ? `<span class="sk-tab-preset-name">${skCurrentPreset}</span>`
    : '';

  const withArrows = raw => (typeof tabWithSymbols === 'function')
    ? tabWithSymbols(raw, PREVIEW.interp, {})
    : raw;

  const renderMeasureBlocks = (asgn, mIdx) =>
    skSplitBlocks(asgn).map((block, bi) => `
    <div class="sk-tab-display${bi > 0 ? ' sk-tab-block-sep' : ''}${block.repeatCount ? ' sk-tab-repeat-block' : ''}">
      <div class="sk-tab-cursor" id="sk-cursor-${mIdx}-${bi}"></div>
      <pre id="sk-tab-pre-${mIdx}-${bi}">${withArrows(skRenderBlock(block))}</pre>
    </div>`).join('');

  let html = `
    <div class="sk-tab-measure-header">${presetTag}</div>
    ${renderMeasureBlocks(displayAssignments, 1)}`;

  if (m2) {
    html += `
    <div class="sk-tab-sep"></div>
    <div class="sk-tab-measure-header">${skModeLabel2()}</div>
    ${renderMeasureBlocks(m2, 2)}`;
  }

  html += `<div class="sk-tab-overlay" id="sk-tab-overlay"><div class="sk-tab-overlay-icon" id="sk-tab-overlay-icon">▶</div></div>`;

  wrap.innerHTML = html;
  wrap.onclick = () => skTabWrapClick();
  skUpdateInfoBar(assignments);
}

function skTabWrapClick() {
  if (skIsPlaying) {
    stopShaker();
    skFlashTabOverlay('■');
  } else {
    playShaker();
    skFlashTabOverlay('▶');
  }
}

function skFlashTabOverlay(icon) {
  const el  = document.getElementById('sk-tab-overlay');
  const ico = document.getElementById('sk-tab-overlay-icon');
  if (!el || !ico) return;
  ico.textContent = icon;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 400);
}

function skUpdateInfoBar(assignments) {
  const bar = document.getElementById('sk-info-bar');
  if (!bar) return;
  if (!assignments.length) { bar.innerHTML = ''; return; }
  const noteSteps    = assignments.filter(a => !a.isRest && !skIsStructural(a));
  const restSteps    = assignments.filter(a => a.isRest);
  const measureSteps = assignments.filter(a => a.isMeasure);
  const noteCount = noteSteps.reduce((s, a) => s + a.notes.length, 0);
  const inactive  = skSteps.filter(s => !s.active).length;
  const soundAssignments = assignments.filter(a => !skIsStructural(a));
  const durations = new Set(soundAssignments.map(a => a.duration));
  const durLabels = { '1/4':'noires', '1/8':'croches', '1/16':'double-croches', '1/8t':'triolets', '6:16':'sextolets' };
  const durText   = durations.size === 1 ? ' · ' + (durLabels[soundAssignments[0]?.duration] || '') : ' · mixte';
  let html = `<span class="sk-info-chip ok">${noteSteps.length} pas · ${noteCount} notes${durText}</span>`;
  if (restSteps.length) html += `<span class="sk-info-chip rest">${restSteps.length} silence${restSteps.length > 1 ? 's':''}</span>`;
  if (measureSteps.length) html += `<span class="sk-info-chip rest">${measureSteps.length} mesure${measureSteps.length > 1 ? 's':''}</span>`;
  if (inactive)         html += `<span class="sk-info-chip warn">${inactive} inactif${inactive > 1 ? 's':''}</span>`;
  bar.innerHTML = html;
}

// ── MODE DE LECTURE ────────────────────────────────────────────────────────────
function skSetPlayMode(m) {
  if (skIsPlaying) stopShaker();
  skPlayMode = m;
  document.querySelectorAll('#sk-mode-seg button').forEach(b =>
    b.classList.toggle('active', b.classList.contains('sk-mode-' + m))
  );
  const ctrl = document.getElementById('sk-patron-offset-ctrl');
  if (ctrl) ctrl.style.display = m === 'patron' ? 'flex' : 'none';
  skGenerateAndShow();
  skRenderProgTable(skCurrentPreset);
}

function skChangePatronOffset(delta) {
  skPatronOffset = Math.max(1, Math.min(5, skPatronOffset + delta));
  const el = document.getElementById('sk-patron-offset-val');
  if (el) el.textContent = '+' + skPatronOffset;
  skGenerateAndShow();
}

// ── RESET ─────────────────────────────────────────────────────────────────────
function skClearAll() {
  stopShaker();
  skSteps = [];
  skLastAssignments = [];
  skOpenStep = -1;
  skCurrentPreset = '';
  skBuildStepsUI();
  skGenerateAndShow();
  skBuildPresetSelect();
  skRenderProgTable('');
  const panel = document.getElementById('sk-global-panel');
  const btn   = document.getElementById('sk-global-edit-btn');
  if (panel) panel.classList.remove('open');
  if (btn)   btn.style.background = '';
}

// ── ÉDITION GLOBALE ───────────────────────────────────────────────────────────
function skToggleSeqCollapse() {
  skSeqCollapsed = !skSeqCollapsed;
  const body    = document.getElementById('sk-seq-body');
  const chevron = document.getElementById('sk-seq-chevron');
  if (body)    body.style.display    = skSeqCollapsed ? 'none' : 'block';
  if (chevron) chevron.textContent   = skSeqCollapsed ? '▶' : '▼';
  if (skSeqCollapsed) {
    const panel = document.getElementById('sk-global-panel');
    const btn   = document.getElementById('sk-global-edit-btn');
    if (panel && panel.classList.contains('open')) {
      panel.classList.remove('open');
      if (btn) btn.style.background = '';
    }
  }
}

function skToggleGlobalPanel() {
  const panel = document.getElementById('sk-global-panel');
  const btn   = document.getElementById('sk-global-edit-btn');
  if (!panel) return;
  const open = panel.classList.toggle('open');
  if (btn) btn.style.background = open ? 'var(--orange)' : '';
  if (open) skUpdateGlobalDurButtons();
}

function skUpdateGlobalDurButtons() {
  if (!skSteps.length) return;
  const durations = new Set(skSteps.map(s => s.duration || '1/4'));
  const common = durations.size === 1 ? [...durations][0] : null;
  document.querySelectorAll('.sk-global-dur-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dur === common);
  });
}

function skApplyGlobalDuration(dur) {
  if (!skSteps.length) return;
  skSteps.forEach(s => { s.duration = dur; });
  skUpdateGlobalDurButtons();
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skShiftAllFrets(delta) {
  if (!skSteps.length) return;
  skSteps.forEach(s => {
    s.startFret = Math.max(0, Math.min(17, (s.startFret ?? 5) + delta));
  });
  skBuildStepsUI(true);
  skGenerateAndShow();
}

// ── AUDIO ─────────────────────────────────────────────────────────────────────
function skFretFreq(string, fret) {
  return (SK_OPEN_FREQS[string] || SK_OPEN_FREQS.e) * Math.pow(2, fret / 12);
}

function skMutedChunk(ctx, masterGain, time) {
  const dur = 0.045;
  const bufSize = Math.ceil(ctx.sampleRate * dur);
  const buf  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const bp  = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 700;
  bp.Q.value = 1.8;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(1.2, time + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  src.connect(bp); bp.connect(env); env.connect(masterGain);
  src.start(time); src.stop(time + dur + 0.01);
  const msUntilClean = Math.max(300, (time - ctx.currentTime + dur + 0.05) * 1000);
  setTimeout(() => { try { src.disconnect(); bp.disconnect(); env.disconnect(); } catch(e){} }, msUntilClean);
}

function skToTimedEvents(arr, baseNoteDur) {
  let t = 0;
  let globalIdx = 0; // index global pour le shuffle inter-pas
  const events = [];
  let hasStop = false;
  for (const a of arr) {
    if (a.isStop) { hasStop = true; break; }
    if (skIsStructural(a)) continue; // séparateurs visuels uniquement, pas de son
    const mult = SK_DURATION_MULT[a.duration || '1/4'];
    const nd   = baseNoteDur * mult;
    if (a.isMuted) {
      events.push({ isMuted: true, string: a.string, startTime: t, dur: nd });
      globalIdx += 1;
      t += nd;
    } else if (!a.isRest && a.notes.length) {
      a.notes.forEach((n, j) => {
        const g = globalIdx + j;
        // Nudge basé sur la position globale : note impaire (g%2===1) = swinguée de 0.34×nd
        const nudge = SETTINGS.shuffleMode && (g % 2 === 1) ? (2 * 0.67 - 1) * nd : 0;
        events.push({ string: a.string, fret: n, startTime: t + j * nd + nudge, dur: nd });
      });
      globalIdx += a.notes.length;
      t += a.notes.length * nd;
    } else {
      globalIdx += 1;
      t += nd;
    }
  }
  return { events, totalTime: t, hasStop };
}

function playShaker() {
  if (!skLastAssignments.length) {
    skGenerateAndShow();
    if (!skLastAssignments.length) return;
  }

  // Stopper l'audio existant
  stopShaker();
  if (typeof metroStop === 'function') metroStop(false);

  // Trainer : repartir du BPM de départ
  if (SETTINGS.trainMode) {
    HCTRL.bpm = SETTINGS.trainBpmStart;
    const hbpm = document.getElementById('header-bpm-val');
    if (hbpm) hbpm.textContent = HCTRL.bpm;
  }

  const ctx = previewCtx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = (SETTINGS.patVolume || 75) * 0.02;
  masterGain.connect(ctx.destination);

  PREVIEW.masterGain = masterGain;
  PREVIEW.patId      = '__shaker__';
  PREVIEW.bpm        = HCTRL.bpm;
  PREVIEW.clickNotes = SETTINGS.clickSubdiv || 4;
  skIsPlaying        = true;

  // Journal + streak : chaque lancement de lecture Labo compte comme une session
  addLaboJournalEntry(skCurrentPreset, HCTRL.bpm, SETTINGS.trainMode, SETTINGS.trainPyramide, SETTINGS.shuffleMode);

  const m2    = skBuildMeasure2(skLastAssignments);
  const m1exp = skExpandRepeats(skLastAssignments);
  const m2exp = m2 ? skExpandRepeats(m2) : null;
  const seq   = [...m1exp, ...(m2exp || [])];

  let quarter   = 60.0 / HCTRL.bpm;
  let { events, totalTime, hasStop } = skToTimedEvents(seq, quarter);

  // Décompte (-4) si activé
  const countInQuarter = HCTRL.bpm < 60 ? quarter / 2 : quarter;
  const t0             = ctx.currentTime + 0.1;

  if (PREVIEW.countIn) {
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * countInQuarter;
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.connect(g); g.connect(masterGain);
      osc.frequency.value = i === 0 ? 1100 : 880;
      const cv = (SETTINGS.clickVolume || 60) * 0.006;
      g.gain.setValueAtTime(cv, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.start(t); osc.stop(t + 0.05);
    }
  }

  const patStart = t0 + (PREVIEW.countIn ? 4 * countInQuarter : 0);

  // Trainer — état local de la boucle
  let trainLoopCount = 0;
  let trainPhase = 1; // 1 = montée, -1 = descente (pyramide)
  // BPM pré-calculé pour le prochain cycle audio (distinct de PREVIEW.bpm qui suit le cycle en cours)
  let nextScheduledBpm = HCTRL.bpm;

  // Boucle principale
  let loopStart = patStart;
  PREVIEW.audioCycleBpm = HCTRL.bpm;
  const scheduleLoop = () => {
    if (!skIsPlaying || PREVIEW.patId !== '__shaker__') return;

    // BPM de ce cycle = ce qui avait été pré-calculé au cycle précédent
    PREVIEW.audioCycleBpm = nextScheduledBpm;

    events.forEach(e => {
      if (e.isMuted) {
        skMutedChunk(ctx, masterGain, loopStart + e.startTime);
      } else if (typeof pluckNote === 'function') {
        pluckNote(ctx, masterGain, skFretFreq(e.string, e.fret), loopStart + e.startTime);
      }
    });

    loopStart += totalTime;
    trainLoopCount++;

    // ── Trainer : incrément BPM en fin de boucle ──────────────────────
    if (SETTINGS.trainMode && trainLoopCount % SETTINGS.trainLoopEvery === 0) {
      const oldBpm = HCTRL.bpm;
      let newBpm = oldBpm;
      if (SETTINGS.trainPyramide) {
        if (trainPhase === 1) {
          newBpm = Math.min(oldBpm + SETTINGS.trainBpmStep, SETTINGS.trainBpmMax);
          if (newBpm >= SETTINGS.trainBpmMax) trainPhase = -1;
        } else {
          newBpm = Math.max(oldBpm - SETTINGS.trainBpmStep, SETTINGS.trainBpmStart);
          if (newBpm <= SETTINGS.trainBpmStart) trainPhase = 1;
        }
      } else {
        newBpm = Math.min(oldBpm + SETTINGS.trainBpmStep, SETTINGS.trainBpmMax);
      }
      if (newBpm !== oldBpm) {
        HCTRL.bpm = newBpm;
        nextScheduledBpm = newBpm; // sera appliqué au cycle suivant
        // PREVIEW.bpm, header et pastille mis à jour au début du prochain cycle
        // pour rester synchronisés avec l'audio en cours
        const nextCycleStart = loopStart; // loopStart a déjà été avancé au prochain cycle
        const displayDelay = Math.max(0, (nextCycleStart - ctx.currentTime) * 1000);
        setTimeout(() => {
          if (!skIsPlaying) return;
          PREVIEW.bpm = newBpm;
          const hbpm = document.getElementById('header-bpm-val');
          if (hbpm) {
            hbpm.textContent = newBpm;
            hbpm.style.color = newBpm >= SETTINGS.trainBpmMax ? '#ef5350' : '#4dd0e1';
          }
          // Re-ancrer la pastille sur le nouveau cycle pour éviter la dérive accumulée
          if (typeof startPulseTicker === 'function') startPulseTicker(nextCycleStart);
        }, displayDelay);
        // Pré-calculer les timings audio pour le prochain cycle au nouveau BPM
        quarter   = 60.0 / newBpm;
        ({ events, totalTime, hasStop } = skToTimedEvents(seq, quarter));
      }
    }

    if (hasStop) {
      skLoopTimer = setTimeout(() => stopShaker(), Math.max(0, (loopStart - ctx.currentTime) * 1000));
      return;
    }

    const delay = Math.max(0, (loopStart - ctx.currentTime - 0.15) * 1000);
    skLoopTimer = setTimeout(scheduleLoop, delay);
  };
  // Clic + pulse header — avant scheduleLoop pour éviter que le trainer ne change PREVIEW.bpm avant init
  if (PREVIEW.click && typeof startClickLoop === 'function') startClickLoop(patStart);
  if (typeof startPulseTicker === 'function') startPulseTicker(patStart);

  // Curseur de lecture — idem, avant scheduleLoop
  skStartCursor(events, totalTime, patStart, ctx);

  scheduleLoop();
}

function skStartCursor(eventsIgnored, totalTimeIgnored, patStart, ctx) {
  (PREVIEW.cursorTimeouts || []).forEach(t => clearTimeout(t));
  PREVIEW.cursorTimeouts = [];

  const quarter = 60 / PREVIEW.bpm;

  // Déplie les reprises pour l'audio ; les mesures sont ignorées dans skToTimedEvents
  const m1 = skLastAssignments;
  const m2 = skBuildMeasure2(m1);
  const m1exp = skExpandRepeats(m1);
  const m2exp = m2 ? skExpandRepeats(m2) : null;
  const { events: ev1, totalTime: dur1 } = skToTimedEvents(m1exp, quarter);
  const { events: ev2, totalTime: dur2 } = m2exp ? skToTimedEvents(m2exp, quarter) : { events: [], totalTime: 0 };
  const loopDur = dur1 + dur2;

  // Construit les positions curseur par bloc visuel, en répétant les notes pour chaque reprise
  function buildCols(assignments, mIdx) {
    const cols = [];
    skSplitBlocks(assignments).forEach((block, bi) => {
      const preId = `sk-tab-pre-${mIdx}-${bi}`;
      const curId = `sk-cursor-${mIdx}-${bi}`;
      const reps  = block.repeatCount || 1;
      const stepWidths = block.steps.map(a => {
        const dw = SK_DURATION_DW[a.duration || '1/4'] ?? 2;
        const contentW = a.isRest ? dw + 2 :
          a.isMuted ? dw + 1 :
          a.notes.reduce((sum, n) => sum + dw + String(n).length, 0);
        return contentW;
      });
      let p = 0;
      const stepStarts = stepWidths.map(w => { const s = p; p += w; return s; });
      for (let r = 0; r < reps; r++) {
        block.steps.forEach((a, i) => {
          if (a.isRest) return;
          const dw = SK_DURATION_DW[a.duration || '1/4'] ?? 2;
          if (a.isMuted) {
            cols.push({ col: 3 + stepStarts[i] + dw, preId, curId });
            return;
          }
          if (!a.notes.length) return;
          let noteCharPos = 0;
          a.notes.forEach(n => {
            cols.push({ col: 3 + stepStarts[i] + noteCharPos + dw, preId, curId });
            noteCharPos += dw + String(n).length;
          });
        });
      }
    });
    return cols;
  }

  function measureCharWidth(preEl) {
    const cs = getComputedStyle(preEl);
    const tmp = document.createElement('span');
    tmp.style.cssText = `position:absolute;visibility:hidden;font-family:${cs.fontFamily};font-size:${cs.fontSize}`;
    tmp.textContent = 'X';
    document.body.appendChild(tmp);
    const w = tmp.offsetWidth || 8;
    tmp.remove();
    return w;
  }

  // Un seul cycle global : m1 puis m2 (si existe), en boucle
  // Combine tous les steps dans une timeline plate
  function buildTimeline(ev, cols, timeOffset) {
    if (!cols.length) return [];
    return ev.map((e, i) => {
      const c = cols[i] ?? cols[cols.length - 1];
      return { time: timeOffset + e.startTime, col: c.col, preId: c.preId, curId: c.curId };
    });
  }

  const cols1 = buildCols(m1, 1);
  const cols2 = m2 ? buildCols(m2, 2) : [];

  if (!cols1.length && !cols2.length) return;

  function scheduleCycle(t0) {
    if (!skIsPlaying || PREVIEW.patId !== '__shaker__') return;

    // Utiliser le BPM du cycle audio en cours (pas le BPM courant qui peut déjà être à jour)
    const q = 60 / (PREVIEW.audioCycleBpm || PREVIEW.bpm);
    const { events: ev1c, totalTime: d1c, hasStop: stop1 } = skToTimedEvents(skExpandRepeats(m1), q);
    const { events: ev2c, totalTime: d2c, hasStop: stop2 } = m2exp ? skToTimedEvents(skExpandRepeats(m2), q) : { events: [], totalTime: 0, hasStop: false };
    const cycleHasStop = stop1 || stop2;
    const currentLoopDur = d1c + d2c;
    const tl1 = buildTimeline(ev1c, cols1, 0);
    const tl2 = buildTimeline(ev2c, cols2, d1c);
    const fullTimeline = [...tl1, ...tl2];

    fullTimeline.forEach(step => {
      const mIdx = step.curId.startsWith('sk-cursor-1') ? 1 : 2;
      const otherMIdx = mIdx === 1 ? 2 : 1;
      const delay = Math.max(0, (t0 + step.time - ctx.currentTime) * 1000);
      const tid = setTimeout(() => {
        if (!skIsPlaying) return;
        const preEl = document.getElementById(step.preId);
        const curEl = document.getElementById(step.curId);
        if (!preEl || !curEl) return;

        // Cacher tous les curseurs de l'autre groupe
        document.querySelectorAll(`[id^="sk-cursor-${otherMIdx}-"]`).forEach(el => el.style.display = 'none');
        // Cacher les autres blocs du même groupe
        document.querySelectorAll(`[id^="sk-cursor-${mIdx}-"]`).forEach(el => { if (el !== curEl) el.style.display = 'none'; });

        const charW = measureCharWidth(preEl);
        const lineH = parseFloat(getComputedStyle(preEl).lineHeight) || 20.8;
        curEl.style.left   = (preEl.offsetLeft + step.col * charW) + 'px';
        curEl.style.top    = preEl.offsetTop + 'px';
        curEl.style.height = (6 * lineH) + 'px';
        curEl.style.display = 'block';
        curEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, delay);
      PREVIEW.cursorTimeouts.push(tid);
    });

    if (cycleHasStop) return; // pas de prochain cycle

    const nextT = t0 + currentLoopDur;
    const rt = setTimeout(() => scheduleCycle(nextT),
      Math.max(0, (nextT - ctx.currentTime - 0.05) * 1000));
    PREVIEW.cursorTimeouts.push(rt);
  }

  scheduleCycle(patStart);
}

function stopShaker() {
  skIsPlaying = false;
  if (skLoopTimer) { clearTimeout(skLoopTimer); skLoopTimer = null; }

  // Fade out du gain
  if (PREVIEW.masterGain && PREVIEW.patId === '__shaker__' && PREVIEW.ctx) {
    const t = PREVIEW.ctx.currentTime;
    const mg = PREVIEW.masterGain;
    try {
      mg.gain.cancelScheduledValues(t);
      mg.gain.setValueAtTime(mg.gain.value, t);
      mg.gain.linearRampToValueAtTime(0, t + 0.04);
      setTimeout(() => { try { mg.disconnect(); } catch(e){} }, 200);
    } catch(e) {}
    PREVIEW.masterGain = null;
    PREVIEW.patId      = null;
  }

  if (typeof stopClickLoop    === 'function') stopClickLoop();
  if (typeof stopPulseTicker  === 'function') stopPulseTicker();
  if (typeof syncHeaderPlay   === 'function') syncHeaderPlay();

  // Réinitialiser la couleur BPM si le trainer était actif
  const hbpm = document.getElementById('header-bpm-val');
  if (hbpm) hbpm.style.color = '';

  // Curseurs
  (PREVIEW.cursorTimeouts || []).forEach(t => clearTimeout(t));
  PREVIEW.cursorTimeouts = [];
  document.querySelectorAll('.sk-tab-cursor').forEach(el => { el.style.display = 'none'; });

}

// ── PRESETS ───────────────────────────────────────────────────────────────────
// ── GROUPES DE DOSSIERS (hiérarchie UI) ──────────────────────────────────────
// ── STOCKAGE PRESETS (format v2) ─────────────────────────────────────────────
// Structure : { presets: { name: { steps, folder, pinned, createdAt } }, folders: [...], groups: { groupName: [folder,...] } }
const SK_PRESETS_V2_KEY = 'shaker_presets_v2';

function skLoadPresetsV2() {
  try {
    const raw = localStorage.getItem(SK_PRESETS_V2_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (!db.groups) db.groups = {};
      return db;
    }
  } catch(e) {}
  return {
    presets: {},
    folders: ['Mes créations'],
    groups: {},
  };
}

function skGetFolderGroups() {
  return skLoadPresetsV2().groups || {};
}

function skSavePresetsV2(db) {
  localStorage.setItem(SK_PRESETS_V2_KEY, JSON.stringify(db));
}

// Compat : charge l'ancien format et migre
function skLoadPresets() {
  const db = skLoadPresetsV2();
  // retourne un objet plat { name: steps[] } pour compatibilité
  const out = {};
  Object.entries(db.presets).forEach(([n, p]) => { out[n] = p.steps; });
  return out;
}
function skSavePresetsToStorage(flat) {
  const db = skLoadPresetsV2();
  Object.entries(flat).forEach(([n, steps]) => {
    if (!db.presets[n]) db.presets[n] = { folder: 'Mes créations', pinned: false, createdAt: Date.now() };
    db.presets[n].steps = steps;
  });
  skSavePresetsV2(db);
}

// ── FAVORIS ───────────────────────────────────────────────────────────────────
const SK_MAX_PINNED = 20;

function skTogglePin(name) {
  const db = skLoadPresetsV2();
  if (!db.presets[name]) return;
  const willPin = !db.presets[name].pinned;
  if (willPin) {
    const pinnedCount = Object.values(db.presets).filter(p => p.pinned).length;
    if (pinnedCount >= SK_MAX_PINNED) {
      alert(`Limite de ${SK_MAX_PINNED} presets épinglés atteinte — désépingle-en un pour en ajouter un autre.`);
      return;
    }
  }
  db.presets[name].pinned = willPin;
  skSavePresetsV2(db);
  skBuildFavBar();
  skRefreshLibrary();
}

// ── ORDRE PERSONNALISÉ DES PRESETS (drag & drop / réorganisation) ────────────
// db.presetOrder : liste globale de noms donnant l'ordre d'affichage souhaité.
// Les presets absents de cette liste gardent leur ordre naturel (insertion), en fin.
function skSortByPresetOrder(names) {
  const db = skLoadPresetsV2();
  const order = db.presetOrder || [];
  const idx = new Map(order.map((n, i) => [n, i]));
  return names.slice().sort((a, b) => {
    const ia = idx.has(a) ? idx.get(a) : Infinity;
    const ib = idx.has(b) ? idx.get(b) : Infinity;
    return ia - ib;
  });
}

// Met à jour l'ordre global en remplaçant la position relative d'un sous-ensemble
// (ex: les items d'un seul dossier, ou juste les favoris) par leur nouvel ordre du DOM
function skUpdatePresetOrderForSubset(newSubsetOrder) {
  const db = skLoadPresetsV2();
  let order = (db.presetOrder && db.presetOrder.length) ? db.presetOrder.slice() : Object.keys(db.presets);
  Object.keys(db.presets).forEach(n => { if (!order.includes(n)) order.push(n); });
  const subsetSet = new Set(newSubsetOrder);
  let firstIdx = order.findIndex(n => subsetSet.has(n));
  if (firstIdx === -1) firstIdx = order.length;
  let insertAt = 0;
  for (let i = 0; i < firstIdx; i++) if (!subsetSet.has(order[i])) insertAt++;
  const rest = order.filter(n => !subsetSet.has(n));
  rest.splice(insertAt, 0, ...newSubsetOrder);
  db.presetOrder = rest;
  skSavePresetsV2(db);
}

// Réorganisation de la rangée 1 de la bibliothèque (dossiers + groupes mélangés) :
// applique le nouvel ordre relatif séparément à db.folders (dossiers) et aux clés de
// db.groups (groupes), sans toucher aux dossiers qui n'apparaissent pas en rangée 1
// (ex: sous-dossiers déjà rattachés à un groupe).
function skReorderRow1(newOrder) {
  const db = skLoadPresetsV2();
  const groupNamesSet = new Set(Object.keys(db.groups || {}));
  const folderTokens = newOrder.filter(t => !groupNamesSet.has(t));
  const groupTokens  = newOrder.filter(t => groupNamesSet.has(t));

  let folders = db.folders.slice();
  const folderSet = new Set(folderTokens);
  let firstIdx = folders.findIndex(f => folderSet.has(f));
  if (firstIdx === -1) firstIdx = folders.length;
  let insertAt = 0;
  for (let i = 0; i < firstIdx; i++) if (!folderSet.has(folders[i])) insertAt++;
  const rest = folders.filter(f => !folderSet.has(f));
  rest.splice(insertAt, 0, ...folderTokens);
  db.folders = rest;

  if (db.groups) {
    const newGroups = {};
    groupTokens.forEach(g => { newGroups[g] = db.groups[g]; });
    Object.keys(db.groups).forEach(g => { if (!(g in newGroups)) newGroups[g] = db.groups[g]; });
    db.groups = newGroups;
  }
  skSavePresetsV2(db);
}

// Réorganisation de la rangée 2 (sous-dossiers d'un groupe) — remplace directement
// le tableau des enfants du groupe actuellement affiché
function skReorderRow2(newOrder) {
  const activeGroup = document.getElementById('sk-lib-subfolders')?.dataset.activeGroup;
  if (!activeGroup) return;
  const db = skLoadPresetsV2();
  if (!db.groups || !db.groups[activeGroup]) return;
  db.groups[activeGroup] = newOrder;
  skSavePresetsV2(db);
}

// Réorganisation par appui long + glisser — fonctionne au doigt (tactile) et à la souris.
// Bind une seule fois par conteneur (délégation), fonctionne même après un re-render du innerHTML.
function skInitReorderable(containerId, itemSelector, groupSelector, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container || container.dataset.reorderBound) return;
  container.dataset.reorderBound = '1';

  const keyAttr   = opts.keyAttr || 'presetName';
  const onReorder = opts.onReorder || skUpdatePresetOrderForSubset;
  const horizontal = opts.horizontal ?? (container.id === 'sk-fav-bar');

  let dragEl = null, timer = null, armed = false, startX = 0, startY = 0;

  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

  const getSiblings = (scope) => scope
    ? [...scope.querySelectorAll(itemSelector)]
    : [...container.querySelectorAll(itemSelector)];

  const getDragAfter = (scope, x, y) => {
    const items = getSiblings(scope).filter(el => el !== dragEl);
    let closest = { offset: -Infinity, element: null };
    items.forEach(child => {
      const box = child.getBoundingClientRect();
      const offset = horizontal
        ? x - box.left - box.width / 2
        : y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
    });
    return closest.element;
  };

  let pointerId = null;

  container.addEventListener('pointerdown', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    startX = e.clientX; startY = e.clientY;
    armed = false;
    pointerId = e.pointerId;
    clearTimer();
    timer = setTimeout(() => {
      armed = true;
      dragEl = item;
      item.classList.add('sk-reorder-active');
      container._savedOverflow = container.style.overflow;
      container.style.overflow = 'visible';
      try { container.setPointerCapture(pointerId); } catch(e) {}
      if (navigator.vibrate) navigator.vibrate(15);
    }, 420);
  });

  container.addEventListener('pointermove', (e) => {
    if (!armed || !dragEl) {
      if (timer && (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8)) clearTimer();
      return;
    }
    e.preventDefault();
    const scope = groupSelector ? dragEl.closest(groupSelector) : null;
    const after = getDragAfter(scope, e.clientX, e.clientY);
    const parent = scope || container;
    if (after == null) parent.appendChild(dragEl);
    else parent.insertBefore(dragEl, after);
  }, { passive: false });

  const finish = () => {
    clearTimer();
    if (armed && dragEl) {
      dragEl.classList.remove('sk-reorder-active');
      container.style.overflow = container._savedOverflow || '';
      if (pointerId != null) { try { container.releasePointerCapture(pointerId); } catch(e) {} }
      const scope = groupSelector ? dragEl.closest(groupSelector) : null;
      const newOrder = getSiblings(scope).map(el => el.dataset[keyAttr]).filter(Boolean);
      onReorder(newOrder, scope);
    }
    armed = false; dragEl = null; pointerId = null;
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
  container.addEventListener('lostpointercapture', () => { if (armed) finish(); });
}

function skBuildFavBar() {
  const bar = document.getElementById('sk-fav-bar');
  if (!bar) return;
  const db = skLoadPresetsV2();
  const pinnedNames = skSortByPresetOrder(Object.keys(db.presets).filter(n => db.presets[n].pinned));
  if (!pinnedNames.length) {
    bar.innerHTML = `<span class="sk-fav-empty">Épingle des presets depuis la bibliothèque ★</span>`;
    return;
  }
  bar.innerHTML = pinnedNames.map(name => {
    const active = name === skCurrentPreset;
    return `<button class="sk-fav-chip${active ? ' active' : ''}" data-preset-name="${name.replace(/"/g,'&quot;')}" onclick="skLoadPresetByName('${name.replace(/'/g,"\\'")}')">
      ${name}
    </button>`;
  }).join('');
  skInitReorderable('sk-fav-bar', '.sk-fav-chip', null);
}

// ── CHARGER UN PRESET ─────────────────────────────────────────────────────────
function skLoadPresetByName(name) {
  const db = skLoadPresetsV2();
  const p  = db.presets[name];
  if (!p) return;
  stopShaker();
  skOpenStep = -1;
  skSteps = p.steps.map(s => ({ ...s }));
  skCurrentPreset = name;
  skSeqCollapsed = true;
  const _seqBody = document.getElementById('sk-seq-body');
  const _chevron = document.getElementById('sk-seq-chevron');
  if (_seqBody) _seqBody.style.display = 'none';
  if (_chevron) _chevron.textContent = '▶';
  // Restaurer le mode de lecture et le BPM sauvegardés avec le modèle
  if (p.playMode) skSetPlayMode(p.playMode);
  if (p.bpm) {
    HCTRL.bpm = p.bpm;
    PREVIEW.bpm = p.bpm;
    const hbpm = document.getElementById('header-bpm-val');
    if (hbpm) hbpm.textContent = HCTRL.bpm;
  }
  skBuildStepsUI();
  skGenerateAndShow();
  skBuildFavBar();
  skRenderProgTable(name);
  skCloseLibrary();
}

// ── BIBLIOTHÈQUE (bottom-sheet) ────────────────────────────────────────────────
let skLibQuery = '';
let skLibFolder = '';

function skOpenLibrary() {
  skLibQuery = '';
  skRenderLibrary();
  const sheet = document.getElementById('sk-library-sheet');
  const overlay = document.getElementById('sk-library-overlay');
  if (sheet) { sheet.classList.add('open'); overlay.classList.add('open'); }
  setTimeout(() => document.getElementById('sk-lib-search')?.focus(), 150);
}

function skCloseLibrary() {
  const sheet = document.getElementById('sk-library-sheet');
  const overlay = document.getElementById('sk-library-overlay');
  if (sheet) { sheet.classList.remove('open'); overlay.classList.remove('open'); }
}

function skFilterLibrary(q) {
  skLibQuery = q.toLowerCase();
  skRefreshLibrary();
}

function skSetLibFolder(f) {
  skLibFolder = skLibFolder === f ? '' : f;
  skRenderLibrary();
}

// Supprime un dossier — bloqué s'il contient encore des presets, pour ne jamais perdre de créations
function skDeleteFolder(name) {
  const db = skLoadPresetsV2();
  const hasPresets = Object.values(db.presets).some(p => p.folder === name);
  if (hasPresets) {
    alert(`Le dossier "${name}" contient encore des presets — déplace-les ou supprime-les d'abord.`);
    return;
  }
  if (!confirm(`Supprimer le dossier vide "${name}" ?`)) return;
  db.folders = db.folders.filter(f => f !== name);
  if (db.groups) {
    Object.keys(db.groups).forEach(g => {
      db.groups[g] = db.groups[g].filter(f => f !== name);
      if (!db.groups[g].length) delete db.groups[g];
    });
  }
  if (skLibFolder === name) skLibFolder = '';
  skSavePresetsV2(db);
  skRenderLibrary();
}

// Dissout un groupe — les dossiers restent intacts, seul le regroupement disparaît
function skDissolveGroup(groupName) {
  if (!confirm(`Dissoudre le groupe "${groupName}" ? Les dossiers ne seront pas supprimés.`)) return;
  const db = skLoadPresetsV2();
  if (db.groups) delete db.groups[groupName];
  skSavePresetsV2(db);
  skRenderLibrary();
}

function skRefreshLibrary() {
  const body = document.getElementById('sk-lib-body');
  if (!body) return;
  body.innerHTML = skBuildLibraryBody();
  skInitReorderable('sk-lib-body', '.sk-lib-item', '.sk-lib-folder-group');
}

function skBuildLibraryBody() {
  const db = skLoadPresetsV2();
  const groups = db.groups || {};
  const folders = [...new Set(['Tous', ...db.folders,
    ...Object.values(db.presets).map(p => p.folder).filter(Boolean)])];

  let filtered = Object.entries(db.presets).filter(([name, p]) => {
    const matchQ = !skLibQuery || name.toLowerCase().includes(skLibQuery);
    const matchF = skLibFolder === '__pinned__' ? p.pinned
      : (!skLibFolder || skLibFolder === 'Tous' || p.folder === skLibFolder
      || (groups[skLibFolder] || []).includes(p.folder));
    return matchQ && matchF;
  });

  if (!filtered.length) return `<div class="sk-lib-empty">Aucun preset trouvé</div>`;

  // Tri selon l'ordre personnalisé (réorganisation par appui long)
  const orderedNames = skSortByPresetOrder(filtered.map(([name]) => name));
  filtered = orderedNames.map(name => filtered.find(([n]) => n === name));

  // Groupe par dossier si pas de filtre actif
  const grouped = {};
  filtered.forEach(([name, p]) => {
    const f = p.folder || 'Mes créations';
    if (!grouped[f]) grouped[f] = [];
    grouped[f].push([name, p]);
  });

  return Object.entries(grouped).map(([folder, items]) => `
    <div class="sk-lib-folder-label">${folder}</div>
    <div class="sk-lib-folder-group" data-folder="${folder.replace(/"/g,'&quot;')}">
    ${items.map(([name, p]) => {
      const active    = name === skCurrentPreset;
      const isBuiltIn = name in SK_DEFAULT_PRESETS;
      const pinIcon   = p.pinned ? '★' : '☆';
      const steps     = p.steps || [];
      const noteCount = steps.filter(s => s.patKey && s.patKey !== 'rest').length;
      return `
    <div class="sk-lib-item${active ? ' active' : ''}${isBuiltIn ? ' built-in' : ''}" data-preset-name="${name.replace(/"/g,'&quot;')}">
      <div class="sk-lib-item-main" onclick="skLoadPresetByName('${name.replace(/'/g,"\\'")}')">
        <div class="sk-lib-item-name">${name}</div>
        <div class="sk-lib-item-meta">${noteCount} pas · ${folder}</div>
      </div>
      <button class="sk-lib-pin${p.pinned ? ' pinned' : ''}" onclick="skTogglePin('${name.replace(/'/g,"\\'")}')">
        ${pinIcon}
      </button>
      ${isBuiltIn ? '' : `<button class="sk-lib-del" onclick="skDeletePresetByName('${name.replace(/'/g,"\\'")}')">✕</button>`}
    </div>`;
    }).join('')}
    </div>
  `).join('');
}

function skRenderLibrary() {
  const sheet = document.getElementById('sk-library-sheet');
  if (!sheet) return;
  const db = skLoadPresetsV2();

  const groups = db.groups || {};
  const subFolderSet = new Set(Object.values(groups).flat());
  const allFolders = [...new Set([
    ...db.folders,
    ...Object.values(db.presets).map(p => p.folder).filter(Boolean),
  ])];
  const presetFolders = new Set(Object.values(db.presets).map(p => p.folder));
  const isFolderEmpty = f => !presetFolders.has(f);

  // Rangée principale : dossiers qui n'appartiennent à aucun groupe, + les groupes eux-mêmes
  // (un groupe est cliquable : il révèle ses dossiers enfants en rangée 2)
  // 'Mes créations' reste toujours visible au premier niveau même si elle rejoint un groupe
  const topFolders = allFolders.filter(f => f === 'Mes créations' || !subFolderSet.has(f));
  const groupNames = Object.keys(groups);

  // Groupe actif : soit le groupe lui-même est sélectionné, soit un de ses enfants
  const activeGroup = groupNames.find(
    g => skLibFolder === g || groups[g].includes(skLibFolder)
  ) || null;

  const pinnedItem = (() => {
    const isActive = skLibFolder === '__pinned__';
    return `<div class="sk-lib-folder-item">
      <button class="sk-lib-folder-btn${isActive ? ' active' : ''}"
        onclick="skSetLibFolder('__pinned__')">★ Épinglés</button>
    </div>`;
  })();

  sheet.querySelector('.sk-lib-folders').innerHTML = pinnedItem +
    ['Tous', ...topFolders, ...groupNames].map(f => {
      const isGroup = groupNames.includes(f);
      const isActive = isGroup
        ? f === activeGroup
        : (skLibFolder === f || (!skLibFolder && f === 'Tous'));
      const esc = f.replace(/'/g, "\\'");
      const canDelete = !isGroup && f !== 'Tous' && isFolderEmpty(f);
      const delBtn = isGroup
        ? `<button class="sk-lib-folder-del" title="Dissoudre le groupe (les dossiers ne sont pas supprimés)" onclick="event.stopPropagation();skDissolveGroup('${esc}')">✕</button>`
        : canDelete ? `<button class="sk-lib-folder-del" title="Supprimer le dossier vide" onclick="event.stopPropagation();skDeleteFolder('${esc}')">✕</button>` : '';
      // 'Tous' n'a pas de data-order-key : il n'est jamais déplaçable (n'est pas un vrai dossier)
      const orderAttr = f === 'Tous' ? '' : ` data-order-key="${f.replace(/"/g,'&quot;')}"`;
      return `<div class="sk-lib-folder-item"${orderAttr}>
        <button class="sk-lib-folder-btn${isActive ? ' active' : ''}${isGroup ? ' sk-lib-group-btn' : ''}"
          onclick="skSetLibFolder('${esc}')">${f}${isGroup ? ' ›' : ''}</button>
        ${delBtn}
      </div>`;
    }).join('');
  skInitReorderable('sk-lib-folders', '.sk-lib-folder-item[data-order-key]', null,
    { keyAttr: 'orderKey', onReorder: skReorderRow1, horizontal: true });

  // Rangée sous-dossiers — visible uniquement si un groupe est actif
  const subRow = sheet.querySelector('.sk-lib-subfolders');
  subRow.dataset.activeGroup = activeGroup || '';
  if (activeGroup) {
    subRow.style.display = 'flex';
    subRow.innerHTML = groups[activeGroup].map(f => {
      const esc = f.replace(/'/g, "\\'");
      const canDelete = isFolderEmpty(f);
      return `<div class="sk-lib-folder-item" data-order-key="${f.replace(/"/g,'&quot;')}">
        <button class="sk-lib-folder-btn sk-lib-subfolder-btn${skLibFolder === f ? ' active' : ''}"
          onclick="skSetLibFolder('${esc}')">${f}</button>
        ${canDelete ? `<button class="sk-lib-folder-del" title="Supprimer le dossier vide" onclick="event.stopPropagation();skDeleteFolder('${esc}')">✕</button>` : ''}
      </div>`;
    }).join('');
  } else {
    subRow.style.display = 'none';
    subRow.innerHTML = '';
  }
  skInitReorderable('sk-lib-subfolders', '.sk-lib-folder-item[data-order-key]', null,
    { keyAttr: 'orderKey', onReorder: skReorderRow2, horizontal: true });

  skRefreshLibrary();
}

// ── SAUVEGARDE (dialog custom) ────────────────────────────────────────────────
function skOpenSaveDialog() {
  if (!skSteps.length) return;
  const db = skLoadPresetsV2();
  const folders = [...new Set([...db.folders,
    ...Object.values(db.presets).map(p => p.folder).filter(Boolean)])];

  // Pré-sélectionner le dossier du preset courant si possible
  const currentPresetFolder = skCurrentPreset ? db.presets[skCurrentPreset]?.folder : null;
  const defaultFolder = currentPresetFolder || 'Mes créations';

  const folderOpts = `<option value="">— aucun (direct dans le dossier) —</option>` +
    folders.map(f =>
      `<option value="${f}"${f === defaultFolder ? ' selected' : ''}>${f}</option>`).join('');

  // Liste complète des dossiers (groupes) existants — la sélection du sous-dossier
  // ne fait que pré-sélectionner celui déjà associé, sans restreindre la liste
  const groups = db.groups || {};
  const groupOpts = `<option value="">— aucun —</option>` +
    Object.keys(groups).map(g => `<option value="${g}">${g}</option>`).join('');

  document.getElementById('sk-save-dialog').innerHTML = `
    <div class="sk-dialog-backdrop" onclick="skCloseSaveDialog()"></div>
    <div class="sk-dialog-box">
      <div class="sk-dialog-title">Sauvegarder le preset</div>
      <div class="sk-dialog-field">
        <label class="sk-dialog-label">Nom</label>
        <input id="sk-save-name" class="sk-dialog-input" type="text"
          placeholder="Mon preset…" value="${skCurrentPreset || ''}"
          onkeydown="if(event.key==='Enter')skConfirmSave()">
      </div>
      <div class="sk-dialog-field">
        <label class="sk-dialog-label">Dossier</label>
        <div style="display:flex;gap:6px">
          <select id="sk-save-group" class="sk-dialog-input" style="flex:1">${groupOpts}</select>
          <button class="sk-dialog-new-folder" onclick="skPromptNewGroup()">+ Nouveau</button>
        </div>
      </div>
      <div class="sk-dialog-field">
        <label class="sk-dialog-label">Sous-dossier</label>
        <div style="display:flex;gap:6px">
          <select id="sk-save-folder" class="sk-dialog-input" style="flex:1"
            onchange="skSyncGroupFromFolder(this.value)">${folderOpts}</select>
          <button class="sk-dialog-new-folder" onclick="skPromptNewFolder()">+ Nouveau</button>
        </div>
      </div>
      <div class="sk-dialog-actions">
        <button class="sk-dialog-btn cancel" onclick="skCloseSaveDialog()">Annuler</button>
        <button class="sk-dialog-btn confirm" onclick="skConfirmSave()">Sauvegarder</button>
      </div>
    </div>`;
  document.getElementById('sk-save-dialog').style.display = 'block';
  skSyncGroupFromFolder(defaultFolder);
  setTimeout(() => document.getElementById('sk-save-name')?.select(), 100);
}

function skCloseSaveDialog() {
  const d = document.getElementById('sk-save-dialog');
  if (d) { d.style.display = 'none'; d.innerHTML = ''; }
}

// Pré-sélectionne le dossier (groupe) auquel le sous-dossier choisi appartient déjà,
// sans jamais restreindre la liste complète des dossiers existants
function skSyncGroupFromFolder(folder) {
  if (!folder) return; // "— aucun —" : ne touche pas au Dossier déjà choisi
  const db = skLoadPresetsV2();
  const groups = db.groups || {};
  const sel = document.getElementById('sk-save-group');
  if (!sel) return;
  const match = Object.keys(groups).find(g => groups[g].includes(folder));
  if (match) sel.value = match;
}

function skPromptNewFolder() {
  const name = prompt('Nom du nouveau sous-dossier :');
  if (!name || !name.trim()) return;
  const sel = document.getElementById('sk-save-folder');
  if (!sel) return;
  const opt = document.createElement('option');
  opt.value = opt.textContent = name.trim();
  sel.appendChild(opt);
  sel.value = name.trim();
}

function skPromptNewGroup() {
  const name = prompt('Nom du nouveau dossier :');
  if (!name || !name.trim()) return;
  const sel = document.getElementById('sk-save-group');
  if (!sel) return;
  const opt = document.createElement('option');
  opt.value = opt.textContent = name.trim();
  sel.appendChild(opt);
  sel.value = name.trim();

  // Un dossier a besoin d'au moins un sous-dossier — on enchaîne directement
  // pour éviter qu'un nouveau dossier ne se retrouve avec "Mes créations" par défaut
  const subName = prompt(`Nom du sous-dossier à créer dans "${name.trim()}" :`);
  if (subName && subName.trim()) {
    const folderSel = document.getElementById('sk-save-folder');
    if (folderSel) {
      const subOpt = document.createElement('option');
      subOpt.value = subOpt.textContent = subName.trim();
      folderSel.appendChild(subOpt);
      folderSel.value = subName.trim();
    }
  }
}

function skConfirmSave() {
  const name      = document.getElementById('sk-save-name')?.value.trim();
  const subfolder = document.getElementById('sk-save-folder')?.value || '';
  const group     = document.getElementById('sk-save-group')?.value || '';
  if (!name) { document.getElementById('sk-save-name')?.focus(); return; }
  // Sans sous-dossier : le preset vit directement dans le dossier choisi (ou "Mes créations" par défaut)
  const folder = subfolder || group || 'Mes créations';
  const db = skLoadPresetsV2();
  const existing = db.presets[name];
  db.presets[name] = {
    steps: skSteps.map(s => ({ ...s })),
    folder,
    pinned: existing ? existing.pinned : false,
    createdAt: existing ? existing.createdAt : Date.now(),
    playMode: skPlayMode,
    bpm: HCTRL.bpm,
  };
  if (!db.folders.includes(folder)) db.folders.push(folder);
  // Gestion groupe : ajouter le sous-dossier au groupe sélectionné, le retirer des autres.
  // Si le preset vit directement dans le dossier (folder === group), inutile de l'ajouter
  // comme sous-dossier de lui-même.
  if (!db.groups) db.groups = {};
  Object.keys(db.groups).forEach(g => {
    db.groups[g] = db.groups[g].filter(f => f !== subfolder);
  });
  if (group && subfolder && subfolder !== group) {
    if (!db.groups[group]) db.groups[group] = [];
    if (!db.groups[group].includes(subfolder)) db.groups[group].push(subfolder);
  }
  skSavePresetsV2(db);
  skCurrentPreset = name;
  skBuildFavBar();
  skCloseSaveDialog();
  const libSheet = document.getElementById('sk-library-sheet');
  if (libSheet && libSheet.classList.contains('open')) skRenderLibrary();
}

function skDeletePresetByName(name) {
  // Les modèles intégrés à l'app ne sont jamais supprimables par l'utilisateur
  if (name in SK_DEFAULT_PRESETS) return;
  if (!confirm(`Supprimer "${name}" ?`)) return;
  const db = skLoadPresetsV2();
  delete db.presets[name];
  skSavePresetsV2(db);
  if (skCurrentPreset === name) skCurrentPreset = '';
  skBuildFavBar();
  skRefreshLibrary();
}

// Compat ancienne API (appelée depuis skInit)
function skBuildPresetSelect() { skBuildFavBar(); }

// ── PROGRESSION TABLE ─────────────────────────────────────────────────────────
const SK_PROG_KEY    = 'shaker_progress';
const SK_NOTES_KEY   = 'shaker_notes';
let skCurrentPreset = '';

function skLoadNotes() {
  try { return JSON.parse(localStorage.getItem(SK_NOTES_KEY) || '{}'); } catch(e) { return {}; }
}
function skSaveNote(presetName, text) {
  const notes = skLoadNotes();
  notes[presetName] = text;
  try { localStorage.setItem(SK_NOTES_KEY, JSON.stringify(notes)); } catch(e) {}
}

const SK_MODE_COLORS = { strict:'#2a7de1', mirror:'#c0392b', inverse:'#8e44ad' };
const SK_MODE_LABELS = { strict:'Strict', mirror:'Inversé', inverse:'Miroir' };

function skSetInterp(i) {
  setPreviewInterp(i);
  skGenerateAndShow();
  skRenderProgTable(skCurrentPreset);
}

function skLoadProgress() {
  try { return JSON.parse(localStorage.getItem(SK_PROG_KEY) || '{}'); }
  catch(e) { return {}; }
}

function skToggleProgress(presetName, mode, interp, tempoKey) {
  const prog = skLoadProgress();
  const k = `${presetName}__${mode}__${interp}__${tempoKey}`;
  prog[k] = !prog[k];
  localStorage.setItem(SK_PROG_KEY, JSON.stringify(prog));
  skRenderProgTable(presetName);
}

function skSetLaboTempo(tempoKey) {
  HCTRL.bpm = SETTINGS.tempoPresets[tempoKey];
  PREVIEW.bpm = HCTRL.bpm;
  const hbpm = document.getElementById('header-bpm-val');
  if (hbpm) hbpm.textContent = HCTRL.bpm;
}

function skRenderProgTable(presetName) {
  const wrap = document.getElementById('sk-prog-wrap');
  if (!wrap) return;
  if (!presetName) { wrap.innerHTML = ''; return; }

  const prog     = skLoadProgress();
  const mode     = skPlayMode;
  const color    = SK_MODE_COLORS[mode] || '#1e5f8a';
  const safeName = presetName.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

  const modeBadge = `<span style="font-size:9px;font-weight:700;color:#fff;background:${color};border-radius:6px;padding:1px 6px;opacity:.9">${SK_MODE_LABELS[mode] || mode}</span>`;

  const gridRows = TEMPOS.map(tempo => {
    let row = `<tr><td class="tempo" style="text-align:center;padding:4px 6px;cursor:pointer" onclick="skSetLaboTempo('${tempo.key}')">
      <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:3px">${tempo.icon}</div>
      <span style="font-size:10px;color:${tempo.color};font-weight:700;display:block">${SETTINGS.tempoPresets[tempo.key]} <span style="font-size:8px;font-weight:500">bpm</span></span>
    </td>`;
    INTERPS.forEach(interp => {
      const k    = `${presetName}__${mode}__${interp}__${tempo.key}`;
      const done = !!prog[k];
      const chkStyle = done ? `background:${color};border-color:${color};` : '';
      row += `<td><button class="cell-btn ${done?'checked':''}" style="${chkStyle}"
        onclick="skToggleProgress('${safeName}','${mode}','${interp}','${tempo.key}')"></button></td>`;
    });
    row += `</tr>`;
    return row;
  }).join('');

  const currentNote = skLoadNotes()[presetName] || '';

  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.4px;text-transform:uppercase;margin:12px 0 6px;padding-left:1px">Remplis le tableau</div>
    <div class="prog-grid" style="margin-bottom:10px">
      <table><thead><tr>
        <th style="width:68px;background:${color};vertical-align:middle">${modeBadge}</th>
        ${INTERPS.map(i=>`<th data-interp-th="${i}" onclick="skSetInterp('${i}')"
          style="cursor:pointer;transition:all .15s;${PREVIEW.interp===i ? 'background:var(--orange);color:#fff;' : 'background:var(--blue);color:rgba(255,255,255,.75);'}">${INTERP_LABELS[i]}</th>`).join('')}
      </tr></thead>
      <tbody>${gridRows}</tbody></table>
    </div>
    <textarea placeholder="Notes personnelles…"
      style="width:100%;min-height:52px;padding:8px 10px;font-size:12px;font-family:-apple-system,sans-serif;
        color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:8px;
        resize:vertical;outline:none;line-height:1.5;box-sizing:border-box;margin-top:4px"
      onblur="skSaveNote('${safeName}', this.value)">${currentNote}</textarea>`;
}

function skSavePreset()  { skOpenSaveDialog(); }
function skDeletePreset() { if (skCurrentPreset) skDeletePresetByName(skCurrentPreset); }

// ── IMPORT / EXPORT ───────────────────────────────────────────────────────────
function skExportPresets() {
  if (!skSteps.length) { alert('Aucun pas à exporter — compose d\'abord une séquence.'); return; }
  const name = skCurrentPreset || 'sequence';
  const noteText = skLoadNotes()[name] || '';
  const payload = { name, steps: skSteps, playMode: skPlayMode, bpm: HCTRL.bpm, ...(noteText ? { notes: noteText } : {}) };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  a.href = url; a.download = `labo-${slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Exporte toute la bibliothèque (tous les presets + dossiers + groupes) en un seul fichier JSON
function skExportAllPresets() {
  const db = skLoadPresetsV2();
  if (!db.presets || !Object.keys(db.presets).length) {
    alert('Aucun preset enregistré à exporter.');
    return;
  }
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `labo-bibliotheque-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function skImportPresets() {
  document.getElementById('sk-import-file')?.click();
}

function skValidateImport(imported) {
  const errors = [];
  if (typeof imported !== 'object' || imported === null)
    return ['Format invalide — fichier JSON mal formé.'];

  // Nom
  if (typeof imported.name !== 'string' || !imported.name.trim())
    errors.push('Champ "name" manquant ou invalide.');
  else if (imported.name.length > 200)
    errors.push('Nom trop long (max 200 caractères).');

  // Steps
  if (!Array.isArray(imported.steps))
    return ['Champ "steps" manquant ou invalide.'];
  if (imported.steps.length === 0)
    errors.push('Le modèle ne contient aucun pas.');
  if (imported.steps.length > SK_MAX_STEPS)
    errors.push(`Trop de pas (${imported.steps.length} — max ${SK_MAX_STEPS}).`);

  // Notes personnelles
  if (imported.notes !== undefined && typeof imported.notes !== 'string')
    errors.push('Champ "notes" invalide (doit être du texte).');
  if (typeof imported.notes === 'string' && imported.notes.length > 2000)
    errors.push('Notes personnelles trop longues (max 2000 caractères).');

  // Valeurs autorisées pour chaque pas
  const VALID_PAT_KEYS = new Set([
    'rest', 'muted', 'measure', 'repeat-start', 'repeat-end', 'stop',
    ...SK_PAT_KEYS
  ]);
  const VALID_STRINGS   = new Set(['e','B','G','D','A','E']);
  const VALID_DIRS      = new Set(['U','D']);
  const VALID_DURATIONS = new Set(['1/4','1/8','1/16','1/8t','6:16']);

  imported.steps.forEach((st, i) => {
    const idx = `Pas ${i + 1}`;
    if (typeof st !== 'object' || st === null) { errors.push(`${idx} : format invalide.`); return; }
    if (!VALID_PAT_KEYS.has(st.patKey))
      errors.push(`${idx} : patKey inconnu "${st.patKey}".`);
    if (st.string != null && !VALID_STRINGS.has(st.string))
      errors.push(`${idx} : corde invalide "${st.string}".`);
    if (st.dir !== undefined && !VALID_DIRS.has(st.dir))
      errors.push(`${idx} : direction invalide "${st.dir}".`);
    if (st.startFret !== undefined) {
      const f = Number(st.startFret);
      if (!Number.isInteger(f) || f < 0 || f > 24)
        errors.push(`${idx} : frette invalide (${st.startFret}) — doit être entre 0 et 24.`);
    }
    if (st.duration !== undefined && !VALID_DURATIONS.has(st.duration))
      errors.push(`${idx} : durée invalide "${st.duration}".`);
    if (st.active !== undefined && typeof st.active !== 'boolean')
      errors.push(`${idx} : champ "active" invalide.`);
    if (st.patKey === 'repeat-end' && st.repeatCount !== undefined) {
      const rc = Number(st.repeatCount);
      if (!Number.isInteger(rc) || rc < 2 || rc > 16)
        errors.push(`${idx} : repeatCount invalide (${st.repeatCount}) — doit être entre 2 et 16.`);
    }
  });

  return errors;
}

// Applique un preset importé (validé au préalable) à la bibliothèque et à l'état courant
function skApplyImportedPreset(imported, fallbackName) {
  let name = imported.name || fallbackName || 'preset';
  const db = skLoadPresetsV2();

  // Les presets intégrés à l'app ne doivent jamais être écrasés silencieusement —
  // on renomme automatiquement en variante plutôt que de perdre l'original.
  if (name in SK_DEFAULT_PRESETS) {
    let suggestion = `${name} (importé)`;
    let i = 2;
    while (db.presets[suggestion]) { suggestion = `${name} (importé ${i})`; i++; }
    name = suggestion;
    alert(`"${imported.name || fallbackName}" est un preset intégré à l'app — le preset importé sera enregistré sous "${name}" pour préserver l'original.`);
  } else if (db.presets[name]) {
    if (!confirm(`Un preset "${name}" existe déjà. Le remplacer ?`)) return false;
  }
  db.presets[name] = {
    steps: imported.steps, folder: 'Mes créations', pinned: false, createdAt: Date.now(),
    ...(imported.playMode ? { playMode: imported.playMode } : {}),
    ...(imported.bpm ? { bpm: imported.bpm } : {}),
  };
  skSavePresetsV2(db);
  if (imported.notes) skSaveNote(name, imported.notes);
  skCurrentPreset = name;
  skSteps = imported.steps.map(s => ({ ...s }));
  skSeqCollapsed = true;
  const _sb = document.getElementById('sk-seq-body');
  const _sc = document.getElementById('sk-seq-chevron');
  if (_sb) _sb.style.display = 'none';
  if (_sc) _sc.textContent = '▶';
  if (imported.playMode) skSetPlayMode(imported.playMode);
  if (imported.bpm) {
    HCTRL.bpm = imported.bpm;
    PREVIEW.bpm = imported.bpm;
    const hbpm = document.getElementById('header-bpm-val');
    if (hbpm) hbpm.textContent = HCTRL.bpm;
  }
  skBuildStepsUI();
  skGenerateAndShow();
  skBuildPresetSelect();
  skBuildFavBar();
  const sel = document.getElementById('sk-preset-sel');
  if (sel) sel.value = name;
  return true;
}

function skHandleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result);
      const importErrors = skValidateImport(imported);
      if (importErrors.length) {
        alert('Fichier invalide :\n\n' + importErrors.slice(0, 5).join('\n') + (importErrors.length > 5 ? `\n\n… et ${importErrors.length - 5} autre(s) erreur(s).` : ''));
        e.target.value = '';
        return;
      }
      skApplyImportedPreset(imported, file.name.replace(/\.json$/, ''));
    } catch(err) {
      alert('Erreur de lecture JSON : ' + err.message);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ── PARTAGE PAR CODE COMPACT (forum, message...) ─────────────────────────────
const SK_CODE_PREFIX = 'DPLABO1:';

function skEncodePresetPayload(payload) {
  const json = JSON.stringify(payload);
  const b64  = btoa(unescape(encodeURIComponent(json)));
  return SK_CODE_PREFIX + b64;
}

function skDecodePresetCode(code) {
  const trimmed = code.trim();
  if (!trimmed.startsWith(SK_CODE_PREFIX)) throw new Error('Ce code ne provient pas du Labo Dico Pattern.');
  const b64  = trimmed.slice(SK_CODE_PREFIX.length);
  const json = decodeURIComponent(escape(atob(b64)));
  return JSON.parse(json);
}

function skExportPresetCode() {
  if (!skSteps.length) { alert('Aucun pas à exporter — compose d\'abord une séquence.'); return; }
  const db = skLoadPresetsV2();
  const baseName = skCurrentPreset || 'sequence';
  // Si la séquence courante correspond à un preset déjà enregistré (perso ou intégré),
  // on suggère un nom de variante distinct pour éviter d'écraser l'original à l'import.
  const suggestion = db.presets[baseName] ? `${baseName} (variante)` : baseName;
  const name = prompt('Nom du preset à partager :', suggestion);
  if (!name || !name.trim()) return;
  const finalName = name.trim();

  const noteText = skLoadNotes()[baseName] || '';
  const payload = { name: finalName, steps: skSteps, playMode: skPlayMode, bpm: HCTRL.bpm, ...(noteText ? { notes: noteText } : {}) };
  const code = skEncodePresetPayload(payload);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copié dans le presse-papier — colle-le sur un forum ou dans un message pour le partager.');
    }).catch(() => {
      prompt('Copie ce code pour le partager :', code);
    });
  } else {
    prompt('Copie ce code pour le partager :', code);
  }
}

function skImportPresetCode() {
  const code = prompt('Colle ici le code du preset partagé :');
  if (!code || !code.trim()) return;
  try {
    const imported = skDecodePresetCode(code);
    const importErrors = skValidateImport(imported);
    if (importErrors.length) {
      alert('Code invalide :\n\n' + importErrors.slice(0, 5).join('\n') + (importErrors.length > 5 ? `\n\n… et ${importErrors.length - 5} autre(s) erreur(s).` : ''));
      return;
    }
    skApplyImportedPreset(imported, 'preset-importe');
  } catch(err) {
    alert('Erreur de lecture du code : ' + err.message);
  }
}

// ── RENDU HTML ────────────────────────────────────────────────────────────────
function renderShaker() {
  const isPlaying = skIsPlaying;
  return `
<style>
/* ── SHAKER SCOPED STYLES ── */
.sk-wrap { padding: 14px 14px 80px; }
.sk-section-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text2); margin-bottom: 8px; margin-top: 4px;
}

/* Preset bar — top with menu */
/* ── FAVORIS ── */
.sk-fav-save-btn {
  border: none; background: transparent; color: var(--green);
  font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; letter-spacing: .3px;
}
.sk-fav-io-btn {
  border: none; background: transparent; color: var(--text2);
  font-size: 11px; font-weight: 600; cursor: pointer; padding: 0; letter-spacing: .3px;
}
.sk-fav-io-btn:hover { color: var(--orange); }
.sk-io-action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  border: 1.5px solid var(--border); border-radius: 8px; background: var(--card);
  color: var(--text2); font-size: 12px; font-weight: 600; cursor: pointer;
  padding: 9px 8px; transition: all .15s; white-space: nowrap; overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.sk-io-action-btn:active { background: var(--bg); opacity: .8; }
.sk-fav-bar {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.sk-fav-bar::-webkit-scrollbar { display: none; }
.sk-fav-chip {
  flex-shrink: 0; border: 1.5px solid var(--border); background: var(--card);
  border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600;
  color: var(--text); cursor: pointer; white-space: nowrap; transition: all .15s;
  touch-action: pan-x; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.sk-fav-chip.active { border-color: var(--blue); color: var(--blue); background: var(--blue-light); }
.sk-fav-chip:active  { opacity: .7; }
.sk-fav-empty { font-size: 11px; color: var(--text2); font-style: italic; padding: 4px 0; }
.sk-lib-open-btn {
  width: 100%; border: none; background: var(--blue);
  border-radius: 10px; padding: 12px; font-size: 13px; font-weight: 600; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 20px; transition: opacity .15s;
}
.sk-lib-open-btn:active { opacity: .75; }

/* ── LIBRARY SHEET ── */
.sk-library-overlay {
  display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 200; -webkit-tap-highlight-color: transparent;
}
.sk-library-overlay.open { display: block; }
.sk-library-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
  background: var(--card); border-radius: 20px 20px 0 0;
  height: 80vh; display: flex; flex-direction: column;
  transform: translateY(100%); transition: transform .3s cubic-bezier(.4,0,.2,1);
  box-shadow: 0 -4px 24px rgba(0,0,0,.18);
}
.sk-library-sheet.open { transform: translateY(0); }
.sk-lib-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 16px 10px; flex-shrink: 0;
}
.sk-lib-title { font-size: 16px; font-weight: 700; }
.sk-lib-close {
  border: none; background: var(--border); border-radius: 50%;
  width: 28px; height: 28px; font-size: 14px; cursor: pointer; color: var(--text2);
  display: flex; align-items: center; justify-content: center;
}
.sk-lib-search-row { padding: 0 16px 10px; flex-shrink: 0; }
.sk-lib-search {
  width: 100%; border: 1.5px solid var(--border); border-radius: 10px;
  background: var(--bg); padding: 9px 12px; font-size: 14px; color: var(--text);
  outline: none; box-sizing: border-box;
}
.sk-lib-folders {
  display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 10px;
  scrollbar-width: none; flex-shrink: 0;
}
.sk-lib-folders::-webkit-scrollbar { display: none; }
.sk-lib-subfolders {
  display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 8px 28px;
  scrollbar-width: none; flex-shrink: 0; border-left: 2px solid var(--blue);
  margin: 0 16px 4px; padding-left: 12px;
}
.sk-lib-subfolders::-webkit-scrollbar { display: none; }
.sk-lib-subfolder-btn { font-size: 11px !important; padding: 4px 11px !important; }
.sk-lib-group-btn { border-style: dashed; }
.sk-lib-folder-item { display: flex; align-items: center; gap: 2px; flex-shrink: 0; touch-action: pan-x; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.sk-lib-folder-del {
  flex-shrink: 0; border: none; background: transparent; color: var(--text3);
  font-size: 11px; width: 18px; height: 18px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center; opacity: .6; transition: all .15s;
}
.sk-lib-folder-del:hover { opacity: 1; color: var(--red); background: rgba(200,60,60,.1); }
.sk-lib-group-label {
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; color: var(--blue); white-space: nowrap; padding-right: 4px;
}
.sk-lib-group-del {
  border: none; background: transparent; color: var(--text3); font-size: 11px;
  width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center; opacity: .6; transition: all .15s;
}
.sk-lib-group-del:hover { opacity: 1; color: var(--red); background: rgba(200,60,60,.1); }
.sk-lib-folder-btn {
  flex-shrink: 0; border: 1.5px solid var(--border); background: transparent;
  border-radius: 16px; padding: 5px 13px; font-size: 12px; font-weight: 600;
  color: var(--text2); cursor: pointer; transition: all .15s;
}
.sk-lib-folder-btn.active { border-color: var(--blue); background: var(--blue); color: #fff; }
.sk-lib-body {
  flex: 1; overflow-y: auto; padding: 0 16px 40px;
}
.sk-lib-folder-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px;
  color: var(--text2); margin: 14px 0 6px; padding-left: 2px;
}
.sk-lib-item {
  display: flex; align-items: center; gap: 6px; padding: 10px 12px;
  border: 1.5px solid var(--border); border-radius: 10px; margin-bottom: 6px;
  background: var(--card); transition: border-color .15s, transform .15s, box-shadow .15s;
  touch-action: pan-y; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.sk-lib-item.active { border-color: var(--blue); background: var(--blue-light); }
.sk-lib-item.sk-reorder-active, .sk-fav-chip.sk-reorder-active, .sk-lib-folder-item.sk-reorder-active {
  transform: scale(1.05); box-shadow: 0 6px 18px rgba(0,0,0,.18); z-index: 5; position: relative;
  touch-action: none;
  border-color: var(--orange) !important; background: var(--orange-light, rgba(255,152,0,.12)) !important;
  color: var(--orange) !important;
}
.sk-lib-folder-item.sk-reorder-active .sk-lib-folder-btn {
  border-color: var(--orange) !important; background: var(--orange-light, rgba(255,152,0,.12)) !important;
  color: var(--orange) !important;
}
.sk-lib-item-main { flex: 1; cursor: pointer; min-width: 0; }
.sk-lib-item-name { font-size: 14px; font-weight: 600; color: var(--text); }
.sk-lib-item-meta { font-size: 11px; color: var(--text2); margin-top: 2px; }
.sk-lib-pin {
  border: none; background: transparent; font-size: 18px; cursor: pointer;
  color: var(--border); padding: 4px; line-height: 1; flex-shrink: 0;
}
.sk-lib-pin.pinned { color: #f0a500; }
.sk-lib-del {
  border: none; background: transparent; font-size: 13px; cursor: pointer;
  color: var(--red); opacity: .5; padding: 4px; flex-shrink: 0;
}
.sk-lib-del:active { opacity: 1; }
.sk-lib-empty { text-align: center; color: var(--text2); padding: 32px 0; font-size: 13px; }

/* ── SAVE DIALOG ── */
.sk-dialog-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 300;
}
.sk-dialog-box {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
  background: var(--card); border-radius: 14px; padding: 22px 20px;
  width: min(340px, 90vw); z-index: 301; box-shadow: 0 8px 32px rgba(0,0,0,.2);
}
.sk-dialog-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
.sk-dialog-field { margin-bottom: 12px; }
.sk-dialog-label { font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text2); display: block; margin-bottom: 5px; }
.sk-dialog-input {
  width: 100%; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--bg); padding: 9px 11px; font-size: 14px; color: var(--text);
  outline: none; box-sizing: border-box;
}
.sk-dialog-input:focus { border-color: var(--blue); }
.sk-dialog-new-folder {
  border: 1.5px solid var(--border); background: transparent; border-radius: 8px;
  padding: 9px 11px; font-size: 13px; color: var(--text2); cursor: pointer; white-space: nowrap;
}
.sk-dialog-actions { display: flex; gap: 8px; margin-top: 18px; }
.sk-dialog-btn {
  flex: 1; padding: 11px; border-radius: 8px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
}
.sk-dialog-btn.cancel { background: var(--border); color: var(--text2); }
.sk-dialog-btn.confirm { background: var(--green); color: #fff; }

/* Steps list — accordion mode */
.sk-steps-list { margin-bottom: 10px; }
.sk-step-card {
  border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden;
  margin-bottom: 8px; background: var(--card);
}
.sk-step-card.inactive { opacity: 0.55; }
.sk-step-header {
  padding: 12px 12px 12px 8px; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  background: var(--card); user-select: none;
}
.sk-step-header:active { background: var(--bg); }
.sk-step-badge {
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: var(--blue); color: white;
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
}
.sk-step-name {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 13px; font-weight: 500; color: var(--text);
}
.sk-step-arrow { font-size: 10px; color: var(--text2); transition: transform .2s; flex-shrink: 0; }
.sk-step-card.open .sk-step-arrow { transform: rotate(90deg); }
.sk-step-content { display: none; border-top: 1.5px solid var(--border); }
.sk-step-card.open .sk-step-content { display: block; }
.sk-step-card.sk-measure-card {
  background: rgba(100, 181, 246, 0.1); border-color: rgba(100, 181, 246, 0.3);
}
.sk-step-card.sk-measure-card .sk-step-badge { background: rgba(100, 181, 246, 0.7); }
.sk-step-card.sk-repeat-start-card {
  background: rgba(129, 199, 132, 0.1); border-color: rgba(129, 199, 132, 0.4);
  border-left: 3px solid rgba(129, 199, 132, 0.8);
}
.sk-step-card.sk-repeat-start-card .sk-step-badge { background: rgba(129, 199, 132, 0.8); }
.sk-step-card.sk-repeat-end-card {
  background: rgba(129, 199, 132, 0.1); border-color: rgba(129, 199, 132, 0.4);
  border-right: 3px solid rgba(129, 199, 132, 0.8);
}
.sk-step-card.sk-repeat-end-card .sk-step-badge { background: rgba(129, 199, 132, 0.8); }
.sk-tab-repeat-block { border-left: 2px solid rgba(129, 199, 132, 0.5); margin-left: 4px; }
.sk-step-card.sk-stop-card {
  background: rgba(239, 83, 80, 0.08); border-color: rgba(239, 83, 80, 0.35);
  border-right: 3px solid rgba(239, 83, 80, 0.7);
}
.sk-step-card.sk-stop-card .sk-step-badge { background: rgba(239, 83, 80, 0.75); }
.sk-step-card.sk-muted-card {
  background: rgba(188, 143, 80, 0.08); border-color: rgba(188, 143, 80, 0.35);
}
.sk-step-card.sk-muted-card .sk-step-badge { background: rgba(188, 143, 80, 0.75); }

.sk-active-toggle {
  border: 1.5px solid var(--border); background: transparent; cursor: pointer;
  padding: 3px 7px; border-radius: 6px; font-size: 10px; font-weight: 700;
  letter-spacing: .5px; flex-shrink: 0; color: var(--text2); line-height: 1.4;
}
.sk-active-toggle.on { background: var(--green); border-color: var(--green); color: #fff; }

/* Step controls */
.sk-step-controls { display: flex; flex-direction: column; gap: 0; }
.sk-ctrl-block { padding: 12px 12px 0; }
.sk-ctrl-block:last-child { padding-bottom: 0; }
.sk-control-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0;
}
.sk-control-row .sk-ctrl-block { border-right: 1px solid var(--border); }
.sk-control-row .sk-ctrl-block:last-child { border-right: none; }
.sk-control-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text2); margin-bottom: 5px;
}
.sk-step-controls select {
  background: var(--card); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 13px; padding: 9px 10px;
  cursor: pointer; outline: none; width: 100%; margin-bottom: 12px;
}
.sk-pat-select { font-weight: 500; }
.sk-dur-select { color: var(--orange); font-weight: 600; }

/* Step action footer */
/* Header action buttons */
.sk-header-actions {
  display: flex; align-items: center; gap: 2px; flex-shrink: 0;
}
.sk-hact-btn {
  border: none; background: transparent; padding: 6px 7px;
  font-size: 13px; color: var(--text2); cursor: pointer; border-radius: 6px; line-height: 1;
}
.sk-hact-btn:active { background: var(--border); }
.sk-hact-btn:disabled { opacity: .2; cursor: not-allowed; }
.sk-hact-btn.del { color: var(--red); }

/* Direction buttons */
.sk-dir-btns {
  display: flex; border: 1.5px solid var(--border); border-radius: 6px;
  overflow: hidden; width: 100%;
}
.sk-dir-btns button {
  flex: 1; border: none; padding: 8px 6px; font-size: 12px; font-weight: 600;
  cursor: pointer; background: transparent; color: var(--text2); line-height: 1;
}
.sk-dir-btns button + button { border-left: 1px solid var(--border); }
.sk-dir-btns button.active-U { background: var(--green); color: #fff; }
.sk-dir-btns button.active-D { background: var(--red);   color: #fff; }

/* Fret stepper — larger for touch */
.sk-stepper {
  display: flex; align-items: center; border: 1.5px solid var(--border);
  border-radius: 6px; overflow: hidden; width: 100%;
}
.sk-stepper button {
  flex: 1; border: none; padding: 8px; font-size: 16px; line-height: 1;
  cursor: pointer; background: transparent; color: var(--text2);
}
.sk-stepper button:active { background: var(--border); }
.sk-stepper-val {
  flex: 1; font-size: 13px; font-weight: 700; text-align: center; color: var(--text);
}
.sk-stepper-val.offset { color: var(--orange); }

/* Move buttons */
.sk-move-btns {
  display: flex; flex-direction: column; border: 1.5px solid var(--border);
  border-radius: 6px; overflow: hidden; flex-shrink: 0;
}
.sk-move-btns button {
  border: none; padding: 2px 5px; font-size: 9px; line-height: 1.4;
  cursor: pointer; background: transparent; color: var(--text2);
}
.sk-move-btns button:disabled { opacity: .18; cursor: default; }
.sk-move-btns button + button { border-top: 1px solid var(--border); }

/* Dup / Del buttons */
.sk-dup-btn, .sk-del-btn {
  border: none; background: transparent; font-size: 14px; line-height: 1;
  cursor: pointer; padding: 3px 2px; flex-shrink: 0; color: var(--border);
}
.sk-dup-btn:not(:disabled):hover { color: var(--blue); }
.sk-dup-btn:disabled { opacity: .15; cursor: not-allowed; }
.sk-del-btn:hover { color: var(--red); }

/* Add step button */
.sk-add-step-btn {
  width: 100%; padding: 9px; border-radius: var(--radius); margin-bottom: 18px;
  border: 1.5px dashed var(--border); background: transparent;
  color: var(--text2); font-size: 13px; font-weight: 600; cursor: pointer;
}
.sk-add-step-btn:hover { border-color: var(--blue); color: var(--blue); }
.sk-add-step-btn:disabled { opacity: .25; cursor: not-allowed; }

/* Mode seg */
.sk-seg {
  display: flex; border: 1.5px solid var(--border);
  border-radius: 8px; overflow: hidden;
}
.sk-seg button {
  flex: 1; border: none; background: transparent; padding: 8px 4px;
  font-size: 12px; font-weight: 500; color: var(--text2); cursor: pointer;
}
.sk-seg button + button { border-left: 1px solid var(--border); }
.sk-seg button.active.sk-mode-strict  { background: #2a7de1; color: #fff; font-weight: 700; }
.sk-seg button.active.sk-mode-mirror  { background: #c0392b; color: #fff; font-weight: 700; }
.sk-seg button.active.sk-mode-inverse { background: #8e44ad; color: #fff; font-weight: 700; }
.sk-seg button.active.sk-mode-patron  { background: var(--orange); color: #fff; font-weight: 700; }

/* Patron offset */
.sk-patron-ctrl {
  display: none; align-items: center; border: 1.5px solid var(--border);
  border-radius: 6px; overflow: hidden; flex-shrink: 0;
}
.sk-patron-ctrl button {
  border: none; padding: 6px 9px; font-size: 13px;
  cursor: pointer; background: transparent; color: var(--text2);
}
.sk-patron-val { font-size: 12px; font-weight: 700; min-width: 24px; text-align: center; color: var(--orange); }

/* Info bar */
.sk-info-bar { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.sk-info-chip {
  font-size: 11px; padding: 3px 9px; border-radius: 12px;
  background: var(--border); color: var(--text2);
}
.sk-info-chip.ok   { background: var(--green-light); color: var(--green); }
.sk-info-chip.warn { background: var(--orange-light); color: var(--orange); }
.sk-info-chip.rest { background: var(--blue-light); color: var(--blue); }

/* Action buttons */
.sk-btn {
  flex: 1; padding: 11px 8px; border-radius: var(--radius); border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.sk-btn:active { transform: scale(0.97); }
.sk-btn-play  { background: var(--green); color: #fff; }
.sk-btn-stop  { background: var(--red); color: #fff; }
.sk-btn-clear { background: var(--card); border: 1.5px solid var(--border); color: var(--text2); }

/* Tab display — même style que .tab-wrap principal */
.sk-tab-wrap {
  background: #1a1a2e; border-radius: var(--radius);
  overflow: hidden; cursor: pointer; position: relative;
  -webkit-tap-highlight-color: transparent;
}
.sk-tab-wrap:active { opacity: .88; }
.sk-tab-measure-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: rgba(255,255,255,.4);
  padding: 8px 14px 4px;
}
.sk-tab-preset-name {
  color: #64b5f6; text-transform: none; letter-spacing: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 55%;
  flex-shrink: 1;
}
.sk-tab-display {
  position: relative; overflow-x: auto; padding: 6px 12px 10px;
}
.sk-tab-display pre {
  font-family: 'Courier New', Courier, monospace;
  font-size: var(--tab-size, 13px); color: var(--tab-color, #fff);
  line-height: 1.6; white-space: pre; position: relative; z-index: 1;
  pointer-events: none; user-select: none; margin: 0;
}
.sk-tab-sep { height: 1px; background: rgba(255,255,255,.08); }
.sk-tab-block-sep { border-top: 1px dashed rgba(100,181,246,.25); margin-top: 2px; }
.sk-tab-cursor {
  position: absolute; width: 2px; background: rgba(255,165,46,.55);
  box-shadow: 0 0 8px rgba(255,165,46,.4); pointer-events: none;
  display: none; transform: translateX(-50%); z-index: 2;
  border-radius: 1px; transition: left 0s;
}
/* Overlay play/stop affiché sur la tab quand on tap */
.sk-tab-overlay {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; pointer-events: none; z-index: 3;
  opacity: 0; transition: opacity .15s;
}
.sk-tab-overlay.flash { opacity: 1; }
.sk-tab-overlay-icon {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: #fff;
}
.sk-empty-state {
  color: rgba(255,255,255,.35); text-align: center;
  padding: 32px 16px; font-size: 13px; line-height: 1.7; font-family: 'Courier New', Courier, monospace;
}

/* ── PANNEAU ÉDITION GLOBALE ── */
.sk-global-panel {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px; margin-bottom: 10px; display: none;
}
.sk-global-panel.open { display: block; }
.sk-global-section-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
  color: var(--text2); margin-bottom: 8px;
}
.sk-global-dur-row { display: flex; gap: 6px; }
.sk-global-dur-btn {
  flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text2); font-size: 11px; font-weight: 600;
  cursor: pointer; text-align: center; line-height: 1.3;
}
.sk-global-dur-btn.active {
  background: var(--orange); border-color: var(--orange); color: #fff;
}
.sk-global-fret-row { display: flex; gap: 6px; align-items: center; }
.sk-global-fret-btn {
  padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 13px; font-weight: 700;
  cursor: pointer; flex: 1;
}
.sk-global-fret-btn:active { background: var(--blue-light); }

/* ── MOBILE RESPONSIVE ── */
@media (max-width: 700px) {
  .sk-wrap { padding: 12px 12px 100px; }
  .sk-step-card { margin-bottom: 6px; }
  .sk-step-header { padding: 10px; }
  .sk-step-content { padding: 10px; }
  .sk-control-label { font-size: 9px; margin-bottom: 3px; }
  .sk-actions { flex-direction: column; gap: 6px; }
  .sk-btn { padding: 10px 8px; font-size: 12px; }
}
</style>

<div class="sk-wrap">

  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <div class="sk-section-label" style="margin-bottom:0;flex-shrink:0;cursor:pointer;user-select:none" onclick="skToggleSeqCollapse()">
      <span id="sk-seq-chevron">${skSeqCollapsed ? '▶' : '▼'}</span> Séquence — <span id="sk-step-count">${skSteps.length}</span> / ${SK_MAX_STEPS} pas
    </div>
    <div style="flex:1"></div>
    <button class="sk-fav-save-btn" onclick="skOpenSaveDialog()">＋ Save</button>
  </div>
  <div id="sk-seq-body" style="display:${skSeqCollapsed ? 'none' : 'block'}">
  <div class="sk-steps-list" id="sk-steps-list"></div>
  <div style="display:flex;gap:8px;margin-bottom:10px">
    <button class="sk-add-step-btn" id="sk-add-step-btn" onclick="skAddStep()" ${skSteps.length >= SK_MAX_STEPS ? 'disabled' : ''} style="flex:1;margin-bottom:0">＋ Ajouter un pas</button>
    <button class="sk-btn" id="sk-global-edit-btn" onclick="skToggleGlobalPanel()" style="flex:0 0 auto;padding:10px 14px;font-size:14px" title="Édition globale"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
    <button class="sk-btn sk-btn-clear" onclick="skClearAll()" style="flex:0 0 auto;padding:10px 16px;font-size:12px">Reset</button>
  </div>

  <div class="sk-global-panel" id="sk-global-panel">
    <div class="sk-global-section-label">Rythme — appliquer à tous les pas</div>
    <div class="sk-global-dur-row" style="margin-bottom:14px">
      <button class="sk-global-dur-btn" data-dur="1/4"  onclick="skApplyGlobalDuration('1/4')"><div>♩</div><div>noire</div></button>
      <button class="sk-global-dur-btn" data-dur="1/8"  onclick="skApplyGlobalDuration('1/8')"><div>♪</div><div>croche</div></button>
      <button class="sk-global-dur-btn" data-dur="1/16" onclick="skApplyGlobalDuration('1/16')"><div>♬</div><div>dbl-croche</div></button>
      <button class="sk-global-dur-btn" data-dur="1/8t" onclick="skApplyGlobalDuration('1/8t')"><div>♪³</div><div>triolet</div></button>
      <button class="sk-global-dur-btn" data-dur="6:16" onclick="skApplyGlobalDuration('6:16')"><div>⑥</div><div>sextolet</div></button>
    </div>
    <div class="sk-global-section-label">Décalage de frets — tous les pas</div>
    <div class="sk-global-fret-row">
      <button class="sk-global-fret-btn" onclick="skShiftAllFrets(-12)" title="−1 octave">−12</button>
      <button class="sk-global-fret-btn" onclick="skShiftAllFrets(-1)">−1</button>
      <button class="sk-global-fret-btn" onclick="skShiftAllFrets(+1)">+1</button>
      <button class="sk-global-fret-btn" onclick="skShiftAllFrets(+12)" title="+1 octave">+12</button>
    </div>
  </div>
  </div><!-- /sk-seq-body -->

  <div class="sk-tab-wrap" id="sk-tab-wrap">
    <div class="sk-tab-display">
      <div class="sk-empty-state">Ajoute au moins un pas pour composer ton exercice</div>
    </div>
  </div>

  <div class="sk-section-label" style="margin-top:14px">Mode de lecture</div>
  <div class="sk-seg" id="sk-mode-seg" style="margin-bottom:14px">
    <button class="sk-mode-strict ${skPlayMode==='strict'?'active':''}"   onclick="skSetPlayMode('strict')">Strict</button>
    <button class="sk-mode-mirror ${skPlayMode==='mirror'?'active':''}"   onclick="skSetPlayMode('mirror')">Inversé</button>
    <button class="sk-mode-inverse ${skPlayMode==='inverse'?'active':''}" onclick="skSetPlayMode('inverse')">Miroir</button>
  </div>

  <div id="sk-prog-wrap"></div>

  <div style="margin-top:6px;margin-bottom:4px">
    <span class="sk-section-label" style="margin:0">Presets</span>
  </div>
  <input type="file" id="sk-import-file" accept=".json" style="display:none" onchange="skHandleImportFile(event)">
  <div class="sk-fav-bar" id="sk-fav-bar">
    <span class="sk-fav-empty">Épingle des presets depuis la bibliothèque ★</span>
  </div>
  <button class="sk-lib-open-btn" onclick="skOpenLibrary()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    Bibliothèque
  </button>
  <div style="display:flex;gap:8px;margin-top:8px">
    <button class="sk-io-action-btn" onclick="skImportPresetCode()" title="Importer un preset depuis un code partagé">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Importer
    </button>
    <button class="sk-io-action-btn" onclick="skExportPresetCode()" title="Générer un code à partager (forum, message...)">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 16 12 21 17 16"/><line x1="12" y1="21" x2="12" y2="9"/></svg>
      Copier le preset
    </button>
  </div>

</div>

<!-- Library bottom-sheet -->
<div class="sk-library-overlay" id="sk-library-overlay" onclick="skCloseLibrary()"></div>
<div class="sk-library-sheet" id="sk-library-sheet">
  <div class="sk-lib-header">
    <div class="sk-lib-title">Bibliothèque</div>
    <button class="sk-lib-close" onclick="skCloseLibrary()">✕</button>
  </div>
  <div class="sk-lib-search-row">
    <input id="sk-lib-search" class="sk-lib-search" type="search" placeholder="Rechercher un preset…" oninput="skFilterLibrary(this.value)">
  </div>
  <div class="sk-lib-folders" id="sk-lib-folders"></div>
  <div class="sk-lib-subfolders" id="sk-lib-subfolders" style="display:none"></div>
  <div class="sk-lib-body" id="sk-lib-body"></div>
</div>

<!-- Save dialog -->
<div id="sk-save-dialog" style="display:none"></div>
`;
}

// ── INIT (appelé après le premier rendu) ──────────────────────────────────────
// ── PRESETS PAR DÉFAUT ────────────────────────────────────────────────────────
const SK_DEFAULT_PRESETS = {
  'Am Penta pos.5': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Am Harm. pos.5': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:6, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:6, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Am Naturelle pos.5': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:6, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Blues Am pos.5': {
    folder: 'Variations de Am',
    pinned: true,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-2-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Plan Contrarié (Am Penta)': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'D', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'D', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'D', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Plan Mixte Rythmique': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Plan Respiré (Am Penta)': {
    folder: 'Variations de Am',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'B', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'B6P1 (1-2-3)': {
    folder: 'Patterns multi-cordes',
    pinned: false,
    playMode: 'strict',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A3P1', forme:'1-2-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-2', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-2-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-2', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-2-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-2', dir:'D', startFret:6, active:true, duration:'1/16' },
    ],
  },
  'B6P1 (1-2-4)': {
    folder: 'Patterns multi-cordes',
    pinned: false,
    playMode: 'strict',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
    ],
  },
  'B6P1 (1-3-4)': {
    folder: 'Patterns multi-cordes',
    pinned: false,
    playMode: 'strict',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-2', dir:'D', startFret:7, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-2', dir:'D', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-2', dir:'D', startFret:7, active:true, duration:'1/16' },
    ],
  },
  'B6P1 (1-3-5)': {
    folder: 'Patterns multi-cordes',
    pinned: false,
    playMode: 'strict',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:6, active:true, duration:'1/16' },
    ],
  },
  'B8P1 Bumblebee': {
    folder: 'Patterns multi-cordes',
    pinned: true,
    playMode: 'strict',
    bpm: 80,
    steps: [
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-2', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'G', patKey:'A5P2', forme:'1-2-3-2-1', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'D', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:4 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-2', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A5P2', forme:'1-2-3-2-1', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:4 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-2', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'e', patKey:'A5P2', forme:'1-2-3-2-1', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:4 },
    ],
  },
  'Do Majeur Forme C': {
    folder: 'Do Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'A', patKey:'A1P0', forme:'standard', dir:'U', startFret:3, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:0, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:0, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-2', dir:'U', startFret:0, active:true, duration:'1/16' },
    ],
  },
  'Do Majeur Forme A': {
    folder: 'Do Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'U', startFret:3, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:2, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:2, active:true, duration:'1/16' },
    ],
  },
  'Do Majeur Forme G': {
    folder: 'Do Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-2', dir:'U', startFret:4, active:true, duration:'1/16' },
    ],
  },
  'Do Majeur Forme E': {
    folder: 'Do Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-3', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:7, active:true, duration:'1/16' },
    ],
  },
  'Do Majeur Forme D': {
    folder: 'Do Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:10, active:true, duration:'1/16' },
    ],
  },
  'Sol Majeur Forme G': {
    folder: 'Sol Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A1P0', forme:'standard', dir:'U', startFret:3, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:0, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-5', dir:'U', startFret:0, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:0, active:true, duration:'1/16' },
    ],
  },
  'Sol Majeur Forme E': {
    folder: 'Sol Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-3', dir:'U', startFret:3, active:true, duration:'1/16' },
      { string:'A', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:2, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:2, active:true, duration:'1/16' },
    ],
  },
  'Sol Majeur Forme D': {
    folder: 'Sol Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'D', patKey:'A2P1', forme:'1-3', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:5, active:true, duration:'1/16' },
    ],
  },
  'Sol Majeur Forme C': {
    folder: 'Sol Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'A', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A2P1', forme:'1-2', dir:'U', startFret:7, active:true, duration:'1/16' },
    ],
  },
  'Sol Majeur Forme A': {
    folder: 'Sol Majeur',
    pinned: false,
    playMode: 'inverse',
    bpm: 80,
    steps: [
      { string:'A', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'D', patKey:'A3P1', forme:'1-2-4', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'G', patKey:'A3P1', forme:'1-3-4', dir:'U', startFret:9, active:true, duration:'1/16' },
    ],
  },
  'Les Astres': {
    folder: 'Plans',
    pinned: false,
    playMode: 'strict',
    bpm: 70,
    steps: [
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/4' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/8' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/8' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/8' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'e', patKey:'measure', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'muted', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/4' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:15, active:true, duration:'1/16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/8' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:13, active:true, duration:'1/8' },
      { string:'B', patKey:'rest', forme:'standard', dir:'U', startFret:13, active:true, duration:'1/16' },
      { string:'B', patKey:'A3P9', forme:'1-2', dir:'U', startFret:12, active:true, duration:'6:16' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'e', patKey:'rest', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
    ],
  },
  'Marc Knopfer Triades': {
    folder: 'Plans',
    pinned: true,
    playMode: 'strict',
    bpm: 152,
    steps: [
      { string:'e', patKey:'repeat-start', forme:'1-4', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:8 },
      { string:'e', patKey:'repeat-start', forme:'1-4', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:11, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:8 },
      { string:'e', patKey:'repeat-start', forme:'1-4', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'A2P1', forme:'1-4', dir:'D', startFret:12, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:13, active:true, duration:'1/16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/16', repeatCount:8 },
    ],
  },
  'Nuno #1': {
    folder: 'Plans',
    pinned: true,
    playMode: 'strict',
    bpm: 100,
    steps: [
      { string:'G', patKey:'repeat-start', forme:'1-3', dir:'D', startFret:7, active:true, duration:'1/4' },
      { string:'G', patKey:'A3P9', forme:'1-3', dir:'D', startFret:7, active:true, duration:'6:16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:6, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A3P9', forme:'1-4', dir:'U', startFret:6, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:6, active:true, duration:'6:16' },
      { string:'G', patKey:'A2P1', forme:'1-3', dir:'D', startFret:7, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'measure', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'G', patKey:'A3P9', forme:'1-4', dir:'D', startFret:6, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'e', patKey:'A3P9', forme:'1-5', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'G', patKey:'A2P1', forme:'1-4', dir:'D', startFret:6, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'measure', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'G', patKey:'A3P9', forme:'1-5', dir:'D', startFret:9, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:13, active:true, duration:'6:16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:13, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'G', patKey:'A2P1', forme:'1-5', dir:'D', startFret:9, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'measure', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4' },
      { string:'G', patKey:'A3P9', forme:'1-5', dir:'D', startFret:7, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:11, active:true, duration:'6:16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:7, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:11, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'6:16' },
      { string:'G', patKey:'A2P1', forme:'1-5', dir:'D', startFret:7, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'1/4', repeatCount:4 },
    ],
  },
  'Nuno #2': {
    folder: 'Plans',
    pinned: true,
    playMode: 'strict',
    bpm: 115,
    steps: [
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'U', startFret:12, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:12, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:8, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'U', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:10, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'e', patKey:'repeat-start', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'U', startFret:8, active:true, duration:'6:16' },
      { string:'e', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'6:16' },
      { string:'B', patKey:'A2P1', forme:'1-3', dir:'D', startFret:8, active:true, duration:'6:16' },
      { string:'e', patKey:'repeat-end', forme:'standard', dir:'U', startFret:5, active:true, duration:'6:16', repeatCount:2 },
    ],
  },
  'Arpège Am pos.5': {
    folder: 'Variations de Am',
    pinned: true,
    playMode: 'strict',
    bpm: 130,
    steps: [
      { string:'E', patKey:'A2P1', forme:'1-4', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'A', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'D', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-5', dir:'U', startFret:5, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P9', forme:'1-5', dir:'U', startFret:8, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'D', startFret:10, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-5', dir:'D', startFret:5, active:true, duration:'1/16' },
      { string:'D', patKey:'A1P0', forme:'standard', dir:'D', startFret:7, active:true, duration:'1/16' },
      { string:'A', patKey:'A1P0', forme:'standard', dir:'D', startFret:7, active:true, duration:'1/16' },
      { string:'E', patKey:'A1P0', forme:'standard', dir:'D', startFret:8, active:true, duration:'1/16' },
    ],
  },
  'Triades Dim (GBe) Suite': {
    folder: 'Plans',
    pinned: true,
    playMode: 'strict',
    bpm: 140,
    steps: [
      { string:'G', patKey:'A2P1', forme:'1-4', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:6, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:4, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:6, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'e', patKey:'measure', forme:'1-4', dir:'U', startFret:7, active:true, duration:'1/4' },
      { string:'G', patKey:'A2P1', forme:'1-4', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:10, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:12, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:13, active:true, duration:'1/16' },
      { string:'G', patKey:'A2P1', forme:'1-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'e', patKey:'A3P9', forme:'1-4', dir:'U', startFret:7, active:true, duration:'1/16' },
      { string:'B', patKey:'A1P0', forme:'standard', dir:'U', startFret:9, active:true, duration:'1/16' },
      { string:'G', patKey:'A1P0', forme:'standard', dir:'U', startFret:10, active:true, duration:'1/16' },
    ],
  },
};

const SK_OBSOLETE_PRESETS = [
  'C Maj pos.0','C Maj pos.0 ét.','C Penta pos.0','C Penta pos.0 ét.',
  'C Maj Forme A','C Maj Forme A ét.','C Penta Forme A','C Penta Forme A ét.',
  'C Maj Forme G','C Maj Forme G (8va)','C Maj Forme G ét.',
  'C Penta Forme G','C Penta Forme G (8va)','C Penta Forme G ét.',
  'C Maj Forme E','C Maj Forme E (8va)','C Maj Forme E ét.',
  'C Penta Forme E','C Penta Forme E (8va)','C Penta Forme E ét.',
  'C Maj Forme D','C Maj Forme D ét.','C Penta Forme D','C Penta Forme D ét.',
  'B8P3 Bumblebee',
  // Nettoyage — anciens presets retirés lors de la réorganisation de la bibliothèque
  'Arpège Em (sweep)', 'Triades Dim (GBe)', 'Dorien Am pos.5', 'Arpège Am (sweep)',
  'Do Majeur Forme C étendue', 'Do Penta Forme C', 'Do Penta Forme C étendue',
  'Do Majeur Forme A étendue', 'Do Penta Forme A', 'Do Penta Forme A étendue',
  'Do Majeur Forme G (8va)', 'Do Majeur Forme G étendue', 'Do Penta Forme G',
  'Do Penta Forme G (8va)', 'Do Penta Forme G étendue',
  'Do Majeur Forme E (8va)', 'Do Majeur Forme E étendue', 'Do Penta Forme E',
  'Do Penta Forme E (8va)', 'Do Penta Forme E étendue',
  'Do Majeur Forme D étendue', 'Do Penta Forme D', 'Do Penta Forme D étendue',
  'Sol Majeur Forme G (8va)', 'Sol Majeur Forme G étendue', 'Sol Penta Forme G',
  'Sol Penta Forme G (8va)', 'Sol Penta Forme G étendue',
  'Sol Majeur Forme E (8va)', 'Sol Majeur Forme E étendue', 'Sol Penta Forme E',
  'Sol Penta Forme E (8va)', 'Sol Penta Forme E étendue',
  'Sol Majeur Forme D étendue', 'Sol Penta Forme D', 'Sol Penta Forme D étendue',
  'Sol Majeur Forme C étendue', 'Sol Penta Forme C', 'Sol Penta Forme C étendue',
  'Sol Majeur Forme A étendue', 'Sol Penta Forme A', 'Sol Penta Forme A étendue',
];

// Organisation par défaut (dossiers + groupes + ordre) livrée avec l'app pour une installation neuve
const SK_DEFAULT_FOLDERS = ['Variations de Am', 'Patterns multi-cordes', 'Do Majeur', 'Sol Majeur', 'Plans'];
const SK_DEFAULT_GROUPS = {
  'Démo':  ['Patterns multi-cordes', 'Variations de Am', 'Plans'],
  'CAGED': ['Do Majeur', 'Sol Majeur'],
};
const SK_DEFAULT_PRESET_ORDER = [
  'Am Penta pos.5', 'Blues Am pos.5', 'Am Naturelle pos.5', 'Am Harm. pos.5',
  'Plan Contrarié (Am Penta)', 'Plan Mixte Rythmique', 'Plan Respiré (Am Penta)', 'Arpège Am pos.5',
  'B6P1 (1-2-3)', 'B6P1 (1-2-4)', 'B6P1 (1-3-4)', 'B6P1 (1-3-5)', 'B8P1 Bumblebee',
  'Do Majeur Forme C', 'Do Majeur Forme A', 'Do Majeur Forme G', 'Do Majeur Forme E', 'Do Majeur Forme D',
  'Sol Majeur Forme G', 'Sol Majeur Forme E', 'Sol Majeur Forme D', 'Sol Majeur Forme C', 'Sol Majeur Forme A',
  'Nuno #1', 'Nuno #2', 'Marc Knopfer Triades', 'Triades Dim (GBe) Suite', 'Les Astres',
];

function skSeedDefaultPresets() {
  const db = skLoadPresetsV2();

  // Migration ponctuelle (une seule fois) : réorganisation complète de la bibliothèque.
  // Tous les presets existants (natifs ou perso) passent dans "Mes créations",
  // tous les autres dossiers/sous-dossiers/groupes sont supprimés.
  if (!db.libraryResetV1) {
    Object.values(db.presets).forEach(p => { p.folder = 'Mes créations'; });
    db.folders = ['Mes créations'];
    db.groups = {};
    db.libraryResetV1 = true;
  }

  // Seed ponctuel (une seule fois) des dossiers/groupes/ordre par défaut — fusion non destructive,
  // ne touche jamais à une organisation déjà personnalisée par l'utilisateur.
  if (!db.defaultFoldersSeededV1) {
    SK_DEFAULT_FOLDERS.forEach(f => { if (!db.folders.includes(f)) db.folders.push(f); });
    if (!db.groups) db.groups = {};
    Object.entries(SK_DEFAULT_GROUPS).forEach(([g, children]) => {
      if (!db.groups[g]) db.groups[g] = [];
      children.forEach(c => { if (!db.groups[g].includes(c)) db.groups[g].push(c); });
    });
    if (!db.presetOrder || !db.presetOrder.length) db.presetOrder = SK_DEFAULT_PRESET_ORDER.slice();
    db.defaultFoldersSeededV1 = true;
  }

  SK_OBSOLETE_PRESETS.forEach(n => { delete db.presets[n]; });
  // Migration A1P1 → A1P0 : corriger tous les presets stockés
  Object.values(db.presets).forEach(p => {
    if (p.steps) p.steps.forEach(s => { if (s.patKey === 'A1P1') s.patKey = 'A1P0'; });
  });
  const deletedBuiltins = db.deletedBuiltins || [];
  Object.entries(SK_DEFAULT_PRESETS).forEach(([name, def]) => {
    if (deletedBuiltins.includes(name)) return; // supprimé par l'utilisateur — ne pas ré-intégrer
    const isNew = !db.presets[name];
    // Le dossier n'est fixé qu'à la toute première création — jamais réécrasé ensuite,
    // pour ne pas annuler le rangement de l'utilisateur à chaque rechargement de page.
    if (isNew) db.presets[name] = { folder: def.folder || 'Mes créations', pinned: !!def.pinned, createdAt:0 };
    db.presets[name].steps    = def.steps;
    db.presets[name].playMode = def.playMode;
    db.presets[name].bpm      = def.bpm;
  });
  skSavePresetsV2(db);
}

function skShowWelcomeForce() {
  const existing = document.getElementById('sk-welcome-overlay');
  if (existing) existing.remove();
  _skBuildWelcomeOverlay();
}

function skShowWelcome() {
  if (localStorage.getItem('dico-labo-welcome-done') === 'true') return;
  localStorage.setItem('dico-labo-welcome-done', 'true');
  _skBuildWelcomeOverlay();
}

function _skBuildWelcomeOverlay() {
  const SVG_LABO = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(8,13) rotate(-20)"><path d="M-3,-9 L-3,5 Q-3,9 0,9 Q3,9 3,5 L3,-9"/><line x1="-4" y1="-10.5" x2="4" y2="-10.5" stroke-width="2"/><path d="M-2.5,2 L-2.5,5 Q-2.5,8.5 0,8.5 Q2.5,8.5 2.5,5 L2.5,2 Z" fill="currentColor" stroke="none" opacity="0.9"/></g><circle cx="16" cy="9" r="2.5" fill="currentColor" stroke="none"/><line x1="18.5" y1="9" x2="18.5" y2="2"/><line x1="18.5" y1="2" x2="22" y2="3.5"/></svg>`;

  const SVG_COMPOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="13" y2="18"/><circle cx="18" cy="18" r="2.5" fill="currentColor" stroke="none"/><line x1="18" y1="15.5" x2="18" y2="10" stroke-width="1.5"/><line x1="18" y1="10" x2="21" y2="11" stroke-width="1.5"/></svg>`;

  const SVG_PIN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.5 6.5H21l-5.5 4 2 6.5L12 15l-5.5 4 2-6.5L3 8.5h6.5Z" fill="currentColor" stroke="none" opacity="0.15"/><path d="M12 2l2.5 6.5H21l-5.5 4 2 6.5L12 15l-5.5 4 2-6.5L3 8.5h6.5Z"/><line x1="12" y1="15" x2="12" y2="22"/></svg>`;

  const SVG_EYE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

  const SVG_SHARE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 4 20 20 20 20 17"/><line x1="12" y1="3" x2="12" y2="15"/><polyline points="8 7 12 3 16 7"/></svg>`;

  const overlay = document.createElement('div');
  overlay.id = 'sk-welcome-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)';

  const rows = [
    { svg: SVG_COMPOSE, title: 'Compose tes exercices',    body: 'Construis ta séquence pas à pas — pattern, corde, frette et valeur rythmique.' },
    { svg: SVG_PIN,     title: 'Pour commencer',           body: 'Sélectionne un preset épinglé, ou pars de zéro en ajoutant tes premiers pas.' },
    { svg: SVG_EYE,     title: 'Visualise en temps réel',  body: 'La tablature se génère automatiquement et le curseur suit la lecture.' },
    { svg: SVG_SHARE,   title: 'Sauvegarde & partage',     body: 'Exporte tes créations via un code — archive ou partage tes exercices avec d\'autres guitaristes.' },
  ];

  overlay.innerHTML = `
    <div style="background:var(--card);border-radius:18px;max-width:380px;width:100%;padding:28px 24px 24px;box-shadow:0 8px 40px rgba(0,0,0,.4)">
      <div style="text-align:center;margin-bottom:20px">
        <div style="display:flex;justify-content:center;margin-bottom:10px;color:var(--text2)">${SVG_LABO}</div>
        <div style="font-size:20px;font-weight:800;color:var(--text)">Voici le Labo</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px;margin-bottom:22px">
        ${rows.map(r => `
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:8px;background:var(--bg);display:flex;align-items:center;justify-content:center;color:var(--text2)">${r.svg}</div>
          <div><div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:2px">${r.title}</div><div style="color:var(--text2);font-size:12px;line-height:1.5">${r.body}</div></div>
        </div>`).join('')}
      </div>
      <button onclick="document.getElementById('sk-welcome-overlay').remove()" style="width:100%;background:var(--blue);color:#fff;border:none;padding:13px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;transition:opacity .15s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        C'est parti !
      </button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function skInit() {
  skSeedDefaultPresets();
  skBuildStepsUI();
  skBuildFavBar();
  if (skLastAssignments.length) skGenerateAndShow();
  else if (skSteps.length)      skGenerateAndShow();
  skRenderProgTable(skCurrentPreset);

  // Stop auto dès qu'une interaction est détectée (hors zones exclues)
  document.addEventListener('mousedown', (e) => {
    if (!skIsPlaying) return;
    const t = e.target;
    if (t.closest('header'))        return; // BPM, métronome, trainer, raccourcis header
    if (t.closest('#sk-prog-wrap')) return; // tableau de progression (coches)
    if (t.closest('textarea'))      return; // notes personnelles
    if (t.closest('#sk-tab-wrap'))  return; // la tab gère elle-même play/stop
    stopShaker();
  }, true); // capture : intercepté avant tout stopPropagation()
}
