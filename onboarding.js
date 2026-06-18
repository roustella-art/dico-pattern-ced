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
        { value: 'cobain', label: "🎸 Kurt Cobain (Grunge/Alt-rock)", score: 1 },
        { value: 'page', label: "🔵 Jimmy Page (Blues-rock)", score: 2 },
        { value: 'django', label: "🎶 Django Reinhardt (Jazz/Swing)", score: 2 },
        { value: 'malmsteen', label: "⚡ Yngwie Malmsteen (Neoclassical metal)", score: 4 },
        { value: 'none', label: "❓ Je n'en connais aucun", score: 1 },
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
      tempoMultiplier: 1.1, // Tempos plus rapides
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
      tempoMultiplier: 1.0,
      subdivMultiplier: 1.0,
    },
  },

  // Presets de base (avant ajustements)
  basePresets: {
    0: { // Score 0-1 (très débutant)
      tempoPresets: { lent: 40, cool: 60, chaud: 80 },
      clickSubdiv: 2, // 8 (croches)
      label: 'Débutant 🌱',
    },
    1: { // Score 2-3 (débutant/intermédiaire)
      tempoPresets: { lent: 50, cool: 70, chaud: 90 },
      clickSubdiv: 2, // 8
      label: 'Débutant+ 🌿',
    },
    2: { // Score 4-5 (intermédiaire)
      tempoPresets: { lent: 60, cool: 80, chaud: 100 },
      clickSubdiv: 4, // 16 (doubles croches)
      label: 'Intermédiaire ⚡',
    },
    3: { // Score 6-7 (intermédiaire+)
      tempoPresets: { lent: 70, cool: 90, chaud: 110 },
      clickSubdiv: 4, // 16
      label: 'Intermédiaire+ 🔥',
    },
    4: { // Score 8-9 (avancé)
      tempoPresets: { lent: 80, cool: 100, chaud: 120 },
      clickSubdiv: 6, // 6:16 (sextolets)
      label: 'Avancé 🔥',
    },
    5: { // Score 10+ (virtuose)
      tempoPresets: { lent: 100, cool: 120, chaud: 150 },
      clickSubdiv: 6, // 6:16
      label: 'Virtuose 🚀',
    },
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

  // Score total (0-10)
  const totalScore = Math.min(10, (yearScore + hoursScore + profileScore) / 3 * 2);

  // Déterminer le preset de base
  const basePreset = ONBOARDING_CONFIG.basePresets[Math.floor(totalScore / 2)];

  // Appliquer les ajustements du profil
  const adjustedTempos = {
    lent: Math.round(basePreset.tempoPresets.lent * profileData.tempoMultiplier),
    cool: Math.round(basePreset.tempoPresets.cool * profileData.tempoMultiplier),
    chaud: Math.round(basePreset.tempoPresets.chaud * profileData.tempoMultiplier),
  };

  // Pour la subdivision, c'est plus discret (rester dans les valeurs valides: 2, 3, 4, 6)
  let subdivAdjusted = basePreset.clickSubdiv;
  if (profileData.subdivMultiplier > 1.1 && basePreset.clickSubdiv === 4) {
    subdivAdjusted = 6; // Passer à sextolets pour Malmsteen
  } else if (profileData.subdivMultiplier > 1.0 && basePreset.clickSubdiv === 2) {
    subdivAdjusted = 4; // Passer à doubles croches
  }

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
    border-radius: 16px;
    padding: 32px 24px;
    max-width: 420px;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
    color: var(--text);
    animation: fadeIn .3s ease;
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
    <div style="text-align: center">
      <div style="font-size: 56px; margin-bottom: 16px">${ONBOARDING_CONFIG.welcome.emoji}</div>
      <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 12px; line-height: 1.2">
        ${ONBOARDING_CONFIG.welcome.title}
      </h1>
      <p style="color: var(--text2); font-size: 14px; margin: 0 0 28px; line-height: 1.6">
        ${ONBOARDING_CONFIG.welcome.description}
      </p>
      <button onclick="onboardingNextScreen()" style="
        background: var(--blue);
        color: #fff;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all .2s;
      " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
        Commençons →
      </button>
    </div>
  `;
}

function showQuestionScreen(container, qIndex) {
  const q = ONBOARDING_CONFIG.questions[qIndex];
  const progressPct = ((qIndex + 1) / 3) * 100;

  container.innerHTML = `
    <div>
      <div style="margin-bottom: 20px">
        <div style="font-size: 12px; color: var(--text2); margin-bottom: 8px">
          Question ${qIndex + 1} / 3
        </div>
        <div style="width: 100%; height: 4px; background: rgba(0,0,0,.1); border-radius: 2px; overflow: hidden">
          <div style="width: ${progressPct}%; height: 100%; background: var(--blue); transition: width .3s"></div>
        </div>
      </div>

      <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 20px; line-height: 1.3">
        ${q.title}
      </h2>

      <div style="display: flex; flex-direction: column; gap: 10px" id="question-options">
        <!-- Options générées par JS -->
      </div>

      <div style="margin-top: 20px; display: flex; gap: 10px">
        ${qIndex > 0 ? `<button onclick="onboardingPrevScreen()" style="flex: 1; padding: 10px; border: 1.5px solid var(--border); background: transparent; color: var(--text); border-radius: 8px; cursor: pointer; font-weight: 600">← Précédent</button>` : ''}
      </div>
    </div>
  `;

  const optionsContainer = document.getElementById('question-options');
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.style.cssText = `
      padding: 14px;
      border: 2px solid var(--border);
      border-radius: 10px;
      background: rgba(0,0,0,.02);
      color: var(--text);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all .2s;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
    `;
    btn.textContent = opt.label;
    btn.onclick = () => {
      onboardingState.answers[q.id] = opt.value;
      onboardingState.scores[q.id] = opt.score;
      onboardingNextScreen();
    };
    btn.onmouseover = () => {
      btn.style.borderColor = 'var(--blue)';
      btn.style.background = 'rgba(15,76,92,.05)';
    };
    btn.onmouseout = () => {
      btn.style.borderColor = 'var(--border)';
      btn.style.background = 'rgba(0,0,0,.02)';
    };
    optionsContainer.appendChild(btn);
  });
}

function showResultsScreen(container) {
  const presets = calculatePresets();
  const subdivLabel = SUBDIV_LABEL(presets.clickSubdiv);

  container.innerHTML = `
    <div style="text-align: center">
      <div style="font-size: 48px; margin-bottom: 16px">✨</div>
      <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px">
        Voilà votre profil !
      </h1>
      <p style="color: var(--text2); font-size: 13px; margin: 0 0 24px; line-height: 1.5">
        ${presets.profile} — ${presets.label}
      </p>

      <div style="background: rgba(0,0,0,.05); border-radius: 12px; padding: 18px; margin-bottom: 24px">
        <div style="font-size: 12px; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 12px; font-weight: 600">
          Presets de tempo recommandés
        </div>
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 16px">
          <div style="padding: 8px 12px; background: #fff; border-radius: 6px; font-weight: 700">
            🐢 ${presets.tempoPresets.lent} BPM
          </div>
          <div style="padding: 8px 12px; background: #fff; border-radius: 6px; font-weight: 700">
            🚶 ${presets.tempoPresets.cool} BPM
          </div>
          <div style="padding: 8px 12px; background: #fff; border-radius: 6px; font-weight: 700">
            🔥 ${presets.tempoPresets.chaud} BPM
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text2); text-transform: uppercase; letter-spacing: .4px; margin-bottom: 8px; font-weight: 600">
          Subdivision rythmique
        </div>
        <div style="padding: 10px; background: #fff; border-radius: 6px; font-weight: 700; font-size: 16px">
          ${subdivLabel}
        </div>
      </div>

      <p style="font-size: 12px; color: var(--text2); margin: 0 0 20px; line-height: 1.5">
        💡 Vous pourrez modifier ces réglages à tout moment dans <strong>Réglages → Affichage</strong>
      </p>

      <button onclick="onboardingComplete('${presets.label}')" style="
        background: var(--green);
        color: #fff;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: all .2s;
      " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
        ✅ Commencer !
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
  showOnboardingToast(`✅ ${levelLabel} configuré ! App prête à l'emploi.`);
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
