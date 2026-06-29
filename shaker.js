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
const SK_MAX_STEPS      = 16;
const SK_DURATION_MULT  = { '1/4':1, '1/8':0.5, '1/16':0.25, '1/8t':1/3 };
const SK_REST_TAB_WIDTH = 4;
const SK_PRESETS_KEY    = 'shaker_presets';

// ── ÉTAT ──────────────────────────────────────────────────────────────────────
let skSteps           = [];
let skLastAssignments = [];
let skPlayMode        = 'inverse';
let skPatronOffset    = 1;
let skLoopTimer       = null;
let skIsPlaying       = false;
let skOpenStep        = -1;  // index de l'accordéon ouvert (-1 = aucun)

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

function skSetStepString(i, val)   { skSteps[i].string   = val;   skGenerateAndShow(); }
function skSetStepForme(i, forme)  { skSteps[i].forme     = forme; skGenerateAndShow(); }
function skSetStepDuration(i, d)   { skSteps[i].duration  = d;     skGenerateAndShow(); }

function skSetStepDir(i, d) {
  skSteps[i].dir = d;
  skBuildStepsUI(true);
  skGenerateAndShow();
}

function skSetStepPat(i, key) {
  skSteps[i].patKey = key;
  if (key && key !== 'rest') skSteps[i].forme = skGetFormes(key)[0] || 'standard';
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
  const DUR_LABELS = { '1/4':'♩', '1/8':'♪', '1/16':'𝅘𝅥𝅯', '1/8t':'T' };

  list.innerHTML = skSteps.map((st, i) => {
    const isRest    = st.patKey === 'rest';
    const formes    = (!isRest && st.patKey) ? skGetFormes(st.patKey) : [];
    const dur       = st.duration || '1/4';
    const patName   = st.patKey || '—';
    const formeName = st.forme || (formes[0] || '');
    const isOpen    = keepOpen && i === skOpenStep;
    const fretIsOffset = st.startFret !== 5;

    const strOptions = SK_STRING_OPTIONS.map(s =>
      `<option value="${s}" ${st.string === s ? 'selected':''}>${s}</option>`
    ).join('');

    const patOptions = SK_PAT_KEYS.map(k => {
      const ff    = skGetFormes(k)[0] || 'standard';
      const notes = skGetNotes(k, ff, st.dir || 'U');
      const ns    = notes.length ? notes.map(n => '-'+n).join('')+'-' : '?';
      return `<option value="${k}" ${st.patKey === k ? 'selected':''}>${k} : ${ns}</option>`;
    }).join('');

    const formeOptions = formes.map(f =>
      `<option value="${f}" ${st.forme === f ? 'selected':''}>${f}</option>`
    ).join('');

    // Résumé affiché dans le header (fermé)
    const summary = isRest
      ? '⊘ Pause'
      : (patName !== '—'
          ? `${patName}${formeName ? ' / '+formeName : ''} · ${st.string} · ${st.dir==='U'?'↑':'↓'} · ${DUR_LABELS[dur]||dur}`
          : '— choisir un pattern —');

    return `
<div class="sk-step-card${isOpen ? ' open' : ''}${st.active ? '' : ' inactive'}">
  <div class="sk-step-header" onclick="skToggleStepHeader(${i})">
    <button class="sk-active-toggle ${st.active ? 'on' : ''}" onclick="event.stopPropagation();skToggleStepActive(${i})">${st.active ? '●' : '○'}</button>
    <div class="sk-step-badge">${i+1}</div>
    <div class="sk-step-name">${summary}</div>
    <div class="sk-step-arrow">▶</div>
  </div>
  <div class="sk-step-content">
    <div class="sk-step-controls">

      <div class="sk-ctrl-block">
        <div class="sk-control-label">Pattern</div>
        <select class="sk-pat-select" onchange="skSetStepPat(${i},this.value)">
          <option value="" ${!st.patKey && !isRest ? 'selected':''}>— choisir —</option>
          <option value="rest" ${isRest ? 'selected':''}>⊘ Pause</option>
          ${patOptions}
        </select>
      </div>

      ${!isRest ? `
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
            <option value="1/4"  ${dur==='1/4'  ? 'selected':''}>1/4 — Noire</option>
            <option value="1/8"  ${dur==='1/8'  ? 'selected':''}>1/8 — Croche</option>
            <option value="1/16" ${dur==='1/16' ? 'selected':''}>1/16 — D.croche</option>
            <option value="1/8t" ${dur==='1/8t' ? 'selected':''}>Triolet</option>
          </select>
        </div>
      </div>

      <div class="sk-ctrl-block">
        <div class="sk-control-label">Fret de départ <span style="color:var(--text2);font-weight:400">(défaut = 5)</span></div>
        <div class="sk-stepper">
          <button onclick="skChangeStepFret(${i},-1)">−</button>
          <span class="sk-stepper-val ${fretIsOffset ? 'offset' : ''}">${st.startFret}</span>
          <button onclick="skChangeStepFret(${i},+1)">+</button>
        </div>
      </div>
      ` : ''}

      <div class="sk-step-actions">
        <button onclick="skMoveStep(${i},-1)" ${i===0?'disabled':''} class="sk-act-btn">▲</button>
        <button onclick="skMoveStep(${i},+1)" ${i===skSteps.length-1?'disabled':''} class="sk-act-btn">▼</button>
        <button onclick="skDuplicateStep(${i})" ${atMax?'disabled':''} class="sk-act-btn">⧉</button>
        <button onclick="skRemoveStep(${i})" class="sk-act-btn del">✕</button>
      </div>

    </div>
  </div>
</div>`;
  }).join('');
}

// ── ASSIGNATIONS ──────────────────────────────────────────────────────────────
function skBuildAssignments() {
  return skSteps.map(st => {
    if (!st.active) return null;
    if (st.patKey === 'rest') {
      return { string:null, notes:[], isRest:true, duration: st.duration || '1/4' };
    }
    if (!st.patKey) return null;
    const forme = st.forme || 'standard';
    const raw   = skGetNotes(st.patKey, forme, st.dir || 'U');
    if (!raw.length) return null;
    return { string: st.string, notes: skTransposedNotes(raw, st.startFret ?? 5), duration: st.duration || '1/4' };
  }).filter(Boolean);
}

// ── RENDU TABLATURE ───────────────────────────────────────────────────────────
function skRenderStepCascade(assignments) {
  const stepWidths = assignments.map(a =>
    a.isRest ? SK_REST_TAB_WIDTH :
    a.notes.reduce((sum, n) => sum + 2 + String(n).length, 0)
  );
  let pos = 0;
  const stepStarts = stepWidths.map(w => { const s = pos; pos += w; return s; });
  const totalWidth = pos;

  return SK_DISPLAY_ORDER.map(s => {
    const chars = Array(totalWidth).fill('-');
    assignments.forEach((a, i) => {
      if (a.isRest || a.string !== s) return;
      a.notes.map(n => '--' + n).join('').split('').forEach((c, j) => {
        chars[stepStarts[i] + j] = c;
      });
    });
    return `${s} |${chars.join('')}|`;
  }).join('\n');
}

// ── MESURE 2 ──────────────────────────────────────────────────────────────────
function skMirrorOf(assignments) {
  return assignments.slice().reverse().map(a =>
    a.isRest ? { ...a } : { ...a, notes: [...a.notes].reverse() }
  );
}

function skBuildMeasure2(assignments) {
  if (skPlayMode === 'strict' || skPlayMode === 'mirror') return null;
  if (skPlayMode === 'inverse') return skMirrorOf(assignments);
  return assignments.map(a =>
    a.isRest ? { ...a } : { ...a, notes: a.notes.map(n => n === 0 ? 0 : n + skPatronOffset) }
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
    wrap.innerHTML = `<div class="sk-tab-display"><div class="sk-empty-state">Assigne au moins un pattern pour voir la tablature</div></div>`;
    skLastAssignments = [];
    skUpdateInfoBar([]);
    return;
  }

  const displayAssignments = skPlayMode === 'mirror' ? skMirrorOf(assignments) : assignments;
  skLastAssignments = displayAssignments;

  const noteCount = displayAssignments.filter(a => !a.isRest).reduce((s,a) => s + a.notes.length, 0);
  const m2 = skBuildMeasure2(assignments);

  const m1label = skPlayMode === 'mirror'
    ? `Mesure 1 — ${noteCount} notes · descendant`
    : `Mesure 1 — ${noteCount} notes · ${assignments.length} pas`;

  let html = `
    <div class="sk-tab-measure-header">${m1label}</div>
    <div class="sk-tab-display">${skRenderStepCascade(displayAssignments)}</div>`;

  if (m2) {
    html += `
    <div class="sk-tab-sep"></div>
    <div class="sk-tab-measure-header">${skModeLabel2()}</div>
    <div class="sk-tab-display">${skRenderStepCascade(m2)}</div>`;
  }

  wrap.innerHTML = html;
  skUpdateInfoBar(assignments);
}

function skUpdateInfoBar(assignments) {
  const bar = document.getElementById('sk-info-bar');
  if (!bar) return;
  if (!assignments.length) { bar.innerHTML = ''; return; }
  const noteSteps = assignments.filter(a => !a.isRest);
  const restSteps = assignments.filter(a => a.isRest);
  const noteCount = noteSteps.reduce((s, a) => s + a.notes.length, 0);
  const inactive  = skSteps.filter(s => !s.active).length;
  const durations = new Set(assignments.map(a => a.duration));
  const durLabels = { '1/4':'noires', '1/8':'croches', '1/16':'double-croches', '1/8t':'triolets' };
  const durText   = durations.size === 1 ? ' · ' + (durLabels[assignments[0].duration] || '') : ' · mixte';
  let html = `<span class="sk-info-chip ok">${assignments.length} pas · ${noteCount} notes${durText}</span>`;
  if (restSteps.length) html += `<span class="sk-info-chip rest">${restSteps.length} pause${restSteps.length > 1 ? 's':''}</span>`;
  if (inactive)         html += `<span class="sk-info-chip warn">${inactive} inactif${inactive > 1 ? 's':''}</span>`;
  bar.innerHTML = html;
}

// ── MODE DE LECTURE ────────────────────────────────────────────────────────────
function skSetPlayMode(m) {
  skPlayMode = m;
  document.querySelectorAll('#sk-mode-seg button').forEach(b =>
    b.classList.toggle('active', b.classList.contains('sk-mode-' + m))
  );
  const ctrl = document.getElementById('sk-patron-offset-ctrl');
  if (ctrl) ctrl.style.display = m === 'patron' ? 'flex' : 'none';
  skGenerateAndShow();
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
  skBuildStepsUI();
  skGenerateAndShow();
  skBuildPresetSelect();
}

// ── AUDIO ─────────────────────────────────────────────────────────────────────
function skFretFreq(string, fret) {
  return (SK_OPEN_FREQS[string] || SK_OPEN_FREQS.e) * Math.pow(2, fret / 12);
}

function skToTimedEvents(arr, baseNoteDur) {
  let t = 0;
  const events = [];
  arr.forEach(a => {
    const mult = SK_DURATION_MULT[a.duration || '1/4'];
    const nd   = baseNoteDur * mult;
    if (!a.isRest && a.notes.length) {
      a.notes.forEach((n, j) => {
        events.push({ string: a.string, fret: n, startTime: t + j * nd, dur: nd });
      });
      t += a.notes.length * nd;
    } else {
      t += nd;
    }
  });
  return { events, totalTime: t };
}

function playShaker() {
  if (!skLastAssignments.length) {
    skGenerateAndShow();
    if (!skLastAssignments.length) return;
  }

  // Stopper l'audio existant
  stopShaker();
  if (typeof metroStop === 'function') metroStop(false);

  const bpm     = HCTRL.bpm;
  const quarter = 60.0 / bpm;

  // Contexte partagé avec le reste de l'app
  const ctx = previewCtx();
  const masterGain = ctx.createGain();
  masterGain.gain.value = (SETTINGS.patVolume || 75) * 0.02;
  masterGain.connect(ctx.destination);

  // Enregistrement dans PREVIEW pour que stopClickLoop etc. fonctionnent
  PREVIEW.masterGain = masterGain;
  PREVIEW.patId      = '__shaker__';
  PREVIEW.bpm        = bpm;
  PREVIEW.clickNotes = SETTINGS.clickSubdiv || 4;
  skIsPlaying        = true;

  const m2  = skBuildMeasure2(skLastAssignments);
  const seq = [...skLastAssignments, ...(m2 || [])];
  const { events, totalTime } = skToTimedEvents(seq, quarter);

  // Décompte (-4) si activé
  const countInQuarter = bpm < 60 ? quarter / 2 : quarter;
  const t0             = ctx.currentTime + 0.1;

  if (PREVIEW.countIn) {
    for (let i = 0; i < 4; i++) {
      const t = t0 + i * countInQuarter;
      // Clic de décompte (même son que le métronome)
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

  // Boucle principale
  let loopStart = patStart;
  const scheduleLoop = () => {
    if (!skIsPlaying || PREVIEW.patId !== '__shaker__') return;
    events.forEach(e => {
      if (typeof pluckNote === 'function') {
        pluckNote(ctx, masterGain, skFretFreq(e.string, e.fret), loopStart + e.startTime);
      }
    });
    loopStart += totalTime;
    const delay = Math.max(0, (loopStart - ctx.currentTime - 0.15) * 1000);
    skLoopTimer = setTimeout(scheduleLoop, delay);
  };
  scheduleLoop();

  // Clic + pulse header (utilise les fonctions de audio.js)
  if (PREVIEW.click && typeof startClickLoop === 'function')   startClickLoop(patStart);
  if (typeof startPulseTicker === 'function') startPulseTicker(patStart);

  // UI
  const playBtn = document.getElementById('sk-play-btn');
  const stopBtn = document.getElementById('sk-stop-btn');
  if (playBtn) playBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = '';
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

  // UI
  const playBtn = document.getElementById('sk-play-btn');
  const stopBtn = document.getElementById('sk-stop-btn');
  if (playBtn) playBtn.style.display = '';
  if (stopBtn) stopBtn.style.display = 'none';
}

// ── PRESETS ───────────────────────────────────────────────────────────────────
function skLoadPresets() {
  try { return JSON.parse(localStorage.getItem(SK_PRESETS_KEY) || '{}'); }
  catch(e) { return {}; }
}

function skSavePresetsToStorage(presets) {
  localStorage.setItem(SK_PRESETS_KEY, JSON.stringify(presets));
}

function skBuildPresetSelect(selectName) {
  const presets = skLoadPresets();
  const sel     = document.getElementById('sk-preset-select');
  if (!sel) return;
  const names   = Object.keys(presets).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="">— Mes presets —</option>` +
    names.map(n => `<option value="${n}">${n}</option>`).join('');
  if (selectName && names.includes(selectName)) {
    sel.value = selectName;
    sel.classList.add('loaded');
  } else {
    sel.value = '';
    sel.classList.remove('loaded');
  }
  const delBtn = document.getElementById('sk-delete-preset-btn');
  if (delBtn) delBtn.disabled = !sel.value;
}

function skOnPresetChange(sel) {
  const delBtn = document.getElementById('sk-delete-preset-btn');
  if (delBtn) delBtn.disabled = !sel.value;
  sel.classList.toggle('loaded', !!sel.value);
  if (!sel.value) return;
  const saved = skLoadPresets()[sel.value];
  if (!saved) return;
  stopShaker();
  skSteps = saved.map(s => ({ ...s }));
  skBuildStepsUI();
  skGenerateAndShow();
}

function skSavePreset() {
  if (!skSteps.length) return;
  const name = prompt('Nom du preset :');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  const presets = skLoadPresets();
  presets[trimmed] = skSteps.map(s => ({ ...s }));
  skSavePresetsToStorage(presets);
  skBuildPresetSelect(trimmed);
}

function skDeletePreset() {
  const sel = document.getElementById('sk-preset-select');
  if (!sel || !sel.value) return;
  if (!confirm(`Supprimer le preset "${sel.value}" ?`)) return;
  const presets = skLoadPresets();
  delete presets[sel.value];
  skSavePresetsToStorage(presets);
  skBuildPresetSelect();
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
.sk-preset-bar { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; position: relative; }
.sk-preset-select {
  flex: 1; background: var(--card); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 13px; padding: 7px 10px;
  cursor: pointer; outline: none;
}
.sk-preset-select.loaded { font-weight: 600; color: var(--blue); border-color: var(--blue); }
.sk-menu-btn {
  border: none; background: transparent; font-size: 16px; width: 32px; height: 32px;
  padding: 0; cursor: pointer; color: var(--text2); display: flex; align-items: center;
  justify-content: center;
}
.sk-menu { display: none; position: absolute; top: 36px; right: 0; background: var(--card);
  border: 1.5px solid var(--border); border-radius: 8px; overflow: hidden; z-index: 100;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.sk-menu.open { display: block; }
.sk-menu button { width: 100%; text-align: left; border: none; background: transparent;
  padding: 10px 14px; font-size: 13px; cursor: pointer; color: var(--text); border-bottom: 1px solid var(--border);
}
.sk-menu button:last-child { border-bottom: none; }
.sk-menu button:hover { background: var(--border); }
.sk-menu button.save { color: var(--green); }
.sk-menu button.del { color: var(--red); }

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

.sk-active-toggle {
  border: none; background: transparent; cursor: pointer; padding: 4px;
  font-size: 15px; line-height: 1; flex-shrink: 0; color: var(--border);
}
.sk-active-toggle.on { color: var(--green); }

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
.sk-step-actions {
  display: flex; gap: 0; border-top: 1.5px solid var(--border); margin-top: 12px;
}
.sk-act-btn {
  flex: 1; border: none; background: transparent; padding: 11px 6px;
  font-size: 14px; color: var(--text2); cursor: pointer; border-right: 1px solid var(--border);
}
.sk-act-btn:last-child { border-right: none; }
.sk-act-btn:disabled { opacity: .2; cursor: not-allowed; }
.sk-act-btn:active { background: var(--border); }
.sk-act-btn.del { color: var(--red); }

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
.sk-seg button.active.sk-mode-strict  { background: #1e5f8a; color: #fff; font-weight: 700; }
.sk-seg button.active.sk-mode-mirror  { background: #1a5a6a; color: #fff; font-weight: 700; }
.sk-seg button.active.sk-mode-inverse { background: var(--blue); color: #fff; font-weight: 700; }
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
.sk-actions { display: flex; gap: 8px; margin-bottom: 14px; }
.sk-btn {
  flex: 1; padding: 11px 8px; border-radius: var(--radius); border: none;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.sk-btn:active { transform: scale(0.97); }
.sk-btn-play  { background: var(--green); color: #fff; }
.sk-btn-stop  { background: var(--red); color: #fff; }
.sk-btn-clear { background: var(--card); border: 1.5px solid var(--border); color: var(--text2); }

/* Tab display */
.sk-tab-wrap {
  background: var(--card); border-radius: var(--radius);
  border: 1.5px solid var(--border); overflow: hidden;
}
.sk-tab-measure-header {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: var(--text2);
  padding: 8px 14px 4px; border-bottom: 1px solid var(--border);
}
.sk-tab-display {
  font-family: 'Courier New', Courier, monospace; font-size: 13px;
  line-height: 2; color: var(--text); overflow-x: auto; white-space: pre;
  padding: 10px 14px;
}
.sk-tab-sep { height: 1px; background: var(--border); }
.sk-empty-state {
  color: var(--text2); text-align: center;
  padding: 32px 16px; font-size: 13px; line-height: 1.7;
}

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

  <div class="sk-preset-bar">
    <select class="sk-preset-select" id="sk-preset-select" onchange="skOnPresetChange(this)">
      <option value="">— Mes presets —</option>
    </select>
    <button class="sk-menu-btn" onclick="skToggleMenu()" title="Menu">⋮</button>
    <div class="sk-menu" id="sk-menu">
      <button class="save" onclick="skSavePreset(); skToggleMenu();">Sauvegarder</button>
      <button class="del" id="sk-delete-preset-btn" onclick="skDeletePreset(); skToggleMenu();" disabled>Supprimer</button>
    </div>
  </div>

  <div class="sk-section-label">
    Séquence — <span id="sk-step-count">${skSteps.length}</span> / ${SK_MAX_STEPS} pas
  </div>
  <div class="sk-steps-list" id="sk-steps-list"></div>
  <button class="sk-add-step-btn" id="sk-add-step-btn" onclick="skAddStep()" ${skSteps.length >= SK_MAX_STEPS ? 'disabled' : ''}>＋ Ajouter un pas</button>

  <div class="sk-section-label">Mode de lecture</div>
  <div style="display:flex;gap:8px;margin-bottom:18px;align-items:center">
    <div class="sk-seg" id="sk-mode-seg" style="flex:1">
      <button class="sk-mode-strict ${skPlayMode==='strict'?'active':''}"   onclick="skSetPlayMode('strict')">Strict</button>
      <button class="sk-mode-mirror ${skPlayMode==='mirror'?'active':''}"   onclick="skSetPlayMode('mirror')">Miroir</button>
      <button class="sk-mode-inverse ${skPlayMode==='inverse'?'active':''}" onclick="skSetPlayMode('inverse')">Inversé</button>
      <button class="sk-mode-patron ${skPlayMode==='patron'?'active':''}"   onclick="skSetPlayMode('patron')">Patron</button>
    </div>
    <div class="sk-patron-ctrl" id="sk-patron-offset-ctrl" style="${skPlayMode==='patron'?'display:flex':'display:none'}">
      <button onclick="skChangePatronOffset(-1)">−</button>
      <span class="sk-patron-val" id="sk-patron-offset-val">+${skPatronOffset}</span>
      <button onclick="skChangePatronOffset(+1)">+</button>
    </div>
  </div>

  <div class="sk-info-bar" id="sk-info-bar"></div>

  <div class="sk-actions">
    <button class="sk-btn sk-btn-play" id="sk-play-btn" onclick="playShaker(); skToggleMenu()" style="${isPlaying?'display:none':''}">▶ Play</button>
    <button class="sk-btn sk-btn-stop" id="sk-stop-btn" onclick="stopShaker()" style="${isPlaying?'':'display:none'}">■ Stop</button>
    <button class="sk-btn sk-btn-clear" onclick="skClearAll(); skToggleMenu()">Reset</button>
  </div>

  <div class="sk-tab-wrap" id="sk-tab-wrap">
    <div class="sk-tab-display">
      <div class="sk-empty-state">Ajoute au moins un pas pour composer ton exercice</div>
    </div>
  </div>

</div>
`;
}

// ── INIT (appelé après le premier rendu) ──────────────────────────────────────
function skInit() {
  skBuildStepsUI();
  skBuildPresetSelect();
  if (skLastAssignments.length) skGenerateAndShow();
  else if (skSteps.length)      skGenerateAndShow();

  // Fermer le menu au clic en dehors
  setTimeout(() => {
    const menu = document.getElementById('sk-menu');
    const menuBtn = document.querySelector('.sk-menu-btn');
    if (menu) {
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !menuBtn.contains(e.target) && menu.classList.contains('open')) {
          menu.classList.remove('open');
        }
      });
    }
  }, 0);
}
