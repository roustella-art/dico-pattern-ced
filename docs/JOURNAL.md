# Journal — Dico Pattern

Historique narratif du projet, sessions de développement récentes, et changelog des versions.

---

# Partie 1 — Construction du projet

_Avril 2026 · 10 sessions de travail_

---

## L'idée de départ

Tout commence avec une conviction pédagogique simple : les patterns de guitare s'apprennent comme des gammes de sportif. Pas de théorie, pas de notation, juste le geste qui se grave dans les doigts à force de répétition consciente. Il fallait un outil à la hauteur de cette philosophie — épuré, efficace, et pensé pour les élèves de Ced.

Le Dico Pattern est né de là.

---

## Session 1 — Les fondations

On pose les bases de l'architecture. L'app est une **PWA single-file HTML** — pas de framework, pas de dépendances, juste du HTML/CSS/JS pur dans un seul fichier. Ce choix est volontaire : robustesse maximale, déploiement instantané sur GitHub Pages, fonctionne hors-ligne.

Les premiers patterns arrivent : la catégorie **A4** (une corde, 4 doigts). On définit le système de nommage — catégorie + numéro + direction (U/D/M pour Up, Down, Mixte). La grille de progression est créée : **36 cases par pattern** (tempo × interprétation × doigté), sauvegardées en localStorage par appareil.

---

## Session 2 — L'audio et le chronomètre

L'app prend vie sonore. La **preview audio** est entièrement synthétisée via Web Audio API — parsing de la tablature ASCII, lecture en boucle infinie, décompte 4 temps avant le départ. Trois vitesses préréglées (40 / 80 / 120 BPM) plus un champ libre.

Le **chronomètre** fait son entrée dans le header : cadran analogique SVG, anneau 5 minutes, double bip à chaque tour, rouge 5 secondes au bip. L'idée : un minutier de séance, pas un chrono de performance. 5 à 10 minutes par jour, c'est suffisant.

---

## Session 3 — Les doigtés et le schéma de main

Gros chantier : intégrer les **doigtés réels** sur les 63 patterns. Quatre doigtés par pattern (D1 principal + D2/D3/D4 alternatifs), affichés en toutes lettres (Index / Majeur / Annulaire / Auriculaire).

Un **schéma de main SVG** apparaît à côté du doigté D1, avec les doigts utilisés mis en rouge. Les D2–D4 sont repliés dans un accordéon "Aller plus loin" — suggérés sans être imposés.

Leçon technique retenue : ne jamais écrire de scripts Python pour manipuler le JS — travailler directement dans le code.

---

## Session 4 — L'audio peaufiné, le Parcours

Corrections profondes sur l'audio : les nœuds Web Audio s'accumulaient silencieusement en mémoire à chaque boucle. Fix : nettoyage systématique dans `onended`. La dérive de tempo est aussi corrigée.

L'onglet **Parcours** est créé — une progression linéaire guidée par étapes, avec une grille de progression inline par pattern. L'Étape 1 est définie : A4P3, A6P1, A6P2, A4P1, A2P2 dans cet ordre, du plus accessible au plus complexe.

---

## Session 5 — Le design zen

Refonte visuelle complète. On jette les ombres, les dégradés, les couleurs de fond par onglet. L'app adopte un **design zen et épuré** : fond neutre uniforme, cartes blanches, icônes SVG flat dans la navigation, contrôles segmentés. Le principe : l'interface ne doit pas distraire du geste.

Le métronome global est intégré dans le header — il remplace les petits widgets par pattern. Feedback sonore et vibration au cochage des cases. L'app commence à ressembler à quelque chose qu'on a envie d'utiliser.

---

## Session 6 — La vision long terme

Session de recul et de conception. On formalise la **philosophie** : le Dico Pattern est le premier jalon d'un écosystème plus large — Rythme, Accords, Gammes, Harmonie, chacun autonome mais complémentaire. L'harmonie restera séparée du geste pur, toujours.

Le **modèle économique** prend forme : PWA gratuite + méthode imprimée (Amazon KDP). Le podcast À la Loop comme canal d'acquisition naturel. L'app comme outil pro pour les profs et les écoles de musique.

On définit aussi les limites architecturales : ~360 patterns théoriques max, beaucoup moins en pratique — la curation est le vrai garde-fou. Au-delà d'un certain volume, les données patterns iront dans un fichier JSON séparé.

---

## Session 7 — Le bouton Clic et les zones tempo

Ajout du **bouton Clic** — un métronome uniforme qui tourne pendant la preview, dans une boucle indépendante. Leçon importante : chaque feature audio doit avoir son propre timer pour éviter les race conditions Web Audio.

Les zones tempo sont nommées : Lent (40–60) / Cool (70–100) / Chaud (110–130+) / Zen (30–60). Le BPM et l'interprétation se réinitialisent à chaque ouverture de fiche — toujours repartir propre.

---

## Session 8 — La béta prend forme

Création de **index-beta.html** — une app séparée pour le test élèves. localStorage indépendant, Service Worker dédié. Contenu filtré sur l'Étape 1 uniquement (Débutant), navigation simplifiée.

L'onglet Questionnaire apparaît — 9 questions, export WhatsApp. Un onboarding 3 pages avec navigation ←→. Les favoris sont intégrés sur les tuiles de progression.

Le titre devient **"Le Dico Pattern · par Ced"**. Plus de "CedLoop" — juste Ced.

---

## Session 9 — La béta finalisée et envoyée

Session de finition et de lancement. Tout est revu et peaufiné avant l'envoi aux élèves.

**Sur l'app principale :**
L'accordéon **"🌶️ Envie de pimenter le pattern ?"** est ajouté — doigtés alternatifs repliés, en orange, pour les élèves qui veulent aller plus loin quand le doigté principal est ancré.

**Sur la béta :**
- Palette de couleurs **"tasty"** — bleu, vert, rouge, orange vifs sur fond crème. L'app donne envie de cliquer.
- **Code CACTUS** pour déverrouiller le questionnaire après 2 semaines — évite les réponses à chaud.
- Onboarding **4 pages** entièrement refondu : textes personnalisés ("Félicitations, tu as été personnellement sélectionné(e) par Ced, ton prof de guitare"), éléments réels de l'app (chrono SVG à 04:55, barres de progression, bouton Écouter inline), "C'est parti !" accessible sur chaque page.
- Header restructuré : chrono à droite, boutons de contrôle à sa gauche.
- **Questionnaire complet refondu** — 15 questions en 5 sections (Installation / Utilisation / Contenu / Retours / La suite + Section VIP éloges drôles pour le prof).
- **Export par modale** : fini le lien WhatsApp qui ne marchait pas sur Mac. Une fenêtre s'ouvre avec le résumé formaté, un bouton Copier, et les coordonnées de Ced (06 33 10 22 34 / cedrik.musik@gmail.com).

**Le lancement :**
Déployée sur GitHub Pages. SMS d'envoi rédigé — ton canapé vs ta guitare, dimanche soir. Envoyé.

---

## Session 10 — L'interface devient un instrument

Session consacrée à l'ergonomie et à la cohérence visuelle. Le retour terrain est arrivé : un élève confondait le métronome du header avec la preview. Le diagnostic est posé — l'interface doit parler d'elle-même.

**Refonte du header :**
Le header devient un vrai centre de contrôle, épuré et lisible. Le chrono SVG est sorti — trop encombrant, il rejoint l'onglet Progression. À la place : un bandeau compact avec un **bouton ▶/■ contextuel** (métronome solo par défaut, preview dès qu'un pattern est sélectionné), un **affichage BPM en glassmorphism vert** (le même style qu'avant mais assumé), et les boutons Décompte / Clic directement accessibles. Une petite **icône SVG métronome pendule** remplace l'emoji 🥁 — plus flat, plus cohérent. Le **point de bip** est bien là, fidèle au poste.

**Le chrono dans Progression :**
Le chrono numérique `MM:SS` prend sa place en haut de l'onglet Progression — sobre, monospace, toujours visible dès que l'utilisateur consulte sa progression. Il vire au rouge au bip des 5 minutes, puis reprend sa couleur. Le chrono tourne en fond peu importe l'onglet actif.

**Popups de session :**
À 5 minutes, un message d'encouragement apparaît (aléatoire parmi 4). À 10 minutes — et à chaque bip suivant — un rappel philosophique : "Le Dico Pattern se consomme avec modération. 10 min régulières > 1h par mois." L'app ne se contente plus d'être un outil, elle accompagne.

**Onglet Progression en accordéon :**
Les trois sections sont maintenant repliables. **"Progression globale"** reste ouvert par défaut et affiche le pourcentage dans son titre. **"Mes séances"** affiche en titre fermé la série actuelle, le record et le total de jours. **"Détail par pattern"** est replié. L'essentiel est visible d'un coup d'œil, le reste se déplie quand on veut.

**Clic plus fort :**
Le volume du clic métronome pendant la preview est presque triplé (0.10 → 0.28). Il s'entend vraiment maintenant.

**Outillage :**
Premier test du script `deploy.sh` — commit et push vers GitHub Pages en une commande depuis le terminal. Ça marche.

---

## Où en est l'app aujourd'hui (avril 2026)

**App principale** — https://roustella-art.github.io/dico-pattern/
63 patterns, catégories A2/A4/A6/B6, Étape 1 définie, audio complet (doux/piano/guitare), preview avec décompte et clic, réglages (groupe de cordes, son, case de départ), progression par élève, doigtés + schémas de main, accordéon alternatif 🌶️, header épuré, chrono dans Progression, popups de session.

**Béta élèves** — https://roustella-art.github.io/dico-pattern/index-beta.html
Étape 1 uniquement, onboarding personnalisé, questionnaire verrouillé 2 semaines (code CACTUS), export propre par copier-coller. Envoyée le 26 avril 2026.

**Retours attendus** autour du 10 mai 2026. C'est là que le projet entre dans sa deuxième phase.

---

## Session 11 — Le Journal et les Guides d'Étapes

_25 mai 2026_

**Le Journal de pratique :**
Remplace l'onglet "Guide" qui n'affichait que des notes de version — inutile pour l'utilisateur. Le nouveau **Journal enregistre chaque lecture de pattern** automatiquement : date, heure exacte, nom du pattern, BPM utilisé, mode (Libre/Entraînement), mode Shuffle s'il est activé, mode Pyramide s'il est activé.

Structure : groupage par jour en **accordéons fermés par défaut**, sauf le jour courant qui s'ouvre automatiquement. Chaque jour affiche un résumé compact : nombre de patterns lus, tempo moyen, nombre d'entraînements. Le texte reste dans le bon sens — fixe pour un CSS global qui retournait les accordéons.

**Patterns cliquables :** Un clic sur le nom d'un pattern ouvre directement cet pattern dans l'onglet Patterns. Utile pour retravailler rapidement un pattern noté dans le journal.

Persistance : localStorage `dicoPatternJournal`, structure simple `[{timestamp, patId, patName, bpm, trainMode, pyramideMode, shuffleMode}]`.

**Descriptions d'étapes :**
Chaque étape du Parcours a maintenant une **description d'intro en italique** qui s'affiche quand on ouvre l'accordéon, juste avant les patterns. C'est un mini-guide pédagogique qui prépare l'élève à ce qu'il va travailler.

- **Étape 1 "La base"** : Les déliateurs, familiarisation avec l'app, attention au sens du médiator.
- **Étape 2 "L'indépendance"** : Doigtés plus complexes, contrôle qui s'affine, capacité de chaque doigt à agir seul.
- **Étape 3 "L'extension"** : À définir.

Implémentation : objet `etapeDescs` dans `render.js`, rendu comme un bloc semi-transparent foncé avant les patterns.

**Bug corrigé :** Un CSS global (`details[open] summary span:last-child{transform:rotate(180deg)}`) retournait aussi le texte des accordéons du journal. Solution : surcharge CSS ciblée `transform:none!important` pour les spans du journal.

---

## Ce qui vient

- Définir la description de l'Étape 3 "L'extension"
- Analyser les retours élèves et ajuster
- Ajouter de nouveaux patterns à l'app principale
- Construire les catégories B (2 cordes) et C (3 cordes)
- Trancher sur le modèle économique si les retours sont bons
- Et un jour : le livre

---

_"Mouvement d'abord, musique après."_

---

---

# Partie 2 — Sessions de développement récentes

## Session du 3 juin 2026

### Simplification UI : Suppression des doigtés et notes directes — ✅ IMPLÉMENTÉ
**Fichiers modifiés:** `render.js`, `index.html`, `state.js`  
**Versions:** v25 → v26 | v1.1.0 → v1.1.1

**Étape 1 — Suppression des doigtés :**
- Supprimé accordéons de doigtés ("Pimenter")
- Supprimé système `pimtDone` (doigtés complétés)
- Supprimé fonction `togglePimtDone()`
- Conservé section "Notes" sous le tableau de progression

**Étape 2 — Notes directement accessibles :**
- Supprimé accordéon "Notes" (drawer)
- Affichage direct textarea sans avoir à ouvrir d'accordéon
- Textarea visible immédiatement après le tableau de progression
- → **Plus intuitif et fluide**

**Conservation pour réouverture future:**
- Données `fingerings[]` laissées dans `data.js` (inactives)
- Fonctions `expandFingering()` / `reverseFingering()` disponibles dans `audio.js`

---

### Système de mise à jour PWA + Onboarding
**Fichiers:** `version.json`, `index.html`, `sw.js`, `onboarding.js`

**Problème résolu:** Les utilisateurs obtiennent une vieille version cachée quand ils ajoutent la PWA à l'écran d'accueil.

**Solution:** Versioning du cache via `version.json`
- App vérifie `version.json` au chargement et toutes les 5 minutes
- Si version change → efface le cache → force un reload
- Service Worker lit la version et installe le cache approprié
- **Workflow déploiement:** Changer le numéro dans `version.json` → utilisateurs obtiennent la mise à jour automatique

**Onboarding au premier lancement:**
- Questionnaire interactif : Débutant / Intermédiaire / Avancé
- Presets de tempo personnalisés par niveau :
  - **Débutant** : 40/60/80 BPM, subdivision croches (8)
  - **Intermédiaire** : 60/80/100 BPM, subdivision doubles croches (16)
  - **Avancé** : 80/100/120 BPM, subdivision sextolets (6:16)
- Sauvegardé dans localStorage (affichage unique)
- Modal avec animation et feedback utilisateur

---

## Session du 1er juin 2026

### 1. Réorganisation des exercices Gammes
**Fichier:** `data.js`

**Changements:**
- Réordonné les gammes pour une progression pédagogique logique :
  - **Positions 1–5:** Pentatonic #1 à #5 (Débutant)
  - **Positions 6–10:** Pentatonic Transition 1↔2 à 5↔1 (Intermédiaire)
  - **Position 11:** A Ionien (Intermédiaire)
- Mis à jour les numéros `num` dans chaque entrée
- Déplacé physiquement A Ionien après les transitions

**Fichier:** `render.js`
- Changé le tri de `gammeGroups` de lexicographique vers numérique pour affichage correct (10, 11 après 9, non après 1)
- Tri par `parseInt(num, 10)` au lieu de `localeCompare`

---

### 2. Configuration par défaut du header
**Fichier:** `state.js`

**Affichage par défaut (minimaliste):**
```javascript
showCountin: true      // ✅ Afficher décompte
showClick: true        // ✅ Afficher clic métronome
showMetroSolo: false   // ❌ Métronome solo caché
showSubdivBtn: false   // ❌ Bouton ÷N caché
showTrain: false       // ❌ Mode entraînement caché
showNeckBtn: false     // ❌ Mid/High caché
showShuffleBtn: false  // ❌ Shuffle caché
showStringBtn: false   // ❌ Groupe de cordes caché
showHeaderStats: false // ❌ Stats streak caché
```

**BPM initial:** 60 (au lieu de 40)

---

### 3. Notations rythmiques — Cohérence anglo-saxonne
**Fichier:** `index.html`

| Avant | Après | Notation | Couleur |
|-------|-------|----------|---------|
| 2 | **8** | Croche (8th note) | #1a7fa6 (bleu) |
| 3 | **3:8** | Triolet (triplet) | #56864A (vert) |
| ♬ | **16** | Double croche (16th note) | #C8952A (orange) |
| 6 | **6:16** | Sextolet (sextuplet) | #7B5EA7 (violet) |

Couleurs distinctes synchronisées entre header et réglages via `SUBDIV_LABELS` dans `audio.js`.

---

## Session du 16 juin 2026

### Do Majeur — Gamme CAGED complète, 7 formes × 2 versions

**Fichiers :** `data.js`, `render.js`, `index.html`

**Contexte :**
Premier exercice de gamme à couvrir l'intégralité du système CAGED. Contrairement aux gammes pentatoniques (un seul pattern), Do Majeur expose 7 formes distinctes (`C`, `A`, `G`, `G 8va`, `E`, `E 8va`, `D`) chacune en deux versions, soit **14 entrées de tablature** dans un seul pattern.

**Structure des données (`gammeC1`) :**
- `special: true` — lecture note par note (pas de grouping)
- `hasDirectionTabs: true` — active le sélecteur de version/forme
- `disableHighNeck: true` — la gamme en position Bas du manche suffit, le preset High Neck n'a pas de sens ici
- `versionTabs: ["Base", "Full"]` — clés internes des deux versions
- `versionLabels: { Full: "Étendue" }` — "Full" en base de données, "Étendue" dans les boutons
- `formeTabs: ["C", "A", "G", "G 8va", "E", "E 8va", "D"]` — les 7 formes CAGED
- Les 14 directions composées suivent le schéma `"Version|Forme"` : `"Base|C"`, `"Full|C"`, `"Base|A"`, `"Full|A"`, etc.
- Position `num:"0"` — premier exercice dans la section Gammes (avant Pentatonic #1)

**Versions Base / Étendue :**
- **Base** — la gamme sur une seule octave, notes consécutives sur 2 cordes adjacentes. 6 notes montée, 6 notes descente.
- **Étendue (Full)** — gamme sur toute la plage du manche pour la forme donnée. La tablature comporte une section aller et une section retour séparées par `↩` (séparateur reconnu par `parseSectionSpecial`).

**Particularité G et E — deux octaves disponibles :**
Les formes G et E permettent deux positions octave : la forme standard et la forme `8va` (une octave plus haut). Chaque variante possède ses propres Base et Full, soit 4 entrées pour chacune des deux formes.

**Nouvelle UI — segment + dropdown :**
Avec 7 formes, une rangée de 7 boutons devenait trop dense sur smartphone. La solution adoptée (Option 1) :
- **Segment `Base / Étendue`** en haut — deux boutons pleine largeur, style bleu actif / transparent inactif
- **Dropdown `Forme`** en dessous — `<select>` natif iOS pour les 7 formes CAGED

Implémentation dans `render.js` : la condition `if (p.versionTabs && p.formeTabs)` rend ce layout ; la branche `else` continue d'afficher les boutons simples pour les autres gammes (Pentatonic, A Ionien, etc.).

**Pastilles de progression :**
Le badge dans le tableau de progression affiche `Version · Forme` (ex. `Full · G`). Le suffixe `8va` est retiré de l'affichage badge (`.replace(' 8va', '')`) pour éviter un texte trop long — la clé de progression en base de données reste intacte (`gammeC1__Full_G 8va`).

**Corrections techniques notables :**
- Bug critique : après le refactoring segment+dropdown, la branche `else` de `renderPatternGroupBody` appelait encore `btnStyleVersion` (fonction supprimée) → `ReferenceError` qui crashait tout l'onglet Gammes. Fix : définition d'un `btnStyle` local au bloc `if (p.hasDirectionTabs)`, partagé par les deux branches.
- Variables CSS : la première implémentation utilisait `var(--color-background-primary)` etc. (système du mockup tool) au lieu des variables de l'app (`var(--blue)`, `var(--card)`, `var(--border)`, `var(--text2)`).
- Alignement des tabs ASCII : 52 caractères de contenu entre les pipes. GuitarPro exporte `EADGBE` (E majuscule pour la corde aiguë) mais l'app utilise `EADGBe` — différence à surveiller lors de futurs imports.

---

## Session du 13 juin 2026

### Arpège Em #1 et famille B8P1/B8P2 complète (a → d)

**Fichier :** `data.js`

**Pattern `arpegeEm1` :**  
Un arpège de Mi mineur (E G B) en balayage aller-retour sur 6 cordes. C'est le premier pattern à cumuler `special:true` (lecture note par note), `disableHighNeck:true` et une troisième interprétation `"Sweep"` — en plus de Down et Up. En mode Sweep, une ligne d'en-tête au-dessus de la tablature indique le coup de médiator : `n` = ↓, `V` = ↑, espace = liaison. Le motif monte en 6 balayages ↓ jusqu'à la case 12 et redescend en 6 balayages ↑ jusqu'à E|3.

**Famille B8P1 / B8P2 — quatre variantes de doigté :**  
À partir du pattern de base `b` (index + annulaire, cases 5-7), trois dérivées ont été construites par substitution des numéros de case :

- **`a` — index + majeur** : cases 5-6 (aller), 6-7 (retour) — écart d'un ton
- **`b` — index + annulaire** : cases 5-7, 6-8 — écart d'une tierce mineure *(source)*
- **`c` — index + auriculaire** : cases 5-8, 6-9 — écart de quatre demi-tons
- **`d` — auriculaire fixe + extension index** : cases 4-8, 5-9 — le plus exigeant, l'auriculaire ne bouge pas, c'est l'index qui descend d'un cran

Chaque variante existe en 3 directions (U / D / M) pour B8P1 et B8P2, soit **18 nouveaux patterns** au total. Les versions high-neck suivent le même écart (+7 cases), dérivées par la même logique de substitution.

**Réorganisation :** `B8P2a` a été renommé `B8P3a` et l'ancien `B8P1b` est devenu `B8P2b` pour libérer les numéros 1a–1d et 2a–2d à la nouvelle famille.

---

## Session du 9 juin 2026

### Tableaux de progression séparés par groupe de cordes (Triades Diminuées)

Chaque groupe de cordes (GBe / DGB / ADG / EAD) a désormais son propre tableau de progression indépendant. `progressId = patId + '__' + groupKey`. Live refresh au changement de groupe via `setTriadeStringGroup()`. Le % global agrège tous les groupes. Voir REFERENCE.md pour la documentation technique.

### Moteur audio rythmique (`rhythmicTiming`)

Nouveau système de timing basé sur l'espacement des tirets dans la tablature ASCII. Permet d'écrire des patterns avec des valeurs de note mixtes. Architecture : ancrage absolu anti-dérive, curseur synchronisé. Voir REFERENCE.md section "Pattern avec timing rythmique réel" pour la documentation complète.

---

---

# Partie 3 — Changelog des versions

## v1.2 — Moteur Rythmique + Progressions Triades
**Date:** 9 juin 2026

### Nouvelles fonctionnalités
- **Moteur audio `rhythmicTiming`** : l'espacement des tirets dans la tab est interprété comme durée musicale réelle
- **Ancrage absolu anti-dérive** : `nextT0 = patStart + N × loopDuration` — élimine toute dérive de tempo sur plusieurs boucles
- **Curseur synchronisé** : `PREVIEW._rhythmicCumulativeTimes` aligne le curseur sur les notes réelles
- **Progression séparée par groupe de cordes** (Triades Diminuées) : 4 tableaux indépendants GBe/DGB/ADG/EAD avec live refresh

---

## v1.12 — Gammes Spéciales
**Date:** 18 mai 2026

### Nouvelles fonctionnalités
- **Système de Gammes Spéciales**
  - Ajout d'un type de pattern spécial (`special: true`, `cat: "gamme"`)
  - Lecture note-par-note séquentielle (pas de grouping par colonne)
  - Format: 2 mesures complètes (6 notes montée + 6 notes retour)
  - Pas de direction U/D/M, lecture directe du fichier ASCII

- **Section "🎵 Gammes" dédiée**
  - Affichage séparé dans l'onglet Patterns
  - Visible uniquement si filtre = "Tous" ou "Gamme"
  - Cache automatiquement si filtre spécifique (A2, A3, A4, A5, A6, B6, B8)

- **UI simplifiée pour gammes**
  - Pas de boutons direction (U/D/M)
  - Grille de progression sans colonne direction
  - Pourcentage de progression en temps réel
  - Symboles de médiator (↑↓) sur les deux sections

### Gammes incluses
1. **Pentatonic C/Am forme 1** (BPM: 120)
2. **Pentatonic Bb/Gm forme 2** (BPM: 120)

### Améliorations techniques
- `parseSectionSpecial()` pour extraction sans grouping
- `parseTabNotesSpecial()` pour parsing ASCII tablature spécial
- `parseTabForCursorSpecial()` pour positionnement curseur
- `refreshSpecialProgressPercent()` pour mise à jour temps réel

---

## v1.10 — Simplification UI

- Suppression Large View
- Suppression mode paysage
- Refactorisation "Case de départ": 2 presets Mid-neck/High-neck
- Fix import/export JSON avec fichiers réels
- Ajout Challenge Aléatoire quotidien au parcours

---

**Prochaines étapes potentielles:**
- [ ] Enregistrer session dès la lecture d'une preview
- [ ] Rafraîchir tempo presets quand réglages changent
- [ ] Réduire le wake lock de 10 à 5 minutes
- [ ] Ajouter plus de gammes (modes, positions)
- [ ] Définir la description de l'Étape 3 "L'extension"
