// ─── RENDER ───────────────────────────────────────────────────────────────────
// Extrait de index.html lors du refactor v1.15
// Contient : render(), renderParcours(), renderPatterns(), renderPatternGroupBody(),
//            renderSessionCalendar(), renderCalendarAccordion(),
//            renderGlobalProgress(), renderProgress(), renderJournal()
// Dépendances (globales) : state, SETTINGS (state.js) · PATTERNS, TEMPOS (data.js)
//                          PREVIEW, METRO (audio.js) · HCTRL (index.html)
// ─────────────────────────────────────────────────────────────────────────────

// ─── RENDER ───────────────────────────────────────────────────────────────────
let journalSubTab = 'journal'; // 'journal' | 'stats'

const DIR_BTN_COLORS = {
  U: { bg:'rgba(26,122,94,.13)',  color:'#1a7a5e', border:'#1a7a5e' },
  D: { bg:'rgba(184,74,32,.13)',  color:'#b84a20', border:'#b84a20' },
  M: { bg:'rgba(107,79,170,.13)', color:'#6b4faa', border:'#6b4faa' }
};

/**
 * Change le sous-onglet du journal et redessine
 * @param {string} tab - Onglet cible : 'journal' | 'stats'
 */
function setJournalSubTab(tab) {
  journalSubTab = tab;
  render();
  // Scroll to top so the segmented control stays in view
  const el = document.getElementById('content');
  if (el) el.scrollTop = 0;
}

/**
 * Redessine le contenu principal selon l'onglet actif (state.tab)
 * Routes vers renderParcours(), renderPatterns(), renderGammes(), renderProgress(), ou renderJournalPage()
 */
function render() {
  const el = document.getElementById('content');
  if      (state.tab === 'patterns') el.innerHTML = renderPatterns();

  else if (state.tab === 'journal')  el.innerHTML = renderJournalPage();
  else if (state.tab === 'shaker')   { el.innerHTML = renderShaker(); skInit(); }
  else                               el.innerHTML = renderProgress();
  metroPostRender();
  refreshAllTraceDisplays();
  if (typeof initFormeFades === 'function') requestAnimationFrame(initFormeFades);
}


// ── CHALLENGE ALÉATOIRE QUOTIDIEN ──

/**
 * Génère 2 patterns aléatoires quotidiens, cachés par jour
 * Priorité : patterns non découverts, puis progression croissante
 * @returns {Array<Object>} Tableau de 2 patterns max sélectionnés
 */
function getDailyRandomPatterns() {
  const today = new Date().toISOString().slice(0, 10);
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem('dicoDailyChallenge') || '{}'); } catch(e) { console.warn('getDailyRandomPatterns:', e); }

  if (cache.date === today && cache.patterns) {
    return cache.patterns.map(id => PATTERNS.find(p => p.id === id)).filter(Boolean);
  }

  // Dédupliquer par groupe — patterns normaux uniquement (pas gammes/spéciaux)
  const seen = new Set();
  const groups = [];
  PATTERNS.forEach(p => {
    if (p.special) return;
    const gkey = p.cat + 'P' + p.num;
    if (seen.has(gkey)) return;
    seen.add(gkey);

    // Calculer progression réelle sur toutes les directions du groupe
    let total = 0, done = 0, discovered = false;
    PATTERNS.filter(q => q.cat + 'P' + q.num === gkey).forEach(q => {
      [1].forEach(f => INTERPS.forEach(i => TEMPOS.forEach(t => {
        const pk = getProgressKey(q.id, f, q.dir, i, t);
        total++;
        if (state.progress[pk]) { done++; discovered = true; }
      })));
    });
    const avgProgress = total ? done / total : 0;
    groups.push({ p, gkey, discovered, avgProgress });
  });

  // Trier : non découverts d'abord, puis progression croissante
  groups.sort((a, b) => {
    if (a.discovered !== b.discovered) return a.discovered ? 1 : -1;
    return a.avgProgress - b.avgProgress;
  });

  // Choisir 2 parmi les 8 premiers candidats (aléa pour varier)
  const candidates = groups.slice(0, Math.min(8, groups.length));
  const selected = [];
  for (let i = 0; i < Math.min(2, candidates.length); i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    selected.push(candidates[idx].p);
    candidates.splice(idx, 1);
  }

  cache = { date: today, patterns: selected.map(p => p.id) };
  localStorage.setItem('dicoDailyChallenge', JSON.stringify(cache));

  return selected;
}

// ── [PARCOURS supprimé en v3 — voir branche archive/parcours-v2] ──

function renderParcours() {
  const etapeNames = { 1: 'La base', 2: "L'indépendance", 3: "L'extension" };
  const etapeDescs = {
    1: `<em>Premiers pas dans l'app et sur les patterns : <strong>les déliateurs</strong>. Des exercices simples, mais fondateurs. Travaille lentement, sans forcer — et prête attention dès maintenant au <strong>sens du médiator</strong> : c'est une habitude essentielle à ancrer dès le départ. Quand les doigts se meuvent librement, tout le reste devient possible.</em>`,
    2: `<em>Les doigtés se complexifient, le contrôle s'affine. <strong>L'indépendance</strong>, c'est la capacité de chaque doigt à agir sans les autres. Ces exercices demandent des doigtés plus contraignants et plus d'attention. Travaille lentement pour ancrer chaque geste — c'est ainsi que naît la précision. Quand tu maîtrises le lent, la vitesse devient accessible.</em>`,
  };

  // Collecter les étapes et groupes
  const etapes = {};
  PATTERNS.forEach(p => {
    if (!p.etape) return;
    const key = p.cat + 'P' + p.num;
    if (!etapes[p.etape]) etapes[p.etape] = {};
    if (!etapes[p.etape][key]) etapes[p.etape][key] = { order: p.etapeOrder, patterns: [] };
    etapes[p.etape][key].patterns.push(p);
  });

  if (!Object.keys(etapes).length) {
    return `<div style="text-align:center;padding:40px;color:var(--text2)">
      <p>Aucun parcours défini pour l'instant.</p>
    </div>`;
  }

  let html = '';

  Object.keys(etapes).sort((a,b) => a-b).forEach(etapeNum => {
    const groups = etapes[etapeNum];
    const name = etapeNames[etapeNum] || `Étape ${etapeNum}`;

    // Progression globale de l'étape
    let totalE = 0, doneE = 0;
    Object.values(groups).forEach(g => {
      g.patterns.forEach(p => {
        [1].forEach(f => INTERPS.forEach(i => TEMPOS.forEach(t => {
          totalE++;
          if (state.progress[getProgressKey(p.id, f, p.dir, i, t)]) doneE++;
        })));
      });
    });
    const pctE = totalE ? Math.round(doneE / totalE * 100) : 0;

    // Couleurs par étape : clair → moyen → foncé
    const etapeColors = {
      1: '#A8D5E2',  // Bleu clair
      2: '#4A9AB5',  // Bleu moyen
      3: '#0F4C5C'   // Bleu foncé
    };
    const bgColor = etapeColors[etapeNum] || 'var(--blue)';
    const colorE = pctE >= 80 ? 'var(--green)' : pctE >= 40 ? 'var(--orange)' : 'var(--blue)';

    // Accordéon étape — fermé par défaut
    if (state.etapeOpen[etapeNum] === undefined) state.etapeOpen[etapeNum] = false;
    const isEtapeOpen = state.etapeOpen[etapeNum];

    // Une seule fenêtre avec header + accordéon fusionnés
    html += `
    <div style="background:${bgColor};border-radius:var(--radius);box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:16px;overflow:hidden">
      <div style="padding:13px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none"
        onclick="toggleEtape(${etapeNum})">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.6)">Étape ${etapeNum}</div>
          <div style="font-size:19px;font-weight:800;color:#fff">${name}</div>
        </div>
        <div style="text-align:right;margin-left:16px">
          <div style="font-size:28px;font-weight:800;color:${pctE>0?'#fff':'rgba(255,255,255,.4)'}">${pctE}%</div>
          <div style="height:4px;background:rgba(255,255,255,.2);border-radius:2px;width:60px;margin-top:6px"><div style="height:4px;background:rgba(255,255,255,.6);border-radius:2px;width:${pctE}%"></div></div>
        </div>
        <svg id="etape-arrow-${etapeNum}" style="transition:transform .2s;transform:rotate(${isEtapeOpen?'180':'0'}deg);margin-left:12px;flex-shrink:0"
          width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
          <polyline points="2 4 7 10 12 4"/>
        </svg>
      </div>`;

    // Trier par etapeOrder
    const sorted = Object.entries(groups).sort((a,b) => a[1].order - b[1].order);

    html += `<div id="etape-content-${etapeNum}" style="border-top:2px solid rgba(255,255,255,.2);padding:10px;display:${isEtapeOpen ? 'block' : 'none'}">`;
    if (etapeDescs[etapeNum]) {
      html += `<div style="font-size:13px;font-style:italic;line-height:1.65;color:rgba(255,255,255,.88);background:rgba(0,0,0,.12);border-radius:8px;padding:11px 14px;margin-bottom:12px">${etapeDescs[etapeNum]}</div>`;
    }
    sorted.forEach(([key, group]) => {
      const base = group.patterns[0];
      const pct = getGroupPct(key);
      const color = 'var(--blue)';
      const barColor = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--orange)' : 'var(--blue)';
      const isOpen = state.parcoursOpen === key;
      html += `
      <div id="parc-card-${key}" style="background:var(--card);border-radius:var(--radius);box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:8px;overflow:hidden">
        <div style="padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="toggleParcours('${key}')">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex-shrink:0">${group.order}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:700">${base.name}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">${key} · ${diffTag(base.difficulty)}</div>
            <div class="progress-bar-wrap" style="margin-top:6px"><div id="grpbar-${key}" class="progress-bar" style="width:${pct}%;background:${barColor}"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <div id="grppct-${key}" style="font-size:20px;font-weight:800;color:${color}">${pct > 0 ? pct+'%' : '—'}</div>
            <button onclick="toggleFavorite('${key}',event)"
              style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center">
              ${heartSVG(!!state.favorites[key])}
            </button>
            <span style="font-size:16px;color:var(--text2)">${isOpen ? '▲' : '▼'}</span>
          </div>
        </div>
        ${isOpen ? (() => {
          let inner = '<div style="border-top:1px solid var(--border);padding:12px 14px 0">';
          inner += renderPatternGroupBody(group.patterns, key);
          inner += '</div>';
          return inner;
        })() : ''}
      </div>`;
    });
    html += `</div>`; // ferme etape-content

    html += `</div>`; // ferme le wrapper accordéon

  });


  return html;
}

// ── GRILLE DE PROGRESSION — constructeur de lignes partagé ──────────────────

/**
 * Détermine l'interprétation valide pour un pattern (respecte customInterps si présent)
 * @param {Object} pat - Pattern object
 * @returns {string} Clé d'interprétation valide
 */
function getValidInterpForPat(pat) {
  if (!pat.customInterps) return PREVIEW.interp;
  if (pat.customInterps.includes(PREVIEW.interp)) return PREVIEW.interp;
  return pat.customInterps[0];  // Fallback à la première interprétation disponible
}

/**
 * Construit les lignes HTML d'une grille de progression (tempos × interprétations)
 * @param {string} progressId - ID unique de progression
 * @param {string} dir - Direction : 'U' | 'D' | 'M'
 * @param {string} dirColor - Couleur CSS pour les cellules complétées
 * @param {Array<string>} interpsToUse - Interprétations à afficher (défaut: INTERPS global)
 * @returns {Object} {gridRows: string, totalCells: number, doneCells: number}
 */
function buildProgGridRows(progressId, dir, dirColor, interpsToUse = INTERPS) {
  let gridRows = '', totalCells = 0, doneCells = 0;
  TEMPOS.forEach(tempo => {
    gridRows += `<tr>
      <td class="tempo" style="text-align:center;padding:4px 6px;cursor:pointer;user-select:none"
          onclick="applyTempoPreset('${tempo.key}')" title="Régler le BPM à ${SETTINGS.tempoPresets[tempo.key]} bpm">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:3px">
          ${tempo.icon}
        </div>
        <span style="font-size:10px;color:${tempo.color};font-weight:700;display:block">${SETTINGS.tempoPresets[tempo.key]} <span style="font-size:8px;font-weight:500">bpm</span></span>
      </td>`;
    interpsToUse.forEach(interp => {
      const k = getProgressKey(progressId, 1, dir, interp, tempo);
      const done = !!state.progress[k];
      totalCells++;
      if (done) doneCells++;
      const checkedStyle = done ? `background:${dirColor};border-color:${dirColor};` : '';
      gridRows += `<td><button class="cell-btn ${done?'checked':''}" style="${checkedStyle}" data-dir="${dir}" onclick="toggleParcoursCell('${k}',this,\`${dirColor}\`)"></button></td>`;
    });
    gridRows += `</tr>`;
  });
  return { gridRows, totalCells, doneCells };
}

// ── GRILLE DE PROGRESSION GAMME — fonction réutilisable (render + live refresh) ──

/**
 * Construit la grille de progression pour une gamme/pattern spécial
 * @param {Object} p - Pattern object (gamme ou pattern avec directions)
 * @returns {Object} {html: string, progressPercent: number}
 */
function buildGammeProgGrid(p) {
  const selectedDir = p.hasDirectionTabs ? getGammeSelectedDir(p.id) : null;

  // Créer un progressId distinct pour chaque direction/groupe
  let progressId = p.id;
  const DIR_LABEL_MAP = { U:'Asc.', D:'Des.', M:'Mix' };
  let badgeText = '';
  if (p.hasDirectionTabs && selectedDir) {
    if (p.formeTabs) {
      const forme    = getGammeSelectedForme(p.id);
      const isPenta  = getGammePenta(p.id);
      const pentaPfx = isPenta ? 'Penta_' : '';
      progressId = p.id + '__' + pentaPfx + selectedDir + '_' + (forme || p.formeTabs[0]);
      badgeText = DIR_LABEL_MAP[selectedDir] || selectedDir;
    } else {
      progressId = p.id + '__' + selectedDir.replace(/[→↔]/g, '-');
      badgeText = DIR_LABEL_MAP[selectedDir] || selectedDir;
    }
  }

  const dirColor = (p.hasDirectionTabs && p.versionTabs && selectedDir && DIR_BTN_COLORS[selectedDir])
    ? DIR_BTN_COLORS[selectedDir].color
    : '#56864A';

  // Utiliser customInterps si présent, sinon utiliser INTERPS global
  const interpsToUse = p.customInterps || INTERPS;
  const interpLabels = p.customInterps
    ? { Down: 'Pick ↓', Up: 'Pick ↑', Sweep: 'Sweep' }
    : INTERP_LABELS;

  const { gridRows, totalCells, doneCells } = buildProgGridRows(progressId, 'U', dirColor, interpsToUse);
  const progressPercent = totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0;

  // Badge de direction OU badge de groupe
  let badgeLabel = '';
  if (badgeText) {
    badgeLabel = `<span style="font-size:11px;font-weight:700;color:#fff">${badgeText}</span>`;
  }

  const html = `<div class="prog-grid" style="margin-bottom:10px">
    <table><thead><tr>
      <th style="width:68px;background:var(--blue);vertical-align:middle">${badgeLabel}</th>
      ${interpsToUse.map(i => `<th data-interp-th="${i}" onclick="setPreviewInterp('${i}')"
        style="cursor:pointer;transition:all .15s;${PREVIEW.interp===i ? 'background:var(--orange);color:#fff;' : 'background:var(--blue);color:rgba(255,255,255,.75);'}">${interpLabels[i]}</th>`).join('')}
    </tr></thead>
    <tbody style="background:transparent">${gridRows}</tbody></table></div>`;

  return { html, progressPercent };
}

// ── PATTERN GROUP BODY (direction unifiée ou pattern spécial) ────────────────
function renderPatternGroupBody(pats, key) {
  // Détecter les patterns spéciaux ou ceux avec sélecteur version+forme
  const isSpecial = pats[0].special || !!(pats[0].hasDirectionTabs && pats[0].versionTabs);

  if (isSpecial) {
    // Pour les patterns spéciaux, utiliser directement le premier pattern
    const p = pats[0];
    const relPat = null;

    // ── Onglets de direction (gammes avec hasDirectionTabs uniquement) ────────
    let dirTabsHtml = '';
    if (p.hasDirectionTabs && p.directions) {
      const selectedDir = getGammeSelectedDir(p.id);
      const btnStyle = (isActive) =>
        `flex:1;font-size:13px;font-weight:${isActive?'700':'600'};padding:6px 10px;border-radius:8px;border:1px solid ${isActive?'var(--blue)':'var(--border)'};cursor:pointer;background:${isActive?'var(--blue)':'transparent'};color:${isActive?'#fff':'var(--text2)'};transition:all .15s`;

      if (p.versionTabs && p.formeTabs && (p.versionTabs.length > 1 || p.formeTabs.length > 1)) {
        // Segment pour version + dropdown pour formes
        const selectedForme = getGammeSelectedForme(p.id);
        const isPenta = getGammePenta(p.id);
        const hasPentaDirs = Object.keys(p.directions).some(k => k.startsWith('Penta '));
        const pentaBtnStyle = `font-size:13px;font-weight:700;padding:6px 12px;border-radius:8px;border:1px solid #e53e3e;cursor:pointer;background:${isPenta?'#e53e3e':'transparent'};color:${isPenta?'#fff':'#e53e3e'};transition:all .15s`;
        const pentaBtn = hasPentaDirs ? `<button id="gamme-penta-btn-${p.id}" onclick="toggleGammePenta('${p.id}')" style="${pentaBtnStyle}">Penta</button>` : '';
        const versionRow = p.versionTabs.map(vk => {
          const btnId = 'gamme-dir-btn-' + p.id + '-' + vk;
          const label = (p.versionLabels && p.versionLabels[vk]) || vk;
          const isActive = vk === selectedDir;
          const dc = DIR_BTN_COLORS[vk] || { bg:'var(--blue-light)', color:'var(--blue)', border:'var(--blue)' };
          const vBtnStyle = isActive
            ? `flex:1;font-size:13px;font-weight:700;padding:6px 10px;border-radius:8px;border:1.5px solid ${dc.border};cursor:pointer;background:${dc.bg};color:${dc.color};transition:all .15s`
            : `flex:1;font-size:13px;font-weight:600;padding:6px 10px;border-radius:8px;border:1px solid var(--border);cursor:pointer;background:transparent;color:var(--text2);transition:all .15s`;
          return `<button id="${btnId}" onclick="setGammeDirection('${p.id}','${vk}')" style="${vBtnStyle}">${label}</button>`;
        }).join('');
        const useScrollForme = p.formeTabs.length > 5;
        const chipStyle = (isActive) =>
          `flex-shrink:0;font-size:13px;font-weight:${isActive?'700':'600'};padding:7px 14px;border-radius:20px;border:1.5px solid ${isActive?'var(--blue)':'var(--border)'};cursor:pointer;background:${isActive?'var(--blue)':'transparent'};color:${isActive?'#fff':'var(--text2)'};transition:all .15s;white-space:nowrap`;
        const formeRow = p.formeTabs.map(fk => {
          const btnId = 'gamme-forme-btn-' + p.id + '-' + fk.replace(/[↔→\s]/g, '_');
          const st = useScrollForme ? chipStyle(fk===selectedForme) : btnStyle(fk===selectedForme);
          return `<button id="${btnId}" onclick="setGammeForme('${p.id}','${fk}')" style="${st}">${fk}</button>`;
        }).join('');
        const formeContainer = useScrollForme
          ? `<div style="position:relative">
              <div class="forme-scroll-fade-left"></div>
              <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch;scrollbar-width:none" onscroll="updateFormeFade(this)">${formeRow}</div>
              <div class="forme-scroll-fade-right"></div>
             </div>`
          : `<div style="display:flex;gap:6px">${formeRow}</div>`;
        dirTabsHtml = `
          <div style="margin-bottom:8px">
            <label style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block">${p.formeSelectorLabel||'Forme'}</label>
            ${formeContainer}
          </div>
          <div style="margin-bottom:10px">
            <label style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block">${p.versionSelectorLabel||'Version'}</label>
            <div style="display:flex;gap:6px">${versionRow}${pentaBtn}</div>
          </div>`;
      } else {
        // Sélecteur simple (patterns existants) — masqué s'il n'y a qu'une seule option
        const dirKeys = Object.keys(p.directions);
        if (dirKeys.length > 1) {
          dirTabsHtml = `
          <div style="display:flex;gap:6px;margin-bottom:10px">
            ${dirKeys.map(dk => {
              const btnId = 'gamme-dir-btn-' + p.id + '-' + dk.replace(/[→↔]/g, '_');
              return `<button id="${btnId}" onclick="setGammeDirection('${p.id}','${dk}')" style="${btnStyle(dk===selectedDir)}">${dk}</button>`;
            }).join('')}
          </div>`;
        }
      }
    }


    // ── Sélecteur de cordes (gammes uniquement) ──────────────────────────────
    // Affichage : E A D G B e (du grave à l'aigu = ordre guitare)
    // activeStrings = [e=0, B=1, G=2, D=3, A=4, E=5]
    const activeStrings = p.disableStringSelector ? [true,true,true,true,true,true] : getGammeActiveStrings(p.id);
    const allActive = activeStrings.every(v => v);
    const STRING_SELECTOR_DEF = [
      { label:'E', idx:5 },
      { label:'A', idx:4 },
      { label:'D', idx:3 },
      { label:'G', idx:2 },
      { label:'B', idx:1 },
      { label:'e', idx:0 },
    ];
    const stringSelector = p.disableStringSelector ? '' : `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text2);flex-shrink:0">Cordes</span>
        <div style="display:flex;gap:4px">
          ${STRING_SELECTOR_DEF.map(s => {
            const active = activeStrings[s.idx];
            return `<button id="gamme-str-btn-${p.id}-${s.idx}"
              onclick="toggleGammeString('${p.id}', ${s.idx})"
              style="font-size:11px;font-weight:700;width:26px;height:26px;border-radius:50%;border:1.5px solid;cursor:pointer;transition:all .15s;line-height:1;
                background:${active ? 'var(--green)' : 'rgba(0,0,0,0.1)'};
                color:${active ? '#fff' : '#999'};
                border-color:${active ? 'var(--green)' : '#ccc'};
                opacity:1">${s.label}</button>`;
          }).join('')}
        </div>
        <button id="gamme-reset-btn-${p.id}" onclick="resetGammeStrings('${p.id}')"
          style="font-size:10px;padding:2px 10px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text2);cursor:pointer;transition:all .15s;white-space:nowrap;display:${allActive ? 'none' : ''}">
          Tout</button>
      </div>`;

    // ── Tab avec filtre de cordes actif ──────────────────────────────────────
    let rawTabForDisplay;
    if (p.hasDirectionTabs) {
      rawTabForDisplay = getEffectiveTab(getGammeActiveTab(p));
    }

    let neckTabForDisplay = rawTabForDisplay;
    if (!p.disableHighNeck) {
      const _useStaticHigh = p.directionsHigh && SETTINGS.neckPosition === 'high';
      // gammes (special:true) → skipStringShift ; patterns non-special (A2P1…) → groupe de cordes actif
      neckTabForDisplay = _useStaticHigh ? applyStaticTabTransform(rawTabForDisplay) : transformTab(rawTabForDisplay, p.id, !!p.special);
    }

    const filteredTabForDisplay = p.disableStringSelector
      ? neckTabForDisplay
      : applyGammeStringFilter(neckTabForDisplay, activeStrings);
    const tabIsPlaying = PREVIEW.patId === p.id;
    const tabBlock = `
      <div style="margin-bottom:10px">
        ${stringSelector}
        <div class="tab-wrap" style="margin:0" onclick="tabWrapClick('${p.id}')"
          title="Tap → lecture / stop">
          <pre data-tab-id="${p.id}" id="tab-pre-${p.id}">${tabWithSymbols(cleanTabDisplay(filteredTabForDisplay), getValidInterpForPat(p), p.rhythmicResolution ? { rhythmicResolution: p.rhythmicResolution, ...(p.rhythmicBeatPicking ? { rhythmicBeatPicking: true } : {}) } : {})}</pre>
          <div id="tab-cursor-montee-${p.id}" class="tab-cursor-bar"></div>
          <div id="tab-cursor-retour-${p.id}" class="tab-cursor-bar"></div>
          <div id="tab-play-badge-${p.id}" class="tab-play-badge${tabIsPlaying?' playing':''}">
            ${tabIsPlaying
              ? `<svg width="9" height="9" viewBox="0 0 9 9" fill="rgba(255,255,255,.9)"><rect width="4" height="9" rx=".8"/><rect x="5" width="4" height="9" rx=".8"/></svg>`
              : `<svg width="8" height="9" viewBox="0 0 8 9" fill="rgba(255,255,255,.55)"><path d="M0 0l8 4.5L0 9z"/></svg>`}
          </div>
        </div>
      </div>`;

    // ── Grille de progression — construite via fonction réutilisable (live refresh) ──
    const { html: progGridInner, progressPercent } = buildGammeProgGrid(p);
    const progGrid = `<div id="gamme-prog-${p.id}">${progGridInner}</div>`;

    // ── Notes personnelles : directement accessibles sans accordéon ──
    const infoDrawer = `
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
        <textarea placeholder="Notes personnelles…"
          style="width:100%;min-height:52px;padding:8px 10px;font-size:12px;font-family:-apple-system,sans-serif;
            color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:8px;
            resize:vertical;outline:none;line-height:1.5"
          onblur="savePatNote('${key}',this.value)">${PAT_NOTES[key]||PAT_NOTES[p.id]||''}</textarea>
      </div>`;

    return `
      <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        ${dirTabsHtml}
        <div id="pat-train-${p.id}" style="font-size:13px;color:var(--text2);opacity:.7;padding:0 1px 6px;letter-spacing:.1px;display:flex;justify-content:space-between;align-items:center">
          <span>— pattern spécial —</span>
          <span style="font-weight:600;color:var(--blue);font-size:12px">${progressPercent > 0 ? progressPercent+'%' : ''}</span>
        </div>
        ${tabBlock}
        <div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.4px;text-transform:uppercase;margin-bottom:6px;padding-left:1px">Remplis le tableau</div>
        ${progGrid}
        ${infoDrawer}
      </div>`;
  }

  // Sinon, affichage normal avec directions
  const dirs = ['U','D','M'].filter(d => pats.find(p => p.dir === d));
  const activeDir = (state.cardDir[key] && dirs.includes(state.cardDir[key]))
    ? state.cardDir[key] : dirs[0];
  state.cardDir[key] = activeDir;
  const p = pats.find(x => x.dir === activeDir);
  const relPat = p.related ? PATTERNS.find(r => r.id === p.related + activeDir) : null;

  // ── Sélecteur de direction — boutons pleine largeur aux couleurs du tableau ──
  const dirLabels = {U:'↑ Ascendant', D:'↓ Descendant', M:'↑↓ Mix'};
  const dirBtns = dirs.length > 1 ? `<div style="display:flex;gap:6px;width:100%">${dirs.map(d => {
    const active = d === activeDir;
    const dc = DIR_BTN_COLORS[d] || { bg:'var(--blue-light)', color:'var(--blue)', border:'var(--blue)' };
    let tot = 0, don = 0;
    const dp = pats.find(x => x.dir === d);
    if (dp) INTERPS.forEach(i => TEMPOS.forEach(t => {
      tot++; if (state.progress[getProgressKey(dp.id,1,d,i,t)]) don++;
    }));
    const dpct = tot ? Math.round(don/tot*100) : 0;
    return `<button onclick="setCardDir('${key}','${d}')"
      style="flex:1;font-size:12px;font-weight:700;padding:8px 4px 6px;border-radius:8px;border:2px solid;cursor:pointer;transition:all .15s;text-align:center;line-height:1.3;
        background:${active ? dc.bg : 'transparent'};
        color:${active ? dc.color : 'var(--text2)'};
        border-color:${active ? dc.border : 'rgba(0,0,0,.15)'}">
      ${dirLabels[d]}
      <span id="dirpct-${key}-${d}" style="display:block;font-size:9px;opacity:.7;font-weight:500;margin-top:2px">${dpct>0?`${dpct}%`:''}</span>
    </button>`;
  }).join('')}</div>` : '';


  // ── Tab (direction active) ────────────────────────────────────────────────────
  const tabIsPlaying = PREVIEW.patId === p.id;

  // Sélecteur de corde (patterns stringSelector)
  const strSelectorHtml = p.stringSelector ? (() => {
    const selectedStr = getRhythmicStringSelect(p.id);
    return `<div style="display:flex;gap:4px;margin-bottom:8px">
      ${['E','A','D','G','B','e'].map(s => {
        const active = s === selectedStr;
        return `<button id="rhythmic-str-btn-${p.id}-${s}"
          onclick="setRhythmicStringSelect('${p.id}','${s}')"
          style="flex:1;font-size:12px;font-weight:${active?'700':'600'};padding:5px 4px;border-radius:8px;
            border:2px solid;cursor:pointer;transition:all .15s;text-align:center;
            background:${active?'var(--blue)':'transparent'};
            color:${active?'#fff':'var(--text2)'};
            border-color:${active?'var(--blue)':'var(--border)'}">${s}</button>`;
      }).join('')}
    </div>`;
  })() : '';

  // Tab à afficher : transposée si stringSelector, sinon pipeline normal
  let _displayTab;
  if (p.stringSelector) {
    const strKey = getRhythmicStringSelect(p.id);
    let baseTab = p.stringShift
      ? transposeShiftTab(p.tab, strKey)
      : transposeSingleStringTab(p.tab, strKey);
    // Correction G-B : intervalle de 4 demi-tons au lieu de 5
    if (p.stringShift && strKey === 'G' && GB_SHIFT_PATTERN_IDS.includes(p.id)) {
      baseTab = applyGBShiftCorrection(baseTab);
    }
    _displayTab = baseTab;
    if (SETTINGS.neckPosition === 'high') _displayTab = applyHighNeckToTab(_displayTab);
  } else {
    _displayTab = isStaticNeckTab(p)
      ? applyStaticTabTransform(getEffectiveTab(getTabForNeckPosition(p)))
      : transformTab(getEffectiveTab(getTabForNeckPosition(p)), p.id, p.special);
  }
  const displayTabContent = tabWithSymbols(cleanTabDisplay(_displayTab), PREVIEW.interp, p.rhythmicResolution ? { rhythmicResolution: p.rhythmicResolution, ...(p.rhythmicBeatPicking ? { rhythmicBeatPicking: true } : {}) } : {});

  const tabBlock = `
    <div style="margin-bottom:10px">
      ${strSelectorHtml}
      <div class="tab-wrap" style="margin:0" onclick="tabWrapClick('${p.id}')"
        title="Tap → lecture / stop">
        <pre data-tab-id="${p.id}" id="tab-pre-${p.id}">${displayTabContent}</pre>
        <div id="tab-cursor-montee-${p.id}" class="tab-cursor-bar"></div>
        <div id="tab-cursor-retour-${p.id}" class="tab-cursor-bar"></div>
        <div id="tab-play-badge-${p.id}" class="tab-play-badge${tabIsPlaying?' playing':''}">
          ${tabIsPlaying
            ? `<svg width="9" height="9" viewBox="0 0 9 9" fill="rgba(255,255,255,.9)"><rect width="4" height="9" rx=".8"/><rect x="5" width="4" height="9" rx=".8"/></svg>`
            : `<svg width="8" height="9" viewBox="0 0 8 9" fill="rgba(255,255,255,.55)"><path d="M0 0l8 4.5L0 9z"/></svg>`}
        </div>
      </div>
    </div>`;

  // ── Grille de progression (direction active) ──────────────────────────────────
  const DIR_COLORS  = {U:'#1a7a5e', D:'#b84a20', M:'#6b4faa'};
  const DIR_BG      = {U:'rgba(44,100,240,0.07)', D:'rgba(210,180,30,0.08)', M:'rgba(200,60,110,0.07)'};
  const dirColor    = DIR_COLORS[activeDir] || '#56864A';
  const dirBgColor  = DIR_BG[activeDir] || 'transparent';
  const interpsToUse = p.customInterps || INTERPS;
  const { gridRows } = buildProgGridRows(p.id, p.dir, dirColor, interpsToUse);
  const thStyle = i => PREVIEW.interp===i
    ? 'background:var(--orange);color:#fff;'
    : 'background:var(--blue);color:rgba(255,255,255,.75);';
  const DIR_BADGE_LABELS = {U:'Asc.', D:'Des.', M:'Mix'};
  const dirBadge = `<span style="font-size:11px;font-weight:700;color:#fff">${DIR_BADGE_LABELS[activeDir] || activeDir}</span>`;
  const progGrid = `<div class="prog-grid" style="margin-bottom:10px">
    <table><thead><tr>
      <th style="width:68px;background:var(--blue);vertical-align:middle">${dirBadge}</th>
      ${interpsToUse.map(i=>`<th data-interp-th="${i}" onclick="setPreviewInterp('${i}')"
        style="cursor:pointer;transition:all .15s;${thStyle(i)}">${INTERP_LABELS[i]}</th>`).join('')}
    </tr></thead>
    <tbody style="background:${dirBgColor}">${gridRows}</tbody></table></div>`;

  // ── 6. TIROIR UNIQUE : doigté + description + notes ─────────────────────────
  const relBtn = relPat
    ? `<div style="padding-top:8px;border-top:1px solid var(--border);margin-top:8px">
        <button onclick="goToPattern('${relPat.cat}P${relPat.num}')"
          style="font-size:11px;color:var(--blue);background:transparent;border:1px solid var(--blue);
            border-radius:10px;padding:2px 10px;cursor:pointer">
          Voir aussi : ${relPat.cat}P${relPat.num} — ${relPat.name}
        </button>
      </div>` : '';

  // ── Notes section : directement accessible sans accordéon ──
  const notesSection = `
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
      ${relBtn}
      <textarea placeholder="Notes personnelles…"
        style="width:100%;min-height:52px;padding:8px 10px;font-size:12px;font-family:-apple-system,sans-serif;
          color:var(--text);background:var(--card);border:1px solid var(--border);border-radius:8px;
          resize:vertical;outline:none;line-height:1.5"
        onblur="savePatNote('${key}',this.value)">${PAT_NOTES[key]||PAT_NOTES[p.id]||''}</textarea>
    </div>`;

  // ── ENTÊTE : boutons direction pleine largeur ──────────────────────────────
  const codeBase = p.cat + 'P' + p.num;
  const header = dirs.length > 1 ? `
    <div style="margin-bottom:8px">
      ${dirBtns}
    </div>` : '';

  return `
    <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)">
      ${header}
      <div id="pat-train-${p.id}" style="font-size:13px;color:var(--text2);opacity:.7;padding:0 1px 6px;letter-spacing:.1px">— pas encore de lecture —</div>
      ${tabBlock}
      <div style="font-size:11px;font-weight:600;color:var(--text2);letter-spacing:.4px;text-transform:uppercase;margin-bottom:6px;padding-left:1px">Remplis le tableau</div>
      ${progGrid}
      ${notesSection}
    </div>`;
}

// ── DIRECTION SELECTOR ──────────────────────────────────────────────────────
function setCardDir(key, dir) {
  previewStop();
  state.cardDir[key] = dir;
  PREVIEW.bpm = HCTRL.bpm;
  PREVIEW.interp = 'Down';
  render();
  // Re-scroll to the card so the user sees the updated body
  setTimeout(() => {
    const el = document.getElementById('card-' + key) || document.getElementById('parc-card-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 60);
}

// ── PATTERNS TAB ──
function diffTag(d) {
  if (d === 'Basique') return `<span class="tag diff-deb">${d}</span>`;
  if (d === 'Technique') return `<span class="tag diff-int">${d}</span>`;
  return `<span class="tag diff-adv">${d}</span>`;
}

function dirLabel(d) {
  return {U:'⬆ Ascendant',D:'⬇ Descendant',M:'↕ Mix'}[d] || d;
}

/**
 * Redessine l'onglet Patterns avec tri : Progressif / Alphabétique / Aléatoire
 * @returns {string} HTML du contenu Patterns
 */
function renderPatterns() {
  if (!state.patternSort) state.patternSort = 'progressif';

  const sorts = ['progressif','alphabetique','aleatoire','favoris'];
  const sortLabels = {progressif:'Progressif', alphabetique:'Alphabétique', aleatoire:'Aléatoire', favoris:'Favoris'};
  let html = `<div class="filter-seg">`;
  sorts.forEach(s => {
    const active = state.patternSort === s ? 'active' : '';
    const favStyle = s === 'favoris' && active ? 'style="background:#E91E63;border-color:#E91E63;color:#fff"' : s === 'favoris' ? 'style="color:#E91E63"' : '';
    html += `<button class="${active} sort-${s}" onclick="setPatternSort('${s}')" ${favStyle}>${sortLabels[s]}</button>`;
  });
  html += `</div>`;

  if (SETTINGS.showDiffFilter) {
    if (!state.diffFilter) state.diffFilter = 'all';
    const diffs = ['all','Basique','Technique','Complexe'];
    const diffColors = {Basique:'diff-deb', Technique:'diff-int', Complexe:'diff-adv'};
    html += `<div class="filter-seg" style="margin-top:-8px">`;
    diffs.forEach(d => {
      const active = state.diffFilter === d ? 'active' : '';
      const colorClass = active && d !== 'all' ? diffColors[d] : '';
      html += `<button class="${active} ${colorClass}" onclick="setDiffFilter('${d}')">${d === 'all' ? 'Tous' : d}</button>`;
    });
    html += `</div>`;
  } else {
    state.diffFilter = 'all';
  }

  let visible = PATTERNS.filter(p =>
    p.cat !== 'arpeges' && p.cat !== 'gamme' &&
    !p.laboOnly &&
    (state.diffFilter === 'all' || p.difficulty === state.diffFilter)
  );

  // Group by cat+num
  const groups = {};
  visible.forEach(p => {
    const key = p.cat + 'P' + p.num;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const diffOrder = {Basique:0, Technique:1, Complexe:2};

  let sortedEntries = Object.entries(groups);

  if (state.patternSort === 'progressif') {
    sortedEntries = sortedEntries.sort((a, b) => {
      const da = diffOrder[a[1][0].difficulty] ?? 3;
      const db = diffOrder[b[1][0].difficulty] ?? 3;
      if (da !== db) return da - db;
      return a[0].localeCompare(b[0]);
    });
  } else if (state.patternSort === 'alphabetique') {
    sortedEntries = sortedEntries.sort((a,b) => a[0].localeCompare(b[0]));
  } else if (state.patternSort === 'aleatoire') {
    const lowProgress = sortedEntries.filter(([key]) => getGroupPct(key) < 40);
    const shuffled = lowProgress.sort(() => Math.random() - 0.5);
    sortedEntries = shuffled.slice(0, 2);
  } else if (state.patternSort === 'favoris') {
    sortedEntries = sortedEntries.filter(([key]) => !!state.favorites[key]);
    sortedEntries.sort((a, b) => a[0].localeCompare(b[0]));
  }

  sortedEntries.forEach(([key, pats]) => {
    // Passer les gammes (qui seront affichées dans une section séparée)
    if (pats[0].cat === 'gamme') return;

    const base = pats[0];
    const isOpen = state.openCards[key];
    const pct = getGroupPct(key); // toutes directions confondues
    const allIds = pats.map(p=>p.id).join(',');

    const diffBorder = {Basique:'#4a9e6b',Technique:'#d49800',Complexe:'#d63031'}[base.difficulty]||'var(--border)';
    const isConsolidated = !!(base.hasDirectionTabs && base.versionTabs);

    html += `
    <div class="card" id="card-${key}" style="border-left:4px solid ${diffBorder}">
      <div class="card-head" onclick="toggleCard('${key}')">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px">
            <h2 style="font-size:14px;margin:0;font-weight:700">${key}</h2>
            <span style="color:var(--text);opacity:.3;font-size:13px;font-weight:300">·</span>
            <span style="font-size:13px;color:var(--text);opacity:.65;font-style:italic;font-weight:400">${base.name}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span id="grppct-${key}" style="font-size:11px;font-weight:600;color:var(--blue)">${pct > 0 ? pct+'%' : ''}</span>
          <button onclick="toggleFavorite('${key}',event)"
            style="background:none;border:none;cursor:pointer;padding:2px;display:flex;align-items:center">
            ${heartSVG(!!state.favorites[key])}
          </button>
          <span style="color:var(--border);font-size:13px;line-height:1;margin:0 1px">·</span>
          <span class="arrow ${isOpen?'open':''}">▶</span>
        </div>
      </div>
      <div class="card-body ${isOpen?'open':''}">`;

    html += renderPatternGroupBody(pats, key);

    html += `</div></div>`;
  });

  return html;
}

// ── GAMMES TAB ──

function buildCalendarCells(sessions) {
  const set = new Set(sessions);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.toISOString().slice(0, 10);
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi=0

  let html = '';
  ['L','M','M','J','V','S','D'].forEach(d => {
    html += `<div style="text-align:center;font-size:9px;font-weight:600;color:var(--text3);padding:2px 0">${d}</div>`;
  });
  for (let i = 0; i < startOffset; i++) html += '<div></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const has = set.has(dateStr);
    const isToday = dateStr === today;
    const bg = has ? 'var(--green)' : isToday ? 'var(--blue-light)' : 'var(--border)';
    const col = has ? '#fff' : isToday ? 'var(--blue)' : 'var(--text3)';
    html += `<div style="text-align:center;padding:3px 1px;border-radius:4px;background:${bg};color:${col};font-size:10px;font-weight:${isToday?'700':'400'}">${day}</div>`;
  }
  return html;
}

/**
 * Redessine le calendrier des séances du mois avec calcul de streak
 * @returns {string} HTML du calendrier
 */
function renderSessionCalendar() {
  const sessions = getSessions();
  const { current, record } = computeStreak(sessions);
  const total = sessions.length;
  const now = new Date();
  const month = now.getMonth();
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const streakColor = current >= 7 ? 'var(--green)' : current >= 3 ? 'var(--orange)' : 'var(--blue)';
  const icoFlame    = `<svg width="22" height="26" viewBox="0 0 24 28"><path d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-3-2-5-2-5s0 4-4 4c0-4 4-7 4-13z" fill="${streakColor}"/></svg>`;
  const icoLightning= `<svg width="20" height="24" viewBox="0 0 20 24" fill="none"><polygon points="11,1 2,13 10,13 9,23 18,11 10,11" fill="var(--orange)" stroke="none"/></svg>`;
  const icoCalendar = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  return `
  <div style="background:var(--bg);border-radius:var(--radius);padding:4px 0 8px;">
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="margin-bottom:6px">${icoFlame}</div>
        <div style="font-size:22px;font-weight:800;color:${streakColor};line-height:1">${current}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px">Série</div>
      </div>
      <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="margin-bottom:6px">${icoLightning}</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);line-height:1">${record}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px">Record</div>
      </div>
      <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="margin-bottom:6px">${icoCalendar}</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);line-height:1">${total}</div>
        <div style="font-size:10px;color:var(--text2);margin-top:3px">Total jours</div>
      </div>
    </div>
    <div style="font-size:11px;font-weight:600;color:var(--text2);text-align:center;margin-bottom:6px">
      ${monthNames[month]} ${now.getFullYear()}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
      ${buildCalendarCells(sessions)}
    </div>
  </div>`;
}
function setFilter(f) {
  state.filter = f;
  render();
}

function filterByGroup(groupKey) {
  // Extrait la catégorie du groupKey (ex: "A4P1a" → "A4")
  const cat = groupKey.split('P')[0];
  state.filter = cat;
  state.diffFilter = 'all';
  render();
}

function setDiffFilter(d) {
  state.diffFilter = d;
  render();
}

function setPatternSort(s) {
  state.patternSort = s;
  saveState();
  render();
}

function setGammeCategory(c) {
  state.gammeCategory = c;
  saveState();
  render();
}





// ── Calendrier rétractable (utilisé dans Mes séances) ──

/**
 * Redessine le calendrier rétractable des séances (pour la section progress)
 * @returns {string} HTML du calendrier accordéon
 */
function renderCalendarAccordion() {
  const sessions = getSessions();
  const now = new Date();
  const month = now.getMonth();
  const monthNames = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return `
  <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:2px;background:#fff">
    <div style="padding:10px 14px;font-size:13px;font-weight:700;color:var(--text2);display:flex;align-items:center;gap:6px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${monthNames[month]} ${now.getFullYear()}
    </div>
    <div style="padding:0 14px 12px;background:#fff">
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">${buildCalendarCells(sessions)}</div>
    </div>
  </div>`;
}
// ── PROGRESSION TAB ──

/**
 * Redessine l'onglet Progress avec calendrier et vue globale par groupe
 * @returns {string} HTML du contenu Progress
 */
function renderGlobalProgress() {
  // Grouper par cat+num pour ne compter qu'une fois par groupe (comme les cartes)
  const groups = {};
  PATTERNS.forEach(p => {
    const key = p.cat + 'P' + p.num;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const cats = ['A4','A3','A2','A5','A6','A8','B8','B6'];
  const catLabels = {A4:'A4 — 4 notes',A3:'A3 — 3 notes',A2:'A2 — 2 notes',A5:'A5 — 5 notes',A6:'A6 — triade ×2',A8:'A8 — 8 notes',B8:'B8 — 2 cordes ×8',B6:'B6 — multi-cordes'};

  // Total global — même logique que getGroupPct pour avoir les vraies clés
  let totalAll = 0, doneAll = 0;
  const allGroupKeys = [...new Set(PATTERNS.map(p => p.cat + 'P' + p.num))];
  allGroupKeys.forEach(gkey => {
    PATTERNS.filter(p => p.cat + 'P' + p.num === gkey).forEach(p => {
      const interpsToUse = p.customInterps || INTERPS;
      if (p.hasDirectionTabs && p.versionTabs && p.formeTabs) {
        p.versionTabs.forEach(vk => {
          p.formeTabs.forEach(fk => {
            const pid = p.id + '__' + vk + '_' + fk;
            interpsToUse.forEach(i => TEMPOS.forEach(t => {
              totalAll++;
              if (state.progress[getProgressKey(pid, 1, 'U', i, t)]) doneAll++;
            }));
          });
        });
      } else if (p.special && p.hasDirectionTabs && p.directions) {
        Object.keys(p.directions).forEach(dirKey => {
          const pid = p.id + '__' + dirKey.replace(/[→↔]/g, '-');
          interpsToUse.forEach(i => TEMPOS.forEach(t => {
            totalAll++;
            if (state.progress[getProgressKey(pid, 1, 'U', i, t)]) doneAll++;
          }));
        });
      } else if (p.dir) {
        interpsToUse.forEach(i => TEMPOS.forEach(t => {
          totalAll++;
          if (state.progress[getProgressKey(p.id, 1, p.dir, i, t)]) doneAll++;
        }));
      }
    });
  });
  const globalPct = totalAll > 0 ? Math.round(doneAll / totalAll * 100) : 0;

  // ── Stats séances pour le résumé accordion ──
  const sessions = getSessions();
  const { current: streak, record } = computeStreak(sessions);
  const totalDays = sessions.length;
  const icoFlameInline = `<svg style="display:inline;vertical-align:middle" width="11" height="13" viewBox="0 0 24 28" fill="var(--orange)"><path d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-3-2-5-2-5s0 4-4 4c0-4 4-7 4-13z"/></svg>`;
  const icoTrophyInline = `<svg style="display:inline;vertical-align:middle" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 01-2-2V5h4M18 9h2a2 2 0 002-2V5h-4M12 17v4M8 21h8M3 5h18"/><path d="M12 17a7 7 0 007-7V5H5v5a7 7 0 007 7z"/></svg>`;
  const fireEmoji = streak >= 3 ? icoFlameInline : '';

  // ═══ 1 — MES SÉANCES ═════════════════════════════════════════════════════════
  let html = `<div style="margin-bottom:4px">`;

  // Stats (toujours visibles quand la section est ouverte) — réutilise sessions/streak/record déclarés plus haut
  const sColor  = streak >= 7 ? 'var(--green)' : streak >= 3 ? 'var(--orange)' : 'var(--blue)';
  const icoFlame2    = `<svg width="22" height="26" viewBox="0 0 24 28"><path d="M12 2C12 2 6 8 6 14a6 6 0 0012 0c0-3-2-5-2-5s0 4-4 4c0-4 4-7 4-13z" fill="${sColor}"/></svg>`;
  const icoLightning2= `<svg width="20" height="24" viewBox="0 0 20 24" fill="none"><polygon points="11,1 2,13 10,13 9,23 18,11 10,11" fill="var(--orange)" stroke="none"/></svg>`;
  const icoCalSm2    = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  html += `
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
      <div style="margin-bottom:6px">${icoFlame2}</div>
      <div style="font-size:22px;font-weight:800;color:${sColor};line-height:1">${streak}</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">Série</div>
    </div>
    <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
      <div style="margin-bottom:6px">${icoLightning2}</div>
      <div style="font-size:22px;font-weight:800;color:var(--text);line-height:1">${record}</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">Record</div>
    </div>
    <div style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px 8px;text-align:center">
      <div style="margin-bottom:6px">${icoCalSm2}</div>
      <div style="font-size:22px;font-weight:800;color:var(--text);line-height:1">${totalDays}</div>
      <div style="font-size:10px;color:var(--text2);margin-top:3px">Total jours</div>
    </div>
  </div>`;

  html += renderCalendarAccordion();
  html += `</div>`;

  // ═══ 2 — PROGRESSION GLOBALE ═════════════════════════════════════════════════
  html += `
  <div style="background:var(--blue);border-radius:var(--radius);padding:13px 16px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:rgba(244,238,226,.6)">Global</div>
        <div style="font-size:19px;font-weight:800;color:var(--header-text)">Progression</div>
      </div>
      <div style="font-size:28px;font-weight:800;color:${globalPct>0?'var(--header-text)':'rgba(244,238,226,.35)'}">${globalPct}%</div>
    </div>
    <div style="height:4px;background:rgba(244,238,226,.2);border-radius:2px">
      <div style="height:4px;background:var(--orange);border-radius:2px;width:${globalPct}%"></div>
    </div>
  </div>`;

  // ═══ 3 — DÉTAIL PAR PATTERN ══════════════════════════════════════════════════
  html += `<details class="prog-acc"><summary>Détail par pattern</summary><div class="prog-acc-body">`;
  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">`;

  Object.entries(groups).forEach(([key, pats]) => {
    const pct = getGroupPct(key);
    const color = 'var(--blue)';
    const isFav = !!state.favorites[key];
    const patId = pats[0].id;
    const isPinned = state.pinnedSession === patId;
    html += `
    <div style="position:relative;background:var(--card);border:2px solid ${pct>0?color:'var(--border)'};border-radius:8px;overflow:hidden">
      <button onclick="selectPatAndGo('${patId}')" style="width:100%;padding:7px 4px 7px;cursor:pointer;text-align:center;background:none;border:none">
        <div style="font-size:10px;font-weight:700;color:var(--text2)">${key}</div>
        <div style="font-size:16px;font-weight:800;color:${color}">${pct}%</div>
      </button>
      ${isFav ? '<div style="position:absolute;top:2px;right:2px;padding:2px;line-height:0;pointer-events:none"><svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#E91E63" stroke="#E91E63" stroke-width="2.5"/></svg></div>' : ''}
    </div>`;
  });

  html += `</div></div></details>`;

  html += `
  <div style="margin-top:32px;text-align:right;color:var(--text3);font-size:11px;line-height:1.7">
    <div style="font-weight:600;font-size:12px;color:var(--text2)">Dico Pattern</div>
    <div>© 2026 · Développé par Cédric RAOU</div>
    <div>Dijon <span style="font-size:13px">🇫🇷</span></div>
  </div>`;

  return html;
}

/**
 * Sélectionne un pattern et navigue vers son groupe
 * @param {string} id - ID du pattern
 */
function selectPatAndGo(id) {
  const pat = PATTERNS.find(p => p.id === id);
  if (pat) goToPattern(pat.cat + 'P' + pat.num);
}

/**
 * Redessine la page Journal avec onglets Historique/Progression
 * @returns {string} HTML du contenu Journal
 */
function renderJournalPage() {
  const icoJournal    = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/></svg>`;
  const icoProgression = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="20" x2="5" y2="12"/><line x1="10" y1="20" x2="10" y2="6"/><line x1="15" y1="20" x2="15" y2="10"/><line x1="20" y1="20" x2="20" y2="3"/><line x1="2" y1="20" x2="23" y2="20"/></svg>`;
  const seg = `
    <div class="filter-seg" style="margin-bottom:16px">
      <button class="${journalSubTab==='stats'?'active':''}" onclick="setJournalSubTab('stats')" style="display:flex;align-items:center;justify-content:center;gap:5px">${icoProgression} Progression</button>
      <button class="${journalSubTab==='journal'?'active':''}" onclick="setJournalSubTab('journal')" style="display:flex;align-items:center;justify-content:center;gap:5px">${icoJournal} Historique</button>
    </div>`;
  return seg + (journalSubTab === 'stats' ? renderGlobalProgress() : renderJournal());
}

/**
 * Alias pour renderGlobalProgress() — Redessine l'onglet Progress
 * @returns {string} HTML du contenu Progress
 */
function renderProgress() {
  return renderGlobalProgress();
}


function goToPattern(groupKey) {
  // Ouvre le tiroir du pattern dans l'onglet Patterns
  // Reset les filtres pour être sûr que la carte est visible
  state.filter = 'all';
  state.diffFilter = 'all';
  state.openCards[groupKey] = true;
  showTab('patterns');
  setTimeout(() => {
    const el = document.getElementById('card-' + groupKey);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 80);
}


// ── JOURNAL TAB ──
function renderJournal() {
  if (!PATTERN_JOURNAL || PATTERN_JOURNAL.length === 0) {
    return `
    <div style="padding:20px;text-align:center;color:var(--text2)">
      <div style="font-size:48px;margin-bottom:12px">📝</div>
      <div style="font-size:14px;font-weight:500">Journal vide</div>
      <div style="font-size:12px;color:var(--text3);margin-top:8px">Les patterns seront enregistrés ici au fur et à mesure</div>
    </div>`;
  }

  // Grouper par jour (date locale) — on stocke aussi le timestamp max pour un tri fiable
  const byDay = {};
  PATTERN_JOURNAL.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dayKey = date.toLocaleDateString('fr-FR');
    if (!byDay[dayKey]) byDay[dayKey] = { entries: [], maxTs: 0 };
    byDay[dayKey].entries.push(entry);
    byDay[dayKey].maxTs = Math.max(byDay[dayKey].maxTs, entry.timestamp);
  });

  // Trier les jours en ordre décroissant (plus récent en premier) — via timestamp, pas via parsing de chaîne locale
  const sortedDays = Object.keys(byDay).sort((a, b) => {
    return byDay[b].maxTs - byDay[a].maxTs;
  });

  // Calculer le delta de cases cochées par jour (checkedCount cumulatif → incrément quotidien)
  // On travaille en ordre chronologique ascendant pour accéder au jour précédent
  const sortedDaysAsc = [...sortedDays].reverse();
  // Map dayKey → total de cases au dernier play du jour
  const lastCheckedByDay = {};
  sortedDaysAsc.forEach(dk => {
    const dayEntries = byDay[dk].entries;
    lastCheckedByDay[dk] = dayEntries[dayEntries.length - 1].checkedCount || 0;
  });
  // Delta = total fin de jour J - total fin de jour J-1 (min 0 en cas de décoché)
  const deltaByDay = {};
  sortedDaysAsc.forEach((dk, i) => {
    const current = lastCheckedByDay[dk];
    const prev    = i > 0 ? lastCheckedByDay[sortedDaysAsc[i - 1]] : 0;
    deltaByDay[dk] = Math.max(0, current - prev);
  });

  let html = `<style>
    .journal-accordion{margin-bottom:10px}
    .journal-accordion details{border:1px solid var(--border);border-radius:8px;overflow:hidden}
    .journal-accordion summary{list-style:none;display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 14px;background:var(--blue-light);font-weight:600;color:var(--blue);user-select:none;transition:background .15s}
    .journal-accordion details[open] summary{background:var(--blue);color:#fff}
    .journal-accordion summary:hover{opacity:.9}
    .journal-accordion details[open] summary span{transform:none!important}
    .journal-accordion .summary-chevron{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px}
    .journal-accordion .summary-chevron::before{content:'▼';transition:none}
    .journal-accordion details[open] .summary-chevron::before{content:'▲'}
    .journal-entries{padding:0}
    .journal-entry{padding:12px 14px;border-bottom:1px solid var(--border);font-size:12px;display:grid;grid-template-columns:50px 1fr auto;gap:10px;align-items:center;line-height:1.5;cursor:pointer;transition:background .15s}
    .journal-entries > .journal-entry:last-child{border-bottom:none}
    .journal-entry:hover{background:rgba(15,76,92,.05)}
    .journal-time{color:var(--text3);font-weight:600;font-size:11px}
    .journal-pattern-info{display:flex;flex-direction:column;gap:4px}
    .journal-pattern-name{color:var(--text);font-weight:500;cursor:pointer;text-decoration:underline;transition:color .15s}
    .journal-pattern-name:hover{color:var(--blue)}
    .journal-pattern-id{font-size:10px;color:var(--text3)}
    .journal-meta{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
    .journal-meta-badge{display:inline-block;background:var(--orange-light);color:var(--orange);padding:2px 6px;border-radius:4px;font-weight:500;font-size:11px;white-space:nowrap}
    .journal-meta-train{background:#FFF3E0;color:#E65100}
    .journal-meta-pyramide{background:#E8F5E9;color:#2E7D32}
    .journal-meta-shuffle{background:#F3E5F5;color:#6A1B9A}
    .journal-day-summary{display:flex;justify-content:space-between;align-items:center;width:100%;font-size:12px}
    .journal-day-title{font-weight:600}
    .journal-day-stats-mini{font-size:11px;color:var(--text3);text-align:right}
  </style>`;

  sortedDays.forEach((dayKey, idx) => {
    const entries = byDay[dayKey].entries;
    const isToday = new Date().toLocaleDateString('fr-FR') === dayKey;
    const open = isToday ? 'open' : ''; // Ouvrir le jour actuel par défaut

    // Grouper les entrées par patId — les séquences Labo se groupent par nom de preset
    // (sinon toutes les séquences Labo du jour se fondraient sous la même clé '__shaker__')
    const byPattern = {};
    entries.forEach(entry => {
      const groupKey = entry.isLabo ? `__shaker__::${entry.patName}` : entry.patId;
      if (!byPattern[groupKey]) {
        byPattern[groupKey] = [];
      }
      byPattern[groupKey].push(entry);
    });

    // Résumé du jour
    const uniquePatterns = Object.keys(byPattern).length;
    const totalPlays = entries.length;
    const newCases = deltaByDay[dayKey] || 0;
    const casesStr = newCases > 0
      ? `+${newCases} case${newCases > 1 ? 's' : ''} •`
      : '';

    html += `
    <div class="journal-accordion">
      <details ${open}>
        <summary>
          <div class="journal-day-summary">
            <span class="journal-day-title">${isToday ? '📅 Aujourd\'hui' : dayKey}</span>
            <span class="journal-day-stats-mini">
              ${casesStr}
              ${uniquePatterns} pattern${uniquePatterns > 1 ? 's' : ''} •
              ${totalPlays} relecture${totalPlays > 1 ? 's' : ''}
            </span>
          </div>
          <span class="summary-chevron"></span>
        </summary>
        <div class="journal-entries">`;

    // Pour chaque pattern du jour, afficher UNE SEULE ligne condensée
    Object.entries(byPattern).forEach(([groupKey, patEntries]) => {
      // Trier par timestamp pour que la première lecture soit en premier
      patEntries.sort((a, b) => a.timestamp - b.timestamp);
      const firstEntry = patEntries[0];
      const isLabo = !!firstEntry.isLabo;

      // Tempo min/max
      const tempos = patEntries.map(e => e.bpm);
      const bpmMin = Math.min(...tempos);
      const bpmMax = Math.max(...tempos);
      const bpmText = bpmMin === bpmMax ? `${bpmMin}` : `${bpmMin}–${bpmMax}`;

      // Heure de la première lecture
      const time = new Date(firstEntry.timestamp).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});

      // Nombre de fois joué
      const playCount = patEntries.length;

      // Modes utilisés (deduplicated)
      const hasTrainMode = patEntries.some(e => e.trainMode);
      const hasPyramideMode = patEntries.some(e => e.pyramideMode);
      const hasShuffleMode = patEntries.some(e => e.shuffleMode);

      const modesText = [];
      if (hasTrainMode) modesText.push('🎯');
      if (hasPyramideMode) modesText.push('🔺');
      if (hasShuffleMode) modesText.push('🔀');
      const modesBadge = modesText.length > 0 ? `<span style="color:var(--text2);font-size:10px">${modesText.join(' ')}</span>` : '';

      const clickHandler = isLabo ? `goToLaboFromJournal('${firstEntry.patName.replace(/'/g,"\\'")}')` : `goToPatternFromJournal('${firstEntry.patId}')`;
      const subLabel = isLabo ? 'Labo — séquence' : firstEntry.patId;

      html += `
      <div class="journal-entry">
        <div class="journal-time">${time}</div>
        <div class="journal-pattern-info" onclick="${clickHandler}">
          <div class="journal-pattern-name">${isLabo ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;opacity:.75"><g transform="translate(8,13) rotate(-20)"><path d="M-3,-9 L-3,5 Q-3,9 0,9 Q3,9 3,5 L3,-9" stroke-width="1.7"/><line x1="-4" y1="-10.5" x2="4" y2="-10.5" stroke-width="2" stroke-linecap="round"/><path d="M-2.5,2 L-2.5,5 Q-2.5,8.5 0,8.5 Q2.5,8.5 2.5,5 L2.5,2 Z" fill="currentColor" stroke="none" opacity="0.9"/></g><circle cx="16" cy="9" r="2.5" fill="currentColor" stroke="none"/><line x1="18.5" y1="9" x2="18.5" y2="2" stroke="currentColor" stroke-width="1.5"/><line x1="18.5" y1="2" x2="22" y2="3.5" stroke="currentColor" stroke-width="1.5"/></svg>' : ''}${firstEntry.patName}</div>
          <div class="journal-pattern-id">${subLabel}</div>
        </div>
        <div class="journal-meta">
          <span style="font-weight:600;color:var(--orange)">${bpmText} BPM</span>
          <span style="font-size:11px;color:var(--text3)">(${playCount}×)</span>
          ${modesBadge}
        </div>
      </div>`;
    });

    html += `
        </div>
      </details>
    </div>`;
  });

  // Bouton réinitialiser
  html += `
  <div style="margin-top:20px;display:flex;gap:8px">
    <button onclick="if(confirm('Effacer tout le journal ?')) { PATTERN_JOURNAL=[]; savePatternJournal(); render(); }" style="flex:1;padding:10px;background:var(--red);color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px">
      🗑 Réinitialiser le journal
    </button>
  </div>

  `;

  return html;
}


