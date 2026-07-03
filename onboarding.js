// ── ONBOARDING CONFIG ──────────────────────────────────────────────────────────
// Index modifiable — Change ces valeurs pour personnaliser l'onboarding

const ONBOARDING_CONFIG = {
  // Écran de bienvenue
  welcome: {
    title: "Bienvenue dans Dico Pattern",
    description: "L'application qui vous permet de progresser chaque jour à la guitare. De débutant à virtuose, affinez votre pratique avec une app pensée pour VOTRE niveau.",
    emoji: "🎸",
  },

  // Questions du questionnaire
  questions: [
    {
      id: 'years',
      title: "Depuis combien d'années jouez-vous ?",
      type: 'select',
      options: [
        { value: 0.5, label: "Moins de 6 mois", score: 0 },
        { value: 1, label: "6 mois à 1 an", score: 1 },
        { value: 2, label: "1 à 2 ans", score: 2 },
        { value: 4, label: "2 à 5 ans", score: 3 },
        { value: 8, label: "5 à 10 ans", score: 4 },
        { value: 15, label: "+10 ans", score: 5 },
      ],
    },
    {
      id: 'hours',
      title: "Combien d'heures par semaine pratiquez-vous ?",
      type: 'select',
      options: [
        { value: 1, label: "Moins de 1h", score: 0 },
        { value: 2, label: "1-2h", score: 1 },
        { value: 5, label: "3-5h", score: 2 },
        { value: 8, label: "5-10h", score: 3 },
        { value: 15, label: "+10h", score: 4 },
      ],
    },
    {
      id: 'profile',
      title: "Quel style de guitariste vous inspire ?",
      type: 'select',
      options: [
        { value: 'cobain', label: "Kurt Cobain — Grunge / Alt-rock", score: 1 },
        { value: 'page', label: "Jimmy Page — Blues-rock", score: 2 },
        { value: 'django', label: "Django Reinhardt — Jazz / Swing", score: 2 },
        { value: 'malmsteen', label: "Yngwie Malmsteen — Neoclassical metal", score: 4 },
        { value: 'none', label: "Je n'en connais aucun", score: 1 },
      ],
    },
  ],

  // Profils de guitaristes avec leurs caractéristiques
  profiles: {
    cobain: {
      label: "Kurt Cobain",
      description: "Grunge/Alt-rock — Puissance et simplicité",
      styleScore: 1,
      tempoMultiplier: 0.9, // Tempos un peu plus lents
      subdivMultiplier: 0.8, // Préfère les croches
    },
    page: {
      label: "Jimmy Page",
      description: "Blues-rock classique — Dynamique et feelé",
      styleScore: 2,
      tempoMultiplier: 1.0,
      subdivMultiplier: 1.0, // Équilibré
    },
    django: {
      label: "Django Reinhardt",
      description: "Jazz/Swing — Sophistication et nuance",
      styleScore: 2,
      tempoMultiplier: 1.2, // Tempos plus rapides
      subdivMultiplier: 1.2, // Préfère les triolets
    },
    malmsteen: {
      label: "Yngwie Malmsteen",
      description: "Neoclassical metal — Virtuosité extrême",
      styleScore: 4,
      tempoMultiplier: 1.3, // Tempos rapides
      subdivMultiplier: 1.5, // Préfère les sextolets
    },
    none: {
      label: "Pas d'inspiration particulière",
      description: "On va trouver votre style ensemble !",
      styleScore: 1,
      tempoMultiplier: 0.8,
      subdivMultiplier: 1.0,
    },
  },

  // Presets de base (avant ajustements)
  // subdivCap : plafond de subdivision — empêche le multiplicateur de style de dépasser cette valeur
  basePresets: {
    0: { tempoPresets: { lent: 40, cool: 60, chaud: 80 },  clickSubdiv: 2, subdivCap: 4, label: 'Débutant' },
    1: { tempoPresets: { lent: 50, cool: 70, chaud: 90 },  clickSubdiv: 2, subdivCap: 4, label: 'Débutant+' },
    2: { tempoPresets: { lent: 60, cool: 80, chaud: 100 }, clickSubdiv: 4, subdivCap: 6, label: 'Intermédiaire' },
    3: { tempoPresets: { lent: 70, cool: 90, chaud: 110 }, clickSubdiv: 4, subdivCap: 6, label: 'Intermédiaire+' },
    4: { tempoPresets: { lent: 80, cool: 100, chaud: 120 },clickSubdiv: 4, subdivCap: 4, label: 'Avancé' },
    5: { tempoPresets: { lent: 100, cool: 120, chaud: 150 },clickSubdiv: 4, subdivCap: 4, label: 'Virtuose' },
  },
};

// ── ONBOARDING LOGIC ────────────────────────────────────────────────────────────

let onboardingState = {
  screen: 0, // 0: welcome, 1-3: questions, 4: results
  answers: {},
  scores: { years: 0, hours: 0, profile: 0 },
};

function hasCompletedOnboarding() {
  return localStorage.getItem('dico-onboarding-done') === 'true';
}

function markOnboardingComplete(level) {
  localStorage.setItem('dico-onboarding-done', 'true');
  localStorage.setItem('dico-onboarding-level', level);
}

function calculatePresets() {
  const { years, hours, profile } = onboardingState.answers;

  // Obtenir les scores
  const yearQuestion = ONBOARDING_CONFIG.questions[0];
  const hoursQuestion = ONBOARDING_CONFIG.questions[1];
  const profileQuestion = ONBOARDING_CONFIG.questions[2];

  const yearScore = yearQuestion.options.find(o => o.value === years)?.score || 0;
  const hoursScore = hoursQuestion.options.find(o => o.value === hours)?.score || 0;
  const profileData = ONBOARDING_CONFIG.profiles[profile];
  const profileScore = profileData?.styleScore || 0;

  // Score total (0-10) — années/heures pèsent 80% du niveau, le style de guitariste seulement 20%
  // (le style ajuste surtout le tempo/subdivision, il ne doit pas plafonner un joueur expérimenté)
  const yearMaxScore  = Math.max(...yearQuestion.options.map(o => o.score));
  const hoursMaxScore = Math.max(...hoursQuestion.options.map(o => o.score));
  const profileMaxScore = Math.max(...Object.values(ONBOARDING_CONFIG.profiles).map(p => p.styleScore));
  const experienceNorm = (yearScore / yearMaxScore + hoursScore / hoursMaxScore) / 2;
  const profileNorm = profileScore / profileMaxScore;
  const totalScore = Math.min(10, (experienceNorm * 0.8 + profileNorm * 0.2) * 10);

  // Déterminer le preset de base
  const basePreset = ONBOARDING_CONFIG.basePresets[Math.floor(totalScore / 2)];

  // Appliquer les ajustements du profil, puis clamp sur la plage propre à chaque tempo (TEMPOS)
  const clampToRange = (val, key) => {
    const t = TEMPOS.find(x => x.key === key);
    if (!t) return val;
    return Math.min(t.rangeMax, Math.max(t.rangeMin, val));
  };
  const adjustedTempos = {
    lent:  clampToRange(Math.round(basePreset.tempoPresets.lent  * profileData.tempoMultiplier), 'lent'),
    cool:  clampToRange(Math.round(basePreset.tempoPresets.cool  * profileData.tempoMultiplier), 'cool'),
    chaud: clampToRange(Math.round(basePreset.tempoPresets.chaud * profileData.tempoMultiplier), 'chaud'),
  };

  // Pour la subdivision, c'est plus discret (rester dans les valeurs valides: 2, 3, 4, 6)
  // Le plafond subdivCap du preset empêche le style de dépasser la subdivision voulue pour ce niveau
  let subdivAdjusted = basePreset.clickSubdiv;
  if (profileData.subdivMultiplier > 1.1 && basePreset.clickSubdiv === 4) {
    subdivAdjusted = 6; // Passer à sextolets pour Malmsteen
  } else if (profileData.subdivMultiplier > 1.0 && basePreset.clickSubdiv === 2) {
    subdivAdjusted = 4; // Passer à doubles croches
  }
  subdivAdjusted = Math.min(subdivAdjusted, basePreset.subdivCap ?? 6);

  return {
    tempoPresets: adjustedTempos,
    clickSubdiv: subdivAdjusted,
    label: basePreset.label,
    score: totalScore,
    profile: profileData.label,
  };
}

function applyOnboardingSettings(presets) {
  SETTINGS.tempoPresets = presets.tempoPresets;
  SETTINGS.clickSubdiv = presets.clickSubdiv;
  saveSettings();
}

function SUBDIV_LABEL(val) {
  const labels = { 2: '8', 3: '3:8', 4: '16', 6: '6:16' };
  return labels[val] || `÷${val}`;
}

function showOnboarding() {
  if (hasCompletedOnboarding()) return;

  // Créer le modal principal
  const modal = document.createElement('div');
  modal.id = 'onboarding-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  `;

  const content = document.createElement('div');
  content.id = 'onboarding-content';
  content.style.cssText = `
    background: var(--bg);
    border-radius: 20px;
    padding: 32px 24px;
    width: 90%;
    max-width: 400px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0,0,0,.35);
    color: var(--text);
    animation: fadeIn .25s ease;
  `;

  modal.appendChild(content);
  document.body.appendChild(modal);

  // Afficher l'écran approprié
  showOnboardingScreen();
}

function showOnboardingScreen() {
  const content = document.getElementById('onboarding-content');
  if (!content) return;

  if (onboardingState.screen === 0) {
    showWelcomeScreen(content);
  } else if (onboardingState.screen >= 1 && onboardingState.screen <= 3) {
    showQuestionScreen(content, onboardingState.screen - 1);
  } else if (onboardingState.screen === 4) {
    showResultsScreen(content);
  }
}

function showWelcomeScreen(container) {
  container.innerHTML = `
    <div style="text-align:center">
      <div style="width:80px;height:80px;border-radius:50%;background:rgba(15,76,92,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 24px">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      </div>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 10px;line-height:1.2;color:var(--text)">
        ${ONBOARDING_CONFIG.welcome.title}
      </h1>
      <p style="color:var(--text2);font-size:13px;margin:0 0 32px;line-height:1.7">
        ${ONBOARDING_CONFIG.welcome.description}
      </p>
      <button onclick="onboardingNextScreen()" style="width:100%;background:var(--blue);color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        Commencer
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>
  `;
}

function showQuestionScreen(container, qIndex) {
  const q = ONBOARDING_CONFIG.questions[qIndex];

  container.innerHTML = `
    <div>
      <div style="display:flex;gap:6px;margin-bottom:28px">
        ${[0,1,2].map(i => `<div style="flex:1;height:3px;border-radius:2px;background:${i <= qIndex ? 'var(--blue)' : 'rgba(0,0,0,.1)'}"></div>`).join('')}
      </div>
      <h2 style="font-size:17px;font-weight:800;margin:0 0 18px;line-height:1.35;color:var(--text)">
        ${q.title}
      </h2>
      <div style="display:flex;flex-direction:column;gap:8px" id="question-options"></div>
      ${qIndex > 0 ? `<div style="text-align:center;margin-top:16px"><button onclick="onboardingPrevScreen()" style="background:none;border:none;color:var(--text2);font-size:13px;cursor:pointer;padding:4px 8px">← Retour</button></div>` : ''}
    </div>
  `;

  const optionsContainer = document.getElementById('question-options');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      padding: 13px 16px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all .15s;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: space-between;
      -webkit-tap-highlight-color: transparent;
      width: 100%;
    `;
    btn.innerHTML = `<span>${opt.label}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.3;flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>`;
    btn.onclick = () => {
      onboardingState.answers[q.id] = opt.value;
      onboardingState.scores[q.id] = opt.score;
      onboardingNextScreen();
    };
    btn.onmouseover = () => {
      btn.style.borderColor = 'var(--blue)';
      btn.style.background = 'rgba(15,76,92,.04)';
      btn.querySelector('svg').style.opacity = '1';
    };
    btn.onmouseout = () => {
      btn.style.borderColor = 'var(--border)';
      btn.style.background = 'var(--bg)';
      btn.querySelector('svg').style.opacity = '.3';
    };
    optionsContainer.appendChild(btn);
  });
}

function showResultsScreen(container) {
  const presets = calculatePresets();

  container.innerHTML = `
    <div style="text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(76,160,100,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:var(--text)">Votre profil</h1>
      <p style="color:var(--blue);font-size:13px;font-weight:700;margin:0 0 24px;letter-spacing:.3px">${presets.label} · ${presets.profile}</p>

      <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:12px">Tempos recommandés</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div style="background:var(--bg);border-radius:8px;padding:10px 6px;text-align:center">
            <div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px">Lent</div>
            <div style="font-size:18px;font-weight:800;color:var(--text)">${presets.tempoPresets.lent}</div>
            <div style="font-size:10px;color:var(--text3)">BPM</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:10px 6px;text-align:center">
            <div style="font-size:10px;color:var(--text2);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px">Cool</div>
            <div style="font-size:18px;font-weight:800;color:var(--text)">${presets.tempoPresets.cool}</div>
            <div style="font-size:10px;color:var(--text3)">BPM</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:10px 6px;text-align:center">
            <div style="font-size:10px;color:var(--orange);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px">Chaud</div>
            <div style="font-size:18px;font-weight:800;color:var(--orange)">${presets.tempoPresets.chaud}</div>
            <div style="font-size:10px;color:var(--text3)">BPM</div>
          </div>
        </div>
      </div>

      <p style="font-size:12px;color:var(--text2);margin:0 0 20px;line-height:1.6;display:flex;align-items:flex-start;gap:6px;text-align:left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Modifiables à tout moment dans <strong>Réglages → Tempo</strong>
      </p>

      <button onclick="onboardingComplete('${presets.label}')" style="width:100%;background:var(--blue);color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s" onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        C'est parti !
      </button>
    </div>
  `;
}

function onboardingNextScreen() {
  onboardingState.screen++;
  showOnboardingScreen();
}

function onboardingPrevScreen() {
  if (onboardingState.screen > 0) {
    onboardingState.screen--;
    showOnboardingScreen();
  }
}

function onboardingComplete(levelLabel) {
  const presets = calculatePresets();
  applyOnboardingSettings(presets);
  markOnboardingComplete(levelLabel);

  const modal = document.getElementById('onboarding-modal');
  if (modal) modal.remove();

  // Toast de confirmation
  showOnboardingToast(`${levelLabel} configuré — App prête à l'emploi.`);
}

function showOnboardingToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--green);
    color: #fff;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    z-index: 10001;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    animation: fadeInOut 2s ease-in-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Appeler au démarrage (dans index.html)
// showOnboarding();
