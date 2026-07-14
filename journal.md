# Journal de développement — Dico Pattern

---

## Session du 14 juillet 2026

### Mode Guidé — progression par niveaux débloquables (Patterns)

**Fichiers modifiés :** `data.js`, `state.js`, `render.js`, `index.html`

Ajout d'un mode Guidé (actif par défaut) qui structure l'onglet Patterns en 7 niveaux à débloquer successivement, pensé pour les premières heures d'utilisation.

- `data.js` : `PATTERN_LEVEL_GROUPS` (liste des groupes par niveau, définie par l'utilisateur) et `PATTERN_LEVEL_ORDER` (index de tri dérivé).
- `state.js` : `getUnlockedLevel()` / `isLevelUnlocked(n)` / `isLevelComplete(n)` / `isAllLevelsComplete()` — un niveau se débloque quand tous ses groupes sont à 100% (`getGroupPct`).
- `render.js` : le tri "Progressif" suit cet ordre personnalisé, avec un en-tête "Niveau X" entre chaque groupe. Les niveaux non débloqués affichent une carte verrouillée (icône cadenas SVG maison, `lockIconSVG()`) au lieu du détail. Bordure de carte colorée par niveau (vert 1-2, orange 3-5, rouge 6-7).
- Tri "Favoris" reste utilisable même en mode Guidé (utile le temps de la progression) ; "Alphabétique" et "Aléatoire" restent verrouillés sur Progressif.
- Toggle "Guidé / Complet" dans Réglages → Affichage (`SETTINGS.guidedMode`, défaut `true`), rendu en bouton segmenté gris/rouge.

---

### Popups de récompense par niveau + déblocages progressifs

**Fichiers modifiés :** `index.html`, `state.js`

Chaque niveau terminé à 100% déclenche un popup de félicitations qui débloque automatiquement un outil de l'app (déclenchés depuis `toggleParcoursCell`) :

| Niveau | Récompense | Réglage activé |
|---|---|---|
| 1 | Mode Entraînement | `SETTINGS.showTrain` |
| 2 | Labo (Shaker) | `isLaboUnlocked()`, `updateLaboNavVisibility()` masque/affiche l'onglet nav |
| 3 | Mid/High manche | `SETTINGS.showNeckBtn` |
| 4 | Groupe de cordes | `SETTINGS.showStringBtn` |
| 5 | Loop étendu | `SETTINGS.showLoopExtBtn` |
| 6 | Shuffle (précise que sa progression est indépendante, repart de 0%) | `SETTINGS.showShuffleBtn` |
| 7 | Mode Pro (bascule automatique) | `SETTINGS.lightMode = false` |

Le Labo reste accessible en permanence dès qu'on passe en mode Pro, même en revenant au niveau 1 (`isLaboUnlocked()` tient aussi compte de `!SETTINGS.lightMode`).

Outil de debug associé : 5 à 11 taps rapides sur le logo du header remplissent la progression jusqu'au niveau correspondant (5 = Niveau 1 … 11 = Niveau 7), en laissant volontairement une case à cocher pour déclencher la récompense en conditions réelles (`debugFillToLevel(n)`).

---

### Bugfix — Shuffle du Labo qui cassait la progression Patterns

**Fichiers modifiés :** `shaker.js`

Charger un preset Labo marqué "shuffle" faisait basculer le flag global `SETTINGS.shuffleMode` — qui pilote aussi le suffixe de clé `__sh` de toute la progression Patterns (`getProgressKey`). Résultat : la progression et le déblocage du Labo semblaient réinitialisés tant que le Shuffle restait actif.

**Fix :** nouveau flag local `skPresetShuffle`, entièrement découplé de `SETTINGS.shuffleMode`, utilisé uniquement pour le nudge rythmique et le tag du journal du Labo. Réinitialisé dans `skClearAll()`.

---

### Progression % Lite-aware

**Fichiers modifiés :** `state.js`, `render.js`

`getGroupPct`, `getPatternPct` et `renderGlobalProgress` comptent désormais uniquement les combinaisons formes/versions/interprétations effectivement visibles selon le mode Lite ou Pro actif (via `getLightModeFormeTabs`/`getLightModeVersionTabs`/`getLightModeInterps`), au lieu de compter systématiquement contre le total complet. Un niveau rempli à 100% en Lite affiche bien 100%, et remonte naturellement en repassant en Pro.

---

### Onboarding — refonte de l'accueil

**Fichiers modifiés :** `onboarding.js`, `index.html`

- À la fin du questionnaire (`onboardingComplete()`), l'app atterrit directement sur l'onglet Patterns (au lieu d'un Journal vide) et affiche le popup de bienvenue Patterns.
- Le fond derrière le questionnaire d'onboarding est un aplat couleur header (`var(--header-bg)`) au lieu du contenu applicatif flouté — crée une vraie rupture visuelle à l'arrivée sur Patterns.
- Mode Entraînement calé automatiquement sur les tempos choisis à l'onboarding : `trainBpmStart` = tempo Lent, `trainBpmMax` = tempo Chaud (pas et fréquence d'incrément inchangés : +5 BPM / boucle).
- Nouveau texte d'accueil : *"Ton échauffement quotidien pour progresser à la guitare."*
- Toutes les questions du questionnaire passées en tutoiement (joues-tu / pratiques-tu / t'inspire / ton style / ton profil).
- Toast vert de fin d'onboarding supprimé (jugé polluant visuellement, sans information utile).

---

### Divers

**Fichiers modifiés :** `render.js`

L'onglet Journal s'ouvre désormais par défaut sur "Progression" plutôt que "Historique" (`journalSubTab` initialisé à `'stats'`).

---

## Session du 18 juin 2026

### Taille réglable des tablatures

**Fichiers modifiés :** `state.js`, `index.html`, `render.js`, `version.json`

Ajout d'un sélecteur de taille pour les tablatures ASCII dans **Réglages > Affichage** avec 4 options : S (11px), M (13px, défaut), L (16px), XL (20px). Particulièrement utile pour la lisibilité sur tablette.

**Implémentation :**
- `state.js` : ajout de `tabSize: 13` à SETTINGS, chargement/sauvegarde dans localStorage
- CSS : `.tab-wrap pre` utilise `font-size: var(--tab-size, 13px)`
- `index.html` : sélecteur 4 boutons avec preview visuel (chaque label affiché dans sa taille)
- `render.js` : suppression du `style="font-size:12px"` inline sur les `<pre>` pour laisser la variable CSS s'appliquer
- Fonctions `setTabSize()` et `applyTabSize()` pour live refresh

---

### Onglet Challenge au filtrage + Suppression de la carte Challenge du jour

**Fichiers modifiés :** `render.js`, `version.json`

Déplacement du "Challenge du jour" hors de la vue par défaut en l'intégrant au système de filtrage par difficulté. Maintenant : Tous → Basique → Technique → Complexe → **Challenge**.

**Logique :**
- Quand l'utilisateur clique sur "Challenge", affiche 2 patterns aléatoires avec progression < 40%
- Encourage la pratique ciblée sur les patterns moins maîtrisés
- Le challenge n'apparaît que si l'utilisateur le demande explicitement
- La carte "Challenge du jour" qui s'affichait en haut des patterns a été supprimée de l'interface

---

### Masquage du tri par catégorie

**Fichiers modifiés :** `render.js`

Le tri par catégorie (Tous, A2, A3, A4…) est masqué avec `display:none` pour nettoyer l'interface, mais reste fonctionnel en code pour réactivation future.

---

## Session du 10 juin 2026

### Patterns rythmiques : moteur, accord, flèches, bends, phrase

**Fichiers modifiés :** `data.js`, `audio.js`, `render.js`, `index.html`

---

#### 1 — Patterns `rhythmic-test` et `rhythmic-2` : accord sur le premier temps

Les deux patterns rythmiques ont un accord (0 sur E + 2 sur A) sur le tout premier temps.  
Quand on change la corde de référence via le sélecteur, l'accord se transpose en bloc.

**Données (`data.js`) :**
```
A|2-----------------------------------------------|
E|0-----0--0--0-----...|
```
- `rhythmic-test` : croches + doubles croches, resolution=3
- `rhythmic-2` : croche+2doubles / 2croches / 2croches / 4doubles, resolution=3

**Transposition de l'accord (`transposeShiftTab`) :**  
Nouvelle fonction dans `index.html` et `audio.js`. Contrairement à `transposeSingleStringTab` (qui déplace une seule corde), `transposeShiftTab` décale **toutes les lignes ensemble** d'un nombre de positions — l'accord reste intact.  
Activé par le flag `stringShift: true` sur le pattern.

```javascript
// Flag sur le pattern :
stringSelector: true,
stringShift: true,
```

Si E sélectionné → 0 sur E, 2 sur A  
Si A sélectionné → 0 sur A, 2 sur D  
Si D sélectionné → 0 sur D, 2 sur G  
...etc.

---

#### 2 — Flèches de picking pour les patterns rythmiques (résolution positionnelle)

**Problème initial :** les flèches alternaient note par note (comptage séquentiel), sans tenir compte de la position réelle dans la mesure.

**Solution :** dans `tabWithSymbols`, quand `opts.rhythmicResolution` est défini, on calcule la direction à partir de la **position colonne** :

```javascript
const sixteenthIdx = Math.floor(col / rhythmicRes);
// Down : pair → ↓, impair → ↑
// Up   : pair → ↑, impair → ↓
```

Pour `rhythmic-2` (resolution=3), le résultat corrigé (version D) est :
```
   D     D  U  D     D     D     D     D  U  D  U
E |0-----0--0--0-----0-----0-----0-----0--0--0--0--|
```

---

#### 3 — Silence initial et synchronisation métronome

**Problème :** si la première note n'est pas à col 0, le parser ignorait le silence de tête → le métronome démarrait en même temps que la première note, sans laisser entendre le 1er temps seul.

**Solution dans `parseSectionWithDurations` (`audio.js`) :**

```javascript
// Après le groupage, insérer un silence si la première note n'est pas à col 0 :
if (grouped.length > 0 && notes.length > 0 && notes[0].col > 0) {
  grouped.unshift({ notes: [], isAttack: false, duration: notes[0].col, bendTargets: {} });
}
```

`scheduleCycle` itère l'entrée vide (aucune note jouée, `currentTime` avance quand même).  
`_rhythmicLoopDuration` inclut le silence → durée de boucle = mesure complète.

**Fix curseur associé :** `_rhythmicCumulativeTimes` n'enregistre que les entrées avec des notes réelles (`item.notes.length > 0`), sinon l'index du curseur était décalé d'une position.

---

#### 4 — Simulation de bends dans le parser audio

**Notation tab :**

| Symbole | Effet | Description |
|---------|-------|-------------|
| `14b`   | ↑ fret 14 → 16 | Bend plein ton (+ 2 demi-tons) |
| `14b16` | ↑ fret 14 → 16 | Bend vers fret cible explicite |
| `14r`   | ↓ fret 16 → 14 | Pré-bend release (attaque pré-bendée, redescend) |

**Implémentation (`extractLineNotes`, `audio.js`) :**

```javascript
// Bend montant : 14b → attaque à 14, glisse vers 14+2=16
if (content[i] === 'b') {
  // targetFret = digits suivants ou startFret + 2
  bendTarget = baseMidi + targetFret;
}
// Pré-bend release : 14r → attaque à 14+2=16, glisse vers 14
else if (content[i] === 'r') {
  bendTarget = baseMidi + playFret;   // cible = note écrite
  playFret   = playFret + 2;          // départ = pré-bendé
}
noteEntry.bendTarget = bendTarget;
```

**Simulation oscillateur (`pluckNote`, `audio.js`) :**

```javascript
function pluckNote(ctx, masterGain, freq, time, gainMult, freqEnd, bendDur)
```

Si `freqEnd` est fourni, les oscillateurs reçoivent une rampe de fréquence :

```javascript
osc.frequency.setValueAtTime(freq, time);
osc.frequency.exponentialRampToValueAtTime(freqEnd, time + bendDur);
```

Tous les sons sont couverts : piano (5 harmoniques, chacune rampée proportionnellement), guitare (sawtooth), doux (triangle + sine octave).

**Durée de bend (`scheduleCycle`) :**

```javascript
const isRelease = freq440(midi) > freqEnd;  // descend = release
const bendDur   = isRelease
  ? noteDur                              // release : durée pleine de la note
  : Math.min(noteDur * 0.5, 0.25);      // bend montant : rapide
```

---

#### 5 — Pattern `test-phrase1` : phrase blues avec bends et timing syncopé

**Référence :** capture d'écran partition + fichier `Phrase#1.txt`  
**Cordes :** B et e (frets 12–14)  
**Caractéristiques :**
- `rhythmicTiming: true`, `rhythmicResolution: 2` (2 chars = 1 double-croche)
- `disableHighNeck: true` (empêche la transposition +12 pour les frets 12-14)
- `rhythmicBeatPicking: true` (flèches temps/contre-temps, voir §6)

**Tab final :**
```
e|------------14------------------|
B|----14b---------14r-----12------|
```

**Rythmique (4/4 commun) :**

| Temps | Événement | Valeur | Col |
|-------|-----------|--------|-----|
| 1 (silence) | — | croche | 0 |
| "et" du 1 | B `14b` | **croche** (pickup) | 4 |
| 2 | e `14` | **noire** | 12 |
| 3 | B `14r` | **noire** | 16 |
| 4 | B `12` | **noire** | 24 |

Le temps 1 sonne le clic seul → phrase "en contre-temps" typique du blues-rock.

**Audio :**
- `14b` : B fret 14 (Si) glisse vers fret 16 (Ré#) en ~0.25s (bend rapide)
- `14r` : attaque à fret 16 (Ré#), redescend vers fret 14 (Si) sur toute la durée de la noire (~0.75s à 80 BPM)
- e `14` et B `12` : notes normales sans effet

---

#### 6 — Flag `rhythmicBeatPicking` : picking temps/contre-temps

**Contexte :** la logique par défaut (alternance par double-croche) est correcte pour `rhythmic-2` mais incorrecte pour `test-phrase1` où les 4 notes tombent toutes sur des doubles-croches paires.

**Nouvelle propriété pattern :**
```javascript
rhythmicBeatPicking: true
```

**Logique dans `tabWithSymbols` (`audio.js`) :**
```javascript
const onBeat = (sixteenthIdx % 4) < 2;
if (interp === 'Down') s = onBeat ? '↓' : '↑';
if (interp === 'Up')   s = onBeat ? '↑' : '↓';
```

**Résultat pour `test-phrase1` :**

| Note | 16ème | On beat ? | Down | Up |
|------|-------|-----------|------|----|
| B `14b` col 4 | 2 | ✗ contre-temps | ↑ | ↓ |
| e `14` col 12 | 6 | ✗ contre-temps | ↑ | ↓ |
| B `14r` col 16 | 8 | ✓ temps 3 | ↓ | ↑ |
| B `12` col 24 | 12 | ✓ temps 4 | ↓ | ↑ |

`rhythmic-test` et `rhythmic-2` : flag absent → logique par double-croche inchangée.

---

## Session du 3 juin 2026

### Simplification UI : Suppression des doigtés et notes directes + défaut Down

**Fichiers modifiés:** `render.js`, `index.html`, `state.js`, `audio.js`  
**Versions:** v25 → v27 | v1.1.0 → v1.1.2

#### Étape 1 — Suppression des doigtés
- ❌ Supprimé accordéons de doigtés ("Pimenter")
- ❌ Supprimé système `pimtDone` (doigtés complétés)
- ❌ Supprimé fonction `togglePimtDone()`
- ✅ Conservé section "Notes" sous le tableau de progression
- Données `fingerings[]` laissées dans `data.js` pour réouverture future

#### Étape 2 — Notes directement accessibles
- ❌ Supprimé accordéon "Notes" (drawer)
- ✅ Affichage direct textarea sans avoir à ouvrir d'accordéon
- ✅ Textarea visible immédiatement après le tableau de progression

#### Étape 3 — Interprétation par défaut (Pick Down)
- **Avant :** `interp: 'Up'` (Pick Up/Montée)
- **Après :** `interp: 'Down'` (Pick Down/Descente)
- Changement : ligne 116 de `audio.js`, objet PREVIEW

#### Étape 4 — Correction d'accord G-B (Son + Affichage)
**Fichiers:** `audio.js` (parsing + affichage) + `render.js`

**Problème :** Intervalle G-B = 4 demi-tons (au lieu de 5 comme autres cordes)
- Avant : B frette 2 + G frette 0 = dissonant
- Après : B frette 3 + G frette 0 = consonant

**Solution duale :**

1. **Audio (parseSection)** — Quand B et G jouent à la même colonne → +1 demi-ton à B
   - Appliquée dans 3 fonctions : `parseSection()`, `parseSectionWithDurations()`, `parseSectionSpecial()`

2. **Affichage (render.js)** — Nouvelle fonction `applyGBDisplayCorrection()`
   - Corrige l'affichage du tableau : B frette 2 → frette 3 visuellement
   - **FIX :** Appliquée AVANT le filtrage/transposition des cordes
   - Garantit que la correction s'applique même si G n'est pas affiché à l'écran

- ✅ Version v29 → v30 | v1.1.4 → v1.1.5

---

## Session du 16 juin 2026 (suite)

### Symboles musicaux pour les subdivisions rythmiques

**Fichiers modifiés :** `audio.js`, `index.html`, `version.json`

Remplacement des labels textuels ("8", "3:8", "16", "6:16") par des symboles musicaux SVG dans le bouton de cycle des subdivisions du header.

**Implémentation :**
- `audio.js` : nouvelle fonction `getSubdivSVG(n)` qui génère des SVG pour chaque subdivision
  - Croche (2) : 1 queue
  - Triolet (3) : 1 queue + marquage "3"
  - Double croche (4) : 2 queues
  - Sextolet (6) : 2 queues + marquage "6"
- Mise à jour de `syncSubdivUI()` pour utiliser `innerHTML = getSubdivSVG(n)` au lieu de `textContent = label`
- Les couleurs des symboles changent selon la subdivision active (couleur du fond du bouton)

---

## Session du 16 juin 2026

### Classification des difficultés — Renaming inclusif

**Fichiers modifiés :** `data.js`, `render.js`, `index.html`, `version.json`

Renommage complet des niveaux de difficulté pour une meilleure inclusivité et encouragement à l'exploration :
- `Débutant` → `Basique`
- `Intermédiaire` → `Technique`
- `Avancé` → `Complexe`

L'objectif était d'éviter que le vocabulaire "Débutant/Avancé" décourage les utilisateurs de découvrir des exercices — un débutant peut très bien travailler un exercice "Complexe" qui l'intéresse, et le nouveau vocabulaire décrit l'exercice plutôt que le niveau de l'utilisateur.

**Changements :**
- `data.js` : 182 patterns mis à jour (39 Basique, 121 Technique, 22 Complexe)
- `render.js` : fonction `diffTag()`, objets `diffDot` et `diffColors`, tableau `diffs` mis à jour
- Couleurs préservées : Basique (vert #4a9e6b), Technique (orange #c07830), Complexe (rouge #a03030)

---

### Gammes pentatonic — Distinction visuelle

**Fichiers modifiés :** `render.js`, `index.html`, `version.json`

Ajout d'une bordure gauche bleue clair sur les cartes des gammes pentatonic pour les repérer facilement dans la section Gammes.

**Implémentation :**
- `render.js` : détection automatique des pentatonic via `base.id.startsWith('penta')`, ajout de la classe `card-penta`
- CSS : `.card.card-penta` utilise une bordure gauche `4px solid var(--blue-light)` qui fonctionne en light et dark mode
- S'applique à tous les patterns dont l'ID commence par "penta" (pentaC1-5, pentaTrans1-5, etc.)

---

## Session du 13 juin 2026

### Nouvelles données : arpège Em et famille complète B8P1/B8P2 (a/b/c/d)

**Fichier modifié :** `data.js`

---

#### 1 — Pattern `arpegeEm1` : arpège Mi mineur avec balayage

Nouveau pattern `cat:"gamme"` avec trois spécificités techniques cumulées :

- `special: true` — lecture note par note séquentielle (pas de grouping par colonne)
- `disableHighNeck: true` — interdit la transposition +12 cases
- `customInterps: ["Down", "Up", "Sweep"]` — troisième interprétation "Sweep" en plus des deux habituelles

**Format Sweep :**  
Une ligne d'en-tête au-dessus de la tablature indique le coup de médiator pour chaque note :
- `n` = coup vers le bas ↓ (picking)
- `V` = coup vers le haut ↑ (picking)
- espace = liaison (hammer-on ou pull-off, pas de médiator)

Reconnue par le parser via `/^\s*[nV\s]+$/.test(l) && /[nV]/.test(l)`.  
Le motif monte de E|7 (Si) jusqu'à e|12 (Mi) en 6 coups ↓ balayés, puis redescend jusqu'à E|3 (Sol) en 6 coups ↑.

---

#### 2 — Réorganisation B8 : renommages

Pour rétablir la numérotation logique :
- `B8P1b` (ancienne alternance) → renommé `B8P2b`
- `B8P2a` → renommé `B8P3a`
- Nouveau `B8P1b` créé (voir §3)

---

#### 3 — Nouveau `B8P1b` (U/D/M) : index + annulaire, montée corde inférieure

Source : `B8P1(2)b.txt` (tabMid) + `B8P1(2)b High.txt` (tabHigh)  
Frets mid-neck : aller 5-7, retour 6-8 (`↩ retour +1`)  
Frets high-neck : aller 12-14, retour 13-15  
Difficulté : Intermédiaire

---

#### 4 — Famille complète B8P1 et B8P2 : variantes a / b / c / d

Chaque variante est dérivée de la précédente par substitution systématique des numéros de case. Règle anti-double-substitution : remplacer les nombres dans l'ordre décroissant.

| Variante | Doigts | Frets aller (mid) | Frets retour (mid) | Dérivée de |
|----------|--------|-------------------|--------------------|------------|
| **a** | ind + maj | 5–6 | 6–7 | b : 7→6, 8→7 |
| **b** | ind + ann | 5–7 | 6–8 | (source) |
| **c** | ind + aur | 5–8 | 6–9 | b : 7→8, 8→9 |
| **d** | ind + aur (ext.) | 4–8 | 5–9 | c : 5→4, 6→5 |

High-neck : même écart (+7 cases), même logique de substitution.

Patterns créés : `B8P1a`, `B8P2a`, `B8P1c`, `B8P2c`, `B8P1d`, `B8P2d` — chacun en 3 directions (U/D/M), soit **18 patterns ajoutés** au total.

**Ordre dans `data.js` :** B8P2a → B8P2b → B8P2c → B8P2d → B8P1a → B8P1b → B8P1c → B8P1d → B8P3a

---

### Dark Mode doux — refonte complète de la palette

**Fichiers modifiés :** `index.html`, `version.json`

Refonte du dark mode pour qu'il assombrisse uniquement les fonds sans toucher aux couleurs d'accent (bleu, vert, rouge, orange). L'objectif était d'éviter l'effet "inversé" de l'ancienne palette qui agressait les yeux.

**Nouvelle palette dark mode (`html.dark-mode` + `prefers-color-scheme: dark`) :**

| Variable | Avant | Après |
|---|---|---|
| `--bg` | `#0f1419` (bleu nuit) | `#1E1E1E` (gris neutre) |
| `--card` | `#1a2229` | `#2A2A2A` |
| `--text` | `#e8e6e1` | `#F0EDE8` |
| `--text2` | `#a8a09a` | `#A8A29C` |
| `--border` | `#2a3239` | `#3C3C3C` |
| `--header-bg` | `#0a0e13` | `#1F2D33` (identique au light mode) |
| `--blue` | `#4dd0e1` (cyan) | `#0F4C5C` (**inchangé**) |
| `--green` | `#7ec96f` | `#56864A` (**inchangé**) |
| `--red` | `#e07070` | `#B0413E` (**inchangé**) |
| `--orange` | `#ff9966` | `#D4622E` (**inchangé**) |

**Éléments codés en dur corrigés (passage de `#fff` à `var(--card)`) :**
- Barre de navigation (`nav`)
- Sélecteur de pattern (`.pat-selector`)
- Boutons de doigté (`.fing-row button`)
- Boutons +/− et champ BPM métronome (`.metro-adj`, `.metro-bpm`)
- Modal des réglages et ses onglets (`.settings-modal`, `.seg button`)

---

### Couleur des tablatures ASCII — sélecteur dans les réglages

**Fichiers modifiés :** `index.html`, `state.js`, `version.json`

Ajout d'un sélecteur de couleur pour les tablatures ASCII dans **Réglages > Affichage**, avec live refresh (les tablatures changent instantanément sans rechargement de page).

**Choix disponibles :** Blanc (`#fff`), Vert (`#a8d8a8`), Cyan (`#4dd0e1`), Orange (`#ff9966`), Gris (`#d0d0d0`)

**Implémentation :**
- `state.js` : ajout de `tabColor: '#fff'` dans `SETTINGS`, chargement/sauvegarde dans `localStorage`
- CSS : `.tab-wrap pre` passe de `color:#fff` à `color:var(--tab-color, #fff)`
- `setTabColor(color)` : met à jour `--tab-color` via `document.documentElement.style.setProperty('--tab-color', color)` — garanti sur tous les éléments y compris ceux re-rendus après le choix
- `applyTabColor()` : appelée au boot pour restaurer la couleur sauvegardée
- La variable CSS sur `<html>` évite le problème des éléments re-rendus par `render()` qui ne recevaient pas le style inline

---

### Dark Mode — correction des éléments blancs résiduels

**Fichiers modifiés :** `index.html`, `render.js`, `version.json`

Après la refonte, plusieurs éléments restaient trop clairs en dark mode :

- **Cellules tempo du tableau de progressions** (`.prog-grid td.tempo`) : `background:#fafafa` → `var(--bg)`
- **Hover des lignes du tableau** (`.prog-grid tr:hover td`) : `background:#f9f8f5` → `var(--border)`
- **Cases à cocher** (`.cell-btn`) : `background:#fff; border:#ddd` → `var(--card); var(--border)`
- **Hover des cases non cochées** : `background:#f5f5f5` → `var(--bg)`
- **Notes personnelles** (`textarea` dans `render.js`, 2 occurrences) : `background:#fafaf8` → `var(--card)`

---

## Session du 1er juin 2026

### Réorganisation des exercices Gammes
**Fichier:** `data.js` + `render.js`

- Réordonné : Pentatonic 1-5 → Transitions 6-10 → A Ionien 11
- Mise à jour numéros `num` dans chaque entrée
- Changé tri en numérique (lieu de lexicographique)

### Configuration par défaut du header
**Fichier:** `state.js`

Affichage minimaliste par défaut :
- ✅ Décompte + Clic métronome + BPM 60
- ❌ Autres options masquées (utilisateur peut les activer via Réglages)

### Notations rythmiques — Cohérence anglo-saxonne
**Fichiers:** `index.html`, `audio.js`

- 8 = Croche (8th note)
- 3:8 = Triolet (triplet)
- 16 = Double croche (16th note)
- 6:16 = Sextolet (sextuplet)

Couleurs distinctes appliquées partout.

### Système de mise à jour PWA + Onboarding
**Fichiers:** `version.json`, `index.html`, `sw.js`, `onboarding.js`

**PWA Versioning:**
- Fichier `version.json` source de vérité
- App vérifie automatiquement → mise à jour sans action utilisateur

**Onboarding adaptatif:**
- Questionnaire 3 questions : années, heures/semaine, profil guitariste
- Presets calculés et affichés
- Sauvegardé (une seule affichage)

