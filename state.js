// ─── STATE ────────────────────────────────────────────────────────────────────
// Extrait de index.html lors du refactor v1.15
// Contient : state, SETTINGS, constantes cordes, load/save localStorage,
//            getProgressKey, getPatternPct, getGroupPct
// Dépendances : PATTERNS (data.js), TEMPOS/INTERPS (data.js)
// ─────────────────────────────────────────────────────────────────────────────

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  tab: 'journal',
  filter: 'all',
  diffFilter: 'all',
  patternSort: 'progressif',
  openCards: {},
  progress: {},
  favorites: {},
  parcoursOpen: null,
  etapeOpen: {},   // accordéon par numéro d'étape
  cardDir: {},   // direction active par groupe, ex: {'A4P1b':'U'}
  dailyChallengeOpen: false,  // accordéon challenge du jour (fermé par défaut)

  gammeActiveStrings: {}, // { "gammeP1": [true,true,true,true,true,true] } — [e,B,G,D,A,E]
  gammeSelectedDir: {},  // { "pentaTrans1": "1→2" } — direction active par gamme avec directions multiples
  rhythmicStringSelect: {}, // { "rhythmic-test": "A" } — corde sélectionnée pour les patterns stringSelector
  laboUnlockedSeen: false, // true dès que le popup "Labo débloqué" (mode Guidé) a été affiché une fois
  proUnlockedSeen: false,  // true dès que le popup "passage en mode Pro" (niveau 7 à 100%) a été affiché une fois
  trainUnlockedSeen: false, // true dès que le popup "Mode entraînement débloqué" (niveau 1 à 100%) a été affiché une fois
  neckUnlockedSeen: false,    // true dès que le popup "Mid/High débloqué" (niveau 3 à 100%) a été affiché une fois
  stringUnlockedSeen: false,  // true dès que le popup "Groupe de cordes débloqué" (niveau 4 à 100%) a été affiché une fois
  loopExtUnlockedSeen: false, // true dès que le popup "Loop étendu débloqué" (niveau 5 à 100%) a été affiché une fois
  shuffleUnlockedSeen: false, // true dès que le popup "Shuffle débloqué" (niveau 6 à 100%) a été affiché une fois
  laboForceUnlocked: false, // true si l'utilisateur a choisi de débloquer le Labo en avance (avant le niveau 2)
};

// ─── SETTINGS (cordes / son / case de départ) ────────────────────────────────
// Ordre canonique des cordes (top→bottom dans le tab)
const STRING_LINES = ['e','B','G','D','A','E'];
// Décalage en lignes : DGBE = 0 (pattern sur cordes 1-4 : e,B,G,D)
//                     ADGB = +1 (pattern descendu d'1 ligne : B,G,D,A)
//                     EADG = +2 (pattern descendu de 2 lignes : G,D,A,E)
const STRING_SHIFTS = { DGBE: 0, ADGB: 1, EADG: 2 };

const PREVIEW_SOUND_KEYS = ['doux','nylon','electrique','epiano'];
const PREVIEW_SOUND_LABELS = { doux:'Doux', nylon:'Nylon', electrique:'Élec.', epiano:'E-Piano' };

const SETTINGS = {
  stringGroup: 'DGBE',     // 'DGBE' | 'ADGB' | 'EADG'
  previewSound: 'doux',    // 'doux' | 'piano' | 'guitare' | 'auto'
  neckPosition: 'mid',     // 'mid' (case 5, offset 0) | 'high' (case 12, offset 7)
  showDiffFilter: false,   // afficher filtre Basique/Technique/Complexe sous le tri patterns
  showNeckBtn: false,      // afficher/masquer le bouton mid/high dans le header
  showShuffleBtn: false,   // afficher bouton Shuffle dans la row 1 du header
  showLoopExtBtn: false,   // afficher bouton Loop étendu dans la row 1 du header
  lightMode: true,         // mode Light par défaut (Light/Pro) : formes/direction/interp réduites (Patterns uniquement, pas le Labo)
  showLightBtn: false,     // afficher bouton Mode Light dans la row 1 du header
  guidedMode: true,        // mode Guidé par défaut : niveaux à débloquer un par un (onglet Patterns, tri Progressif)
  showStringBtn: false,    // afficher bouton groupe de cordes dans la row 1 du header
  showSubdivBtn: false,    // afficher bouton subdivision rythmique dans le header
  showTrain: false,        // afficher bouton Train. dans le header
  showCountin: true,       // afficher bouton Décompte dans le header
  showClick: true,         // afficher bouton Clic dans le header
  showMetroSolo: false,    // afficher bouton Métronome solo dans le header
  showHeaderStats: false,  // afficher stats streak (🔥⚡📅) dans le header
  clickSubdiv: 4,          // 2 | 3 | 4 | 6 — subdivision du clic
  navHidden: false,        // true = nav masquée (portrait + paysage), togglé par long press logo
  loopExt: 0,              // 0 = base · −1 = retour même niveau · +N = extension pyramide
  trainMode: false,        // mode entraînement progressif
  trainBpmStart: 40,       // tempo de départ — appliqué à chaque lancement en mode entraînement
  trainBpmStep: 5,         // +N BPM par incrément (1-5)
  trainLoopEvery: 1,       // incrémenter toutes les N boucles (1-5)
  trainBpmMax: 120,        // tempo plafond (arrêt des incréments)
  trainPyramide: false,    // mode pyramide : redescend après atteindre le max
  tempoPresets: { lent: 40, cool: 70, chaud: 100 },  // BPM presets pour chaque zone
  patVolume: 75,             // 0–100 → gain tablature (75 ≈ ×1.5)
  clickVolume: 60,           // 0–100 → gain clic métronome (60 ≈ ×0.36)
  shuffleMode: false,        // mode shuffle/swing (facteur fixe 0.67 = triolet)
  darkMode: false,           // true = mode sombre activé manuellement
  tabColor: '#fff',          // couleur des tablatures ASCII : '#fff' | '#a8d8a8' | '#4dd0e1' | '#ff9966' | '#d0d0d0'
  tabSize: 13,               // taille police tablatures ASCII : 11 | 13 | 16 | 20
};

/**
 * Charge les paramètres sauvegardés depuis localStorage
 * Avec validation stricte pour chaque clé
 */
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('dicoSettings') || '{}');
    if (s.stringGroup && STRING_SHIFTS[s.stringGroup] !== undefined) SETTINGS.stringGroup = s.stringGroup;
    if (PREVIEW_SOUND_KEYS.includes(s.previewSound)) SETTINGS.previewSound = s.previewSound;
    if (['mid', 'high'].includes(s.neckPosition)) SETTINGS.neckPosition = s.neckPosition;
    if (s.showDiffFilter !== undefined) SETTINGS.showDiffFilter = s.showDiffFilter;
    if (s.showNeckBtn !== undefined) SETTINGS.showNeckBtn = s.showNeckBtn;
    if (s.showShuffleBtn !== undefined) SETTINGS.showShuffleBtn = s.showShuffleBtn;
    if (s.showLoopExtBtn !== undefined) SETTINGS.showLoopExtBtn = s.showLoopExtBtn;
    if (s.lightMode !== undefined) SETTINGS.lightMode = s.lightMode;
    if (s.showLightBtn !== undefined) SETTINGS.showLightBtn = s.showLightBtn;
    if (s.guidedMode !== undefined) SETTINGS.guidedMode = s.guidedMode;
    if (s.showStringBtn  !== undefined) SETTINGS.showStringBtn  = s.showStringBtn;
    if (s.showSubdivBtn !== undefined) SETTINGS.showSubdivBtn = s.showSubdivBtn;
    if (s.showTrain !== undefined) SETTINGS.showTrain = s.showTrain;
    if (s.showCountin !== undefined) SETTINGS.showCountin = s.showCountin;
    if (s.showClick !== undefined) SETTINGS.showClick = s.showClick;
    if (s.showMetroSolo !== undefined) SETTINGS.showMetroSolo = s.showMetroSolo;
    if (s.showHeaderStats !== undefined) SETTINGS.showHeaderStats = s.showHeaderStats;
    if ([2,3,4,6].includes(parseInt(s.clickSubdiv))) SETTINGS.clickSubdiv = parseInt(s.clickSubdiv);
    if (s.navHidden === true) SETTINGS.navHidden = true;
    const le = parseInt(s.loopExt);
    if ([-1,0,1,2,3,4].includes(le)) SETTINGS.loopExt = le;
    if (s.trainMode === true) SETTINGS.trainMode = true;
    const tbst = parseInt(s.trainBpmStart);
    if (!isNaN(tbst) && tbst >= 20 && tbst <= 200) SETTINGS.trainBpmStart = tbst;
    const tbs = parseInt(s.trainBpmStep);
    if ([1,2,3,4,5].includes(tbs)) SETTINGS.trainBpmStep = tbs;
    const tle = parseInt(s.trainLoopEvery);
    if ([1,2,3,4,5].includes(tle)) SETTINGS.trainLoopEvery = tle;
    const tbm = parseInt(s.trainBpmMax);
    if (!isNaN(tbm) && tbm >= 40 && tbm <= 200) SETTINGS.trainBpmMax = tbm;
    const pv = parseInt(s.patVolume);
    if (!isNaN(pv) && pv >= 0 && pv <= 100) SETTINGS.patVolume = pv;
    const cv = parseInt(s.clickVolume);
    if (!isNaN(cv) && cv >= 0 && cv <= 100) SETTINGS.clickVolume = cv;
    if (s.shuffleMode === true) SETTINGS.shuffleMode = true;
    if (s.darkMode === true) SETTINGS.darkMode = true;
    if (['#fff', '#a8d8a8', '#4dd0e1', '#ff9966', '#d0d0d0'].includes(s.tabColor)) SETTINGS.tabColor = s.tabColor;
    if ([11, 13, 16, 20].includes(s.tabSize)) SETTINGS.tabSize = s.tabSize;
    if (s.tempoPresets && typeof s.tempoPresets === 'object') {
      ['lent','cool','chaud'].forEach(k => {
        const v = parseInt(s.tempoPresets[k]);
        if (Number.isFinite(v) && v >= 20 && v <= 200) SETTINGS.tempoPresets[k] = v;
      });
    }
  } catch(e) { console.warn('loadSettings:', e); }
}

/**
 * Sauvegarde les paramètres actuels vers localStorage
 */
function saveSettings() {
  try {
    localStorage.setItem('dicoSettings', JSON.stringify({
      stringGroup: SETTINGS.stringGroup,
      previewSound: SETTINGS.previewSound,
      neckPosition: SETTINGS.neckPosition,
      showDiffFilter: SETTINGS.showDiffFilter,
      showNeckBtn: SETTINGS.showNeckBtn,
      showShuffleBtn: SETTINGS.showShuffleBtn,
      showLoopExtBtn: SETTINGS.showLoopExtBtn,
      lightMode: SETTINGS.lightMode,
      showLightBtn: SETTINGS.showLightBtn,
      guidedMode: SETTINGS.guidedMode,
      showStringBtn:  SETTINGS.showStringBtn,
      showSubdivBtn: SETTINGS.showSubdivBtn,
      showTrain: SETTINGS.showTrain,
      showCountin: SETTINGS.showCountin,
      showClick: SETTINGS.showClick,
      showMetroSolo: SETTINGS.showMetroSolo,
      showHeaderStats: SETTINGS.showHeaderStats,
      clickSubdiv: SETTINGS.clickSubdiv,
      navHidden: SETTINGS.navHidden,
      loopExt: SETTINGS.loopExt,
      trainMode: SETTINGS.trainMode,
      trainBpmStart: SETTINGS.trainBpmStart,
      trainBpmStep: SETTINGS.trainBpmStep,
      trainLoopEvery: SETTINGS.trainLoopEvery,
      trainBpmMax: SETTINGS.trainBpmMax,
      tempoPresets: SETTINGS.tempoPresets,
      patVolume: SETTINGS.patVolume,
      clickVolume: SETTINGS.clickVolume,
      shuffleMode: SETTINGS.shuffleMode,
      darkMode: SETTINGS.darkMode,
      tabColor: SETTINGS.tabColor,
      tabSize: SETTINGS.tabSize,
    }));
  } catch(e) { console.warn('saveSettings:', e); }
}

let PAT_NOTES = {};

/**
 * Charge les notes de patterns depuis localStorage
 */
function loadPatNotes() {
  try { PAT_NOTES = JSON.parse(localStorage.getItem('dicoPatNotes') || '{}'); } catch(e) { PAT_NOTES = {}; }
}

/**
 * Sauvegarde une note pour un pattern
 * @param {string} patId - ID du pattern
 * @param {string} text - Contenu de la note
 */
function savePatNote(patId, text) {
  PAT_NOTES[patId] = text;
  try { localStorage.setItem('dicoPatNotes', JSON.stringify(PAT_NOTES)); } catch(e) { console.warn('savePatNote:', e); }
}

// ─── SESSION TRACE ────────────────────────────────────────────────────────────
// Mémorise par pattern : dernier jeu · BPM max atteint · total de boucles jouées
let PAT_TRACE = {};

/**
 * Charge les traces de jeu des patterns depuis localStorage
 */
function loadPatTrace() {
  try { PAT_TRACE = JSON.parse(localStorage.getItem('dicoPatTrace') || '{}'); } catch(e) { PAT_TRACE = {}; }
}

/**
 * Sauvegarde les traces de jeu des patterns
 */
function savePatTrace() {
  try { localStorage.setItem('dicoPatTrace', JSON.stringify(PAT_TRACE)); } catch(e) { console.warn('savePatTrace:', e); }
}

// ─── PATTERN JOURNAL ──────────────────────────────────────────────────────────
// Enregistre chaque lecture de pattern avec timestamp, tempo, mode
let PATTERN_JOURNAL = [];

/**
 * Charge l'historique de jeu depuis localStorage
 */
function loadPatternJournal() {
  try { PATTERN_JOURNAL = JSON.parse(localStorage.getItem('dicoPatternJournal') || '[]'); } catch(e) { PATTERN_JOURNAL = []; }
}

/**
 * Sauvegarde l'historique de jeu
 */
function savePatternJournal() {
  try { localStorage.setItem('dicoPatternJournal', JSON.stringify(PATTERN_JOURNAL)); } catch(e) { console.warn('savePatternJournal:', e); }
}

/**
 * Enregistre une nouvelle lecture de pattern dans le journal
 * @param {string} patId - ID du pattern joué
 * @param {number} bpm - Tempo à la lecture
 * @param {boolean} trainMode - Mode train/progression activé
 * @param {boolean} pyramideMode - Mode pyramide activé
 * @param {boolean} shuffleMode - Mode shuffle/swing activé
 */
function addJournalEntry(patId, bpm, trainMode, pyramideMode, shuffleMode) {
  const pat = PATTERNS.find(p => p.id === patId);
  if (!pat) return;
  const now = new Date();

  // Compter les cases cochées (progress = true)
  const checkedCount = Object.values(state.progress || {}).filter(v => v === true).length;

  const entry = {
    timestamp: now.getTime(),
    patId: patId,
    patName: pat.name,
    bpm: bpm,
    trainMode: trainMode || false,
    pyramideMode: pyramideMode || false,
    shuffleMode: shuffleMode || false,
    checkedCount: checkedCount,  // Nombre de cases cochées au moment de la lecture
  };
  PATTERN_JOURNAL.push(entry);
  savePatternJournal();
}

/**
 * Enregistre une nouvelle lecture de séquence Labo (Shaker) dans le journal
 * @param {string} presetName - Nom du preset joué (ou 'Séquence Labo' si non sauvegardé)
 * @param {number} bpm - Tempo à la lecture
 * @param {boolean} trainMode - Mode train/progression activé
 * @param {boolean} pyramideMode - Mode pyramide activé
 * @param {boolean} shuffleMode - Mode shuffle/swing activé
 */
function addLaboJournalEntry(presetName, bpm, trainMode, pyramideMode, shuffleMode) {
  const now = new Date();
  const checkedCount = Object.values(state.progress || {}).filter(v => v === true).length;

  const entry = {
    timestamp: now.getTime(),
    patId: '__shaker__',
    patName: presetName || 'Séquence Labo',
    bpm: bpm,
    trainMode: trainMode || false,
    pyramideMode: pyramideMode || false,
    shuffleMode: shuffleMode || false,
    checkedCount: checkedCount,
    isLabo: true,
  };
  PATTERN_JOURNAL.push(entry);
  savePatternJournal();
}

function getSessions() {
  const dates = new Set();
  (PATTERN_JOURNAL || []).forEach(entry => {
    const d = new Date(entry.timestamp);
    dates.add(d.toISOString().slice(0, 10));
  });
  return Array.from(dates).sort();
}

function computeStreak(sessions) {
  if (!sessions.length) return { current: 0, record: 0 };
  const set = new Set(sessions);
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let current = 0;
  let d = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (d) {
    current = 1;
    while (true) {
      const prev = new Date(new Date(d).getTime() - 86400000).toISOString().slice(0, 10);
      if (set.has(prev)) { current++; d = prev; } else break;
    }
  }

  let record = 0, streak = 1;
  for (let i = 1; i < sessions.length; i++) {
    const prevDay = new Date(new Date(sessions[i]).getTime() - 86400000).toISOString().slice(0, 10);
    if (sessions[i - 1] === prevDay) { streak++; } else { streak = 1; }
    record = Math.max(record, streak);
  }
  record = Math.max(record, current, sessions.length > 0 ? 1 : 0);
  return { current, record };
}

/**
 * Charge l'état complet depuis localStorage (progress, favoris, préférences de onglets)
 */
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('dicoPattern') || '{}');
    state.progress  = saved.progress  || {};
    state.favorites = saved.favorites || {};
    if (saved.dailyChallengeOpen !== undefined) state.dailyChallengeOpen = saved.dailyChallengeOpen;
    if (saved.gammeActiveStrings && typeof saved.gammeActiveStrings === 'object') {
      state.gammeActiveStrings = saved.gammeActiveStrings;
    }
    if (saved.gammeSelectedDir && typeof saved.gammeSelectedDir === 'object') {
      state.gammeSelectedDir = saved.gammeSelectedDir;
    }
    if (saved.rhythmicStringSelect && typeof saved.rhythmicStringSelect === 'object') {
      state.rhythmicStringSelect = saved.rhythmicStringSelect;
    }
    if (saved.laboUnlockedSeen !== undefined) state.laboUnlockedSeen = saved.laboUnlockedSeen;
    if (saved.proUnlockedSeen !== undefined) state.proUnlockedSeen = saved.proUnlockedSeen;
    if (saved.trainUnlockedSeen !== undefined) state.trainUnlockedSeen = saved.trainUnlockedSeen;
    if (saved.neckUnlockedSeen !== undefined) state.neckUnlockedSeen = saved.neckUnlockedSeen;
    if (saved.stringUnlockedSeen !== undefined) state.stringUnlockedSeen = saved.stringUnlockedSeen;
    if (saved.loopExtUnlockedSeen !== undefined) state.loopExtUnlockedSeen = saved.loopExtUnlockedSeen;
    if (saved.shuffleUnlockedSeen !== undefined) state.shuffleUnlockedSeen = saved.shuffleUnlockedSeen;
    if (saved.laboForceUnlocked !== undefined) state.laboForceUnlocked = saved.laboForceUnlocked;
  } catch(e) { console.warn('loadState:', e); }
  loadPatNotes();
  loadPatTrace();
  loadPatternJournal();
  loadSettings();
}

/**
 * Sauvegarde l'état complet vers localStorage
 */
function saveState() {
  try {
    localStorage.setItem('dicoPattern', JSON.stringify({
      progress:  state.progress,
      favorites: state.favorites,
      dailyChallengeOpen: state.dailyChallengeOpen,
      gammeActiveStrings:    state.gammeActiveStrings,
      gammeSelectedDir:      state.gammeSelectedDir,
      rhythmicStringSelect:  state.rhythmicStringSelect,
      laboUnlockedSeen: state.laboUnlockedSeen,
      proUnlockedSeen: state.proUnlockedSeen,
      trainUnlockedSeen: state.trainUnlockedSeen,
      neckUnlockedSeen: state.neckUnlockedSeen,
      stringUnlockedSeen: state.stringUnlockedSeen,
      loopExtUnlockedSeen: state.loopExtUnlockedSeen,
      shuffleUnlockedSeen: state.shuffleUnlockedSeen,
      laboForceUnlocked: state.laboForceUnlocked,
    }));
  } catch(e) { console.warn('saveState:', e); }
}

/**
 * Génère une clé unique pour tracker la progression d'un pattern
 * Format: patId__fing__mode__interp__tempoKey[__sh (si shuffle)]
 * @param {string} patId - ID du pattern
 * @param {number} fing - Numéro de doigtage (1)
 * @param {string} mode - Direction : 'U' | 'D' | 'M'
 * @param {string} interp - Clé interprétation : 'Down' | 'Up' | 'Sweep' etc
 * @param {string|Object} tempo - Clé tempo ou objet tempo {key: string}
 * @returns {string} Clé de progression unique
 */
function getProgressKey(patId, fing, mode, interp, tempo) {
  const t = typeof tempo === 'object' ? tempo.key : tempo;
  const sh = SETTINGS.shuffleMode ? '__sh' : '';
  return `${patId}__${fing}__${mode}__${interp}__${t}${sh}`;
}

/**
 * Calcule le pourcentage de progression d'un pattern
 * @param {string} patId - ID du pattern
 * @returns {number} Pourcentage de 0 à 100
 */
function getPatternPct(patId) {
  const pat = PATTERNS.find(p => p.id === patId);
  const mode = pat ? pat.dir : 'U';
  let total = 0, done = 0;
  const interpsToUse = getLightModeInterps(INTERPS);
  [1].forEach(f => interpsToUse.forEach(i => TEMPOS.forEach(t => {
    total++;
    if (state.progress[getProgressKey(patId, f, mode, i, t)]) done++;
  })));
  return total > 0 ? Math.round(done / total * 100) : 0;
}

// ── MODE LIGHT ────────────────────────────────────────────────────────────────
/**
 * Retourne les formes à afficher pour un pattern, filtrées si le mode Light est actif
 * et que la famille de formes du pattern a une entrée dans LIGHT_MODE_FORME_EXCLUSIONS.
 * @param {Object} p - Pattern (doit avoir p.formeTabs)
 * @returns {Array<string>} formeTabs éventuellement filtré
 */
function getLightModeFormeTabs(p) {
  if (!p || !p.formeTabs) return p ? p.formeTabs : [];
  if (!SETTINGS.lightMode) return p.formeTabs;
  const excluded = LIGHT_MODE_FORME_EXCLUSIONS[p.formeTabs.join(',')];
  if (!excluded) return p.formeTabs;
  const filtered = p.formeTabs.filter(f => !excluded.includes(f));
  return filtered.length ? filtered : p.formeTabs;
}

/**
 * Ne garde que la première interprétation (Pick bas / Down) quand le mode Light est actif.
 * @param {Array<string>} interps - Liste complète des interprétations (INTERPS ou p.customInterps)
 * @returns {Array<string>}
 */
function getLightModeInterps(interps) {
  if (!SETTINGS.lightMode || !interps || !interps.length) return interps;
  return [interps[0]];
}

/**
 * Retourne les versions (directions) à compter pour un pattern, réduites à Mix seule
 * quand le mode Light est actif et que ce pattern propose Mix (voir getGammeSelectedDir).
 * @param {Object} p - Pattern (doit avoir p.versionTabs)
 * @returns {Array<string>}
 */
function getLightModeVersionTabs(p) {
  if (!p || !p.versionTabs) return p ? p.versionTabs : [];
  if (!SETTINGS.lightMode) return p.versionTabs;
  return p.versionTabs.includes('M') ? ['M'] : p.versionTabs;
}

/**
 * Calcule le pourcentage de progression global d'un groupe (toutes directions confondues)
 * Gère les cas spéciaux (gammes avec directions tabs, groupes de cordes)
 * @param {string} groupKey - Clé du groupe (ex: 'A4P1')
 * @returns {number} Pourcentage de 0 à 100
 */
function getGroupPct(groupKey) {
  const pats = PATTERNS.filter(p => p.cat + 'P' + p.num === groupKey);
  let total = 0, done = 0;
  pats.forEach(p => {
    if (p.hasDirectionTabs && p.versionTabs && p.formeTabs) {
      // Pattern unifié avec versionTabs × formeTabs (ex: A2P1 — special ou non)
      // Mode Light : versions/formes réduites au sous-ensemble affiché dans l'UI
      const versionsToUse = getLightModeVersionTabs(p);
      const formesToUse = getLightModeFormeTabs(p);
      versionsToUse.forEach(vk => {
        formesToUse.forEach(fk => {
          const progressId = p.id + '__' + vk + '_' + fk;
          const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
          interpsToUse.forEach(i => TEMPOS.forEach(t => {
            total++;
            if (state.progress[getProgressKey(progressId, 1, 'U', i, t)]) done++;
          }));
        });
      });
    } else if (p.special && p.hasDirectionTabs && p.directions) {
      // Gamme avec onglets de direction simples : une progression par direction
      Object.keys(p.directions).forEach(dirKey => {
        const progressId = p.id + '__' + dirKey.replace(/[→↔]/g, '-');
        const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
        interpsToUse.forEach(i => TEMPOS.forEach(t => {
          total++;
          if (state.progress[getProgressKey(progressId, 1, 'U', i, t)]) done++;
        }));
      });
    } else if (p.dir) {
      // Pattern simple (une seule direction fixe, ex: A4P1)
      const interpsToUse = getLightModeInterps(p.customInterps || INTERPS);
      interpsToUse.forEach(i => TEMPOS.forEach(t => {
        total++;
        if (state.progress[getProgressKey(p.id, 1, p.dir, i, t)]) done++;
      }));
    }
  });
  return total ? Math.round(done / total * 100) : 0;
}

// ── MODE GUIDÉ ────────────────────────────────────────────────────────────────
/**
 * Retourne le plus haut niveau débloqué (1 = toujours débloqué). Un niveau N+1 se débloque
 * quand tous les groupes du niveau N sont à 100% de progression (voir getGroupPct).
 * Si SETTINGS.guidedMode est désactivé, tous les niveaux sont considérés débloqués.
 * @returns {number}
 */
function getUnlockedLevel() {
  if (!SETTINGS.guidedMode) return PATTERN_LEVEL_GROUPS.length;
  for (let i = 0; i < PATTERN_LEVEL_GROUPS.length; i++) {
    const allDone = PATTERN_LEVEL_GROUPS[i].every(key => getGroupPct(key) === 100);
    if (!allDone) return i + 1;
  }
  return PATTERN_LEVEL_GROUPS.length;
}

/**
 * Indique si un niveau donné est accessible (débloqué) selon getUnlockedLevel().
 * @param {number} level
 * @returns {boolean}
 */
function isLevelUnlocked(level) {
  return level <= getUnlockedLevel();
}

/**
 * Indique si l'onglet Labo est accessible : toujours vrai hors mode Guidé, ou une fois
 * les niveaux 1 et 2 terminés à 100% en mode Guidé (i.e. le niveau 3 est débloqué).
 * @returns {boolean}
 */
function isLaboUnlocked() {
  return !SETTINGS.guidedMode || !SETTINGS.lightMode || getUnlockedLevel() >= 3 || state.laboForceUnlocked;
}

/**
 * Indique si TOUS les niveaux de progression (1 à 7) sont terminés à 100%, y compris le
 * dernier (contrairement à getUnlockedLevel() qui ne garantit que "niveau atteignable").
 * @returns {boolean}
 */
function isAllLevelsComplete() {
  return PATTERN_LEVEL_GROUPS.every(levelGroups => levelGroups.every(key => getGroupPct(key) === 100));
}

/**
 * Indique si le Niveau 1 est terminé à 100% (tous ses groupes).
 * @returns {boolean}
 */
function isLevel1Complete() {
  return PATTERN_LEVEL_GROUPS[0].every(key => getGroupPct(key) === 100);
}

/**
 * Indique si un niveau donné (1-indexé) est terminé à 100% (tous ses groupes).
 * @param {number} n
 * @returns {boolean}
 */
function isLevelComplete(n) {
  const groupKeys = PATTERN_LEVEL_GROUPS[n - 1];
  return !!groupKeys && groupKeys.every(key => getGroupPct(key) === 100);
}


