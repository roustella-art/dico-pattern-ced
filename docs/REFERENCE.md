# Référence Technique — Dico Pattern

Documentation de référence consolidée : guide d'ajout de patterns, différences techniques entre types, décisions de design.

---

# Partie 1 — Guide : Ajouter un pattern

## Structure des fichiers

```
data.js     → ajouter les patterns ici
state.js    → état et réglages (ne pas toucher)
audio.js    → son et métronome (ne pas toucher)
render.js   → affichage (ne pas toucher)
index.html  → structure et CSS (ne pas toucher)
```

---

## Les 3 types de patterns

### Type A — Pattern classique (A4, A6…)

- **Toujours 3 entrées** : une par direction U / D / M
- Une seule tablature `tab`
- L'app transpose automatiquement selon le groupe de cordes et la position du manche

```js
{
  id:"A4P3aU",            // UNIQUE — convention: [CAT]P[NUM][DIR]
  cat:"A4",               // A4 = 4 notes · A6 = 6 notes
  dir:"U",                // U = montée · D = descente · M = mix
  num:'3a',               // numéro inédit dans cette catégorie
  notes:4,
  difficulty:"Débutant",  // "Débutant" | "Intermédiaire" | "Avancé"
  fingerings:['ind + maj + ann + aur', 'ind + maj + ann + ann'],
  name:"Nom du pattern",
  bpm:60,                 // BPM de départ
  bpmTarget:130,          // BPM objectif
  tab:`e|--------------------------5-6-8-9-|
B|------------------5-6-8-9---------|
G|----------5-6-8-9-----------------|
D|--5-6-8-9-------------------------|
A|----------------------------------|
E|----------------------------------|
↩ retour décalé +1
--6-7-9-10------------------------|||
----------6-7-9-10----------------|||
------------------6-7-9-10-------o|||
--------------------------6-7-9-10|||
----------------------------------|||
----------------------------------|||`,
  desc:"Description courte du pattern.",
  tip:"Conseil pratique pour le travailler.",
},
```

> Répéter 3 fois avec `dir:"U"`, `dir:"D"`, `dir:"M"` et les tabs correspondantes.

**Champs optionnels :**
- `etape` + `etapeOrder` → position dans le Parcours (1, 2 ou 3)
- `fretOffset:-1` → pattern qui commence une case plus bas (case 4)
- `related:"A4P1b"` → lien vers un pattern similaire

---

### Type B — Pattern statique multi-cordes (B6…)

- **2 tablatures** : `tabMid` (case 5) et `tabHigh` (case 12)
- Pas de transformation automatique — les deux tabs sont écrites manuellement

```js
{
  id:"B6P2aU",
  cat:"B6", dir:"U", num:"2a", notes:6,
  difficulty:"Intermédiaire",
  fingerings:['ind + maj + aur'],
  name:"Nom du run",
  bpm:60, bpmTarget:110,
  tabMid:`e|-----------------------------------------------5----------|
B|-----------------------------5--------5--6--8-----8--6----|
G|-----------5--------5--6--8-----8--6----------------------|
D|--5--6--8-----8--6----------------------------------------|
A|---------------------------------------------------------|
E|---------------------------------------------------------|
↩ retour décalé +1 case (B→G→D)
...`,
  tabHigh:`e|-----------------------------------------------12---------|
B|-----------------------------12-------12-13-15----15-13---|
G|-----------12       12-13-15----15-13---------------------|
D|--12-13-15----15-13---------------------------------------|
A|----------------------------------------------------------|
E|----------------------------------------------------------|
↩ retour décalé +1 case (B→G→D)
...`,
  desc:"Description.",
  tip:"Conseil.",
},
```

---

### Type Gamme — Pentatonique, Ionien…

- `special: true` obligatoire
- Une seule `tab`, pas de transformation automatique
- Pas besoin de directions U/D/M

```js
{
  id:"pentaC3",           // UNIQUE — convention: [nom][forme]
  cat:"gamme",
  num:"3",
  notes:12,
  difficulty:"Débutant",
  special:true,           // OBLIGATOIRE
  name:"Pentatonic #3",
  bpm:120, bpmTarget:120,
  tab:`e |--------------------------------7--10----|
B |--------------------------8--10----------|
G |--------------------7--9----------------|
D |--------------7--9----------------------|
A |--------7--10---------------------------|
E |--7--10---------------------------------|
↩
--10--7---------------------------------||
--------10--7---------------------------||
--------------9--7----------------------||
--------------------9--7----------------||
--------------------------10--8---------||
--------------------------------10--7---||`,
  desc:"Description de la gamme.",
  tip:"Conseil.",
},
```

---

## Règles à respecter

| Règle | Détail |
|---|---|
| ID unique | Vérifier qu'aucun autre pattern n'a le même `id` |
| 3 entrées par pattern A | Une pour chaque direction U, D, M |
| `tabHigh` = `tabMid` + 7 cases | Pour les patterns B uniquement |
| `special:true` | Obligatoire pour toutes les gammes |
| Tester après ajout | Ouvrir http://localhost:8765 et vérifier l'affichage |

---

## Démarrer le serveur de test

```bash
cd "chemin/vers/dico-pattern"
python3 -m http.server 8765
```

Puis ouvrir **http://localhost:8765** dans le navigateur.

---

## Où ajouter dans data.js

- Patterns **A4** → après la dernière entrée `A4P…`
- Patterns **A6** → après la dernière entrée `A6P…`
- Patterns **B6** → après la dernière entrée `B6P…`
- **Gammes** → tout à la fin du tableau, avant le `];` final

---

---

# Partie 2 — Types de patterns et gammes en détail

## Pattern Normal (U/D/M)
**Cas d'usage:** Exercices techniques avec directions (ascendant/descendant/mix)

### Structure du code
```javascript
{
  id: "A4P2aU",           // ID unique + direction
  cat: "A4",              // Catégorie (A2-A6, B6, B8)
  dir: "U",               // Direction: U, D, ou M
  num: "2a",              // Numéro du pattern
  notes: 4,               // Nombre de notes
  etape: 1,               // Numéro d'étape du parcours
  difficulty: "Débutant",
  name: "Chromatique",
  bpm: 60,
  bpmTarget: 130,
  fingerings: ['ind + maj + ann + aur', ...],  // Doigtés multiples
  tab: `e|...\nB|...\n↩ retour\n...`
}
```

### Format ASCII
- **Header:** Lignes avec `e |`, `B |`, `G |`, `D |`, `A |`, `E |` (6 cordes)
- **Montée:** Première section (ascendant)
- **Séparateur:** `↩ retour` + description
- **Retour:** Deuxième section (descendant/décalé)
- **Terminator:** `|||` en fin de retour

```
e|--------------------------5-6-7-8-|
B|------------------5-6-7-8---------|
G|----------5-6-7-8-----------------|
D|--5-6-7-8-------------------------|
A|----------------------------------|
E|----------------------------------|
↩ retour décalé +1
--6-7-8-9-------------------------|||
```

### Propriétés requises
- ✅ Direction (U/D/M)
- ✅ Doigtés (`fingerings` array)
- ✅ Étape du parcours (`etape`)
- ✅ Format tab avec séparateur `↩`
- ✅ Trois versions de chaque pattern (U, D, M)

### Propriété optionnelle: `fretOffset`
**Cas d'usage:** Décaler les numéros de case pour éviter les doublons à l'affichage (patterns avec extensions)

```javascript
{
  id: "A4P1dU",
  // ... propriétés standards ...
  fretOffset: -1,    // Décale toutes les cases de -1 (réduit de 1 semitone)
  tab: `e|...-9-5-9-5...`  // Les 9 s'afficheront comme 8, les 5 comme 4, etc.
}
```

**Fonctionnement:**
- Paramètre optionnel (défaut: 0, aucun décalage)
- S'ajoute au décalage de `neckPosition` (mid: 0, high: 7)
- Appliqué par `transformTab()` lors du rendu
- Affecte l'affichage UNIQUEMENT (les doigtés et l'audio utilisent toujours les cases d'origine)

**Exemples d'application:**
- `A4P1d*` (Alternance tierce majeure) → `-1` pour éviter 9-10-9-10
- `A6P1c*` (Triade doublée 1-3-5) → `-1` pour simplifier 9-7-5
- `A3P1c*`, `A3P2c*`, `A2P1d*`, `A4P?a*` → `-1` pour lisibilité

---

## Gamme (Pattern Spécial)
**Cas d'usage:** Gammes compètes, 12 notes, lecture note-par-note sur 2 mesures

### Structure du code
```javascript
{
  id: "gammeP1",           // ID simple, pas de direction
  cat: "gamme",            // Catégorie obligatoire
  num: "1",                // Numéro de la gamme
  special: true,           // ⚠️ FLAG OBLIGATOIRE
  notes: 12,               // Toujours 12 (6 montée + 6 retour)
  difficulty: "Débutant",
  name: "Pentatonic C/Am forme 1",
  bpm: 120,
  bpmTarget: 120,
  // ❌ PAS de: fingerings, etape, dir
  tab: `e |--5--8--...\n↩\n--8--5--...`
}
```

### Format ASCII
- **Header:** Lignes avec `e |`, `B |`, `G |`, `D |`, `A |`, `E |` (6 cordes)
- **Montée:** 6 notes (une par corde, de bas en haut ou haut en bas)
- **Séparateur:** Ligne vide simple (pas de `↩`)
- **Retour:** 6 notes identiques à l'inverse
- **Terminator:** `||` en fin

```
e |--5--8----|
B |-5--8------|
G |5--8-------|
D |-8--------|
A |8---------|
E |----------|


--8--5--||
--8--5--||
--8--5--||
--8-----||
--8-----||
---------||
```

### Propriétés requises
- ✅ `special: true` (obligatoire!)
- ✅ `cat: "gamme"` (obligatoire!)
- ✅ Format ASCII: 6 cordes, 2 sections séparées
- ✅ Pas de direction (U/D/M)
- ✅ Pas de doigtés
- ✅ Une seule version (pas de copies U/D/M)

### Comportement spécifique aux gammes
- ✅ Lecture note-par-note (pas de grouping par colonne)
- ✅ Affichage simplifié (pas de boutons direction)
- ✅ Section séparée "🎵 Gammes" (visible seulement si filtre = "Tous" ou "Gamme")
- ✅ Grille de progression sans colonne direction
- ✅ Symboles de médiator (↑↓) sur les deux sections
- ✅ Pourcentage de progression en temps réel

---

## Checklist: Ajouter une nouvelle Gamme

1. **Format ASCII valide?**
   - [ ] 6 lignes avec headers `e |`, `B |`, `G |`, `D |`, `A |`, `E |`
   - [ ] 6 notes en montée, 6 notes en retour
   - [ ] Séparateur ligne vide entre sections
   - [ ] Termine par `||`

2. **Objet JavaScript complet?**
   - [ ] `id: "gammeP#"` (unique)
   - [ ] `cat: "gamme"`
   - [ ] `special: true`
   - [ ] `num: "#"`
   - [ ] `name: "Nom complet"`
   - [ ] `bpm: value`
   - [ ] `notes: 12`
   - [ ] `difficulty: "Débutant"|"Intermédiaire"|"Avancé"`

3. **Pas de propriétés interdites?**
   - [ ] ❌ Pas de `dir`
   - [ ] ❌ Pas de `fingerings`
   - [ ] ❌ Pas de `etape`

4. **Test rapide?**
   - [ ] Filtre "Tous" → gamme visible
   - [ ] Filtre "A2"/"A3"/etc → gamme cachée
   - [ ] Filtre "Gamme" → gamme visible
   - [ ] Click play → lecture note-par-note
   - [ ] Grille progression fonctionne

---

## Exemple complet: Pentatonic C/Am forme 1

```javascript
{
  id: "gammeP1",
  cat: "gamme",
  num: "1",
  special: true,
  notes: 12,
  difficulty: "Débutant",
  name: "Pentatonic C/Am forme 1",
  bpm: 120,
  bpmTarget: 120,
  tab: `e |--------------------------------5--8----|
B |--------------------------5--8----------|
G |--------------------5--7----------------|
D |--------------5--7----------------------|
A |--------5--7----------------------------|
E |--5--8----------------------------------|


--8--5----------------------------------||
--------8--5----------------------------||
--------------7--5----------------------||
--------------------7--5----------------||
--------------------------7--5----------||
--------------------------------8--5----||`
}
```

Ajout dans le fichier: Après la dernière ligne de `PATTERNS = [...]`, avant le `];`

---

---

## Pattern Statique (tabMid / tabHigh)
**Cas d'usage:** Patterns multi-cordes (B6, B8) dont la structure visuelle serait cassée par la transposition automatique (ex: cases 5→12 avec décalage d'alignement des tirets).

### Quand utiliser tabMid/tabHigh ?
- Le pattern utilise des **cases à 1 chiffre en mid** (ex: 5, 7) et **2 chiffres en high** (ex: 12, 14)
- La transposition automatique `+7` casserait l'alignement des tirets dans la tab
- Le décalage de corde caractéristique du pattern doit être **préservé visuellement**

### Structure du code
```javascript
{
  id: "B6P1aU",
  cat: "B6",
  // ... propriétés standards ...
  tabMid: `e|...(cases 5-7)...`,   // Position mid (case 5), alignement cases 1 chiffre
  tabHigh: `e|...(cases 12-14)...` // Position high (case 12), alignement cases 2 chiffres
  // ❌ PAS de propriété `tab` — remplacée par tabMid + tabHigh
}
```

### Règle de construction de tabHigh
**tabHigh = tabMid avec toutes les cases +7 demi-tons**
- Cas `5` → `12`, cas `7` → `14`, cas `6` → `13`, cas `8` → `15`, etc.
- Les tirets doivent être **recalculés** pour correspondre aux largeurs des nombres à 2 chiffres

### Comportement dans le système

| Transformation | Pattern classique (`tab`) | Pattern statique (`tabMid`/`tabHigh`) |
|---|---|---|
| **Sélection neck** | `tab` unique + offset +7 auto | `tabMid` ou `tabHigh` selon `SETTINGS.neckPosition` |
| **Fret offset** | ✅ Appliqué automatiquement | ❌ Déjà intégré dans tabMid/tabHigh |
| **String shift (EADG)** | ✅ Appliqué | ✅ Appliqué via `applyStaticTabTransform()` |

### Fonction clé : `applyStaticTabTransform(rawTab)`
Définie dans `index.html`, utilisée dans `render.js` et `audio.js`.

```javascript
function applyStaticTabTransform(rawTab) {
  const shift = STRING_SHIFTS[SETTINGS.stringGroup] || 0;
  return shift !== 0 ? tabApplyStringShift(rawTab, shift) : rawTab;
}
```

**Pourquoi cette fonction existe:**
- Les tabs statiques bypassaient auparavant TOUT `transformTab` (pour éviter le fret offset)
- Mais cela bloquait aussi le **string shift** (EADG/ADGB)
- `applyStaticTabTransform` applique UNIQUEMENT le string shift, sans toucher aux frets

### Pipeline de rendu selon le type de pattern

```
Pattern classique:
  tab → getEffectiveTab() → transformTab() → [stringShift + fretOffset] → affichage

Pattern statique:
  tabMid ou tabHigh → getEffectiveTab() → applyStaticTabTransform() → [stringShift SEULEMENT] → affichage
```

### Fichiers concernés
- `index.html` : `getTabForNeckPosition()`, `isStaticNeckTab()`, `applyStaticTabTransform()`
- `render.js` : affichage de la tab (2 occurrences)
- `audio.js` : lecture audio (2 occurrences : parsing + curseur)

### Patterns actuellement en format statique
- `B6P1a`, `B6P1b`, `B6P1c` (Run de gamme multi-cordes)
- `B8P1b` (Alternance 2 cordes U/D/M)
- `B8P2a` (Bumblebee U/D/M)

---

---

## Sélection de cordes pour les gammes

**Cas d'usage :** L'utilisateur veut travailler un fragment de gamme sur un sous-ensemble de cordes (ex : seulement E, A, D pour la main gauche grave ; ou G, B, e pour préparer un solo).

### Interface

Barre de 6 boutons ronds au-dessus de la tab, dans l'ordre guitare **grave → aigu** : `E · A · D · G · B · e`

- **Active** → fond vert, texte blanc
- **Inactive** → fond gris, texte gris clair
- Bouton **Tout** visible uniquement si au moins une corde est désactivée
- Minimum 1 corde toujours active (protection)

### État persistant

```javascript
// Dans state.gammeActiveStrings (localStorage)
{
  "gammeP1": [true, true, true, true, true, true],  // toutes actives
  "gammeP2": [true, false, true, true, true, true]   // A désactivée
}
// Index : 0=e · 1=B · 2=G · 3=D · 4=A · 5=E
```

### Fonctions clés (index.html)

| Fonction | Rôle |
|----------|------|
| `getGammeActiveStrings(patId)` | Retourne le tableau de 6 booléens (toutes `true` par défaut) |
| `applyGammeStringFilter(tabStr, activeStrings)` | Masque les notes des cordes inactives par des tirets |
| `toggleGammeString(patId, idx)` | Toggle une corde + mise à jour DOM ciblée |
| `resetGammeStrings(patId)` | Réactive toutes les cordes + mise à jour DOM |

### Pourquoi masquer plutôt que supprimer les lignes ?

Le parser audio `parseSectionSpecial()` utilise `unlabeledIdx` pour mapper les lignes sans label (section retour) vers les cordes dans l'ordre `['e','B','G','D','A','E']`. Si on **supprime** une ligne inactive, l'index se décale et les mauvaises notes sont assignées aux mauvaises cordes.

Le **masquage** (remplacement des chiffres par des tirets de même longueur) préserve la structure de lignes tout en silençant les notes :

```
// Corde A désactivée — masquage :
A |--------5--7------||   →   A |----------------||
// La ligne existe toujours → unlabeledIdx reste cohérent
```

### Pipeline d'application du filtre

```
Affichage (render.js) :
  rawTab → applyGammeStringFilter(tab, activeStrings) → cleanTabDisplay → tabWithSymbols → pre.innerHTML

Audio (audio.js previewPlay) :
  rawTab → applyGammeStringFilter(tab, activeStrings) → parseTabNotesSpecial → cycle

Curseur (audio.js previewPlay) :
  rawTab → applyGammeStringFilter(tab, activeStrings) → parseTabForCursorSpecial → steps

Rafraîchissement interp (audio.js setPreviewInterp) :
  rawTab → applyGammeStringFilter(tab, activeStrings) → pre.innerHTML
```

### Mise à jour DOM ciblée

`toggleGammeString()` et `resetGammeStrings()` mettent à jour **sans `render()` global** :
- `document.getElementById('tab-pre-' + patId)` → contenu tab rechargé
- `document.getElementById('gamme-str-btn-' + patId + '-' + i)` → styles boutons
- `document.getElementById('gamme-reset-btn-' + patId)` → visibilité bouton Tout

→ Pas de scroll reset, pas de clignotement, réponse instantanée.

---

## Gamme avec onglets de direction (`hasDirectionTabs`)

**Cas d'usage :** Une gamme pédagogiquement bidirectionnelle — par exemple la pentatonique en transition entre deux formes (montée shape #1 / descente shape #2, ou l'inverse). Une seule carte, deux variantes jouables, sans multiplier les exercices.

### Structure du code

```javascript
{
  id: "pentaTrans1",
  cat: "gamme",
  num: "7",
  special: true,
  hasDirectionTabs: true,      // ← active le système d'onglets
  notes: 12,
  difficulty: "Intermédiaire",
  name: "Pentatonic Transition 1↔2",
  bpm: 90,
  bpmTarget: 120,
  directions: {
    "1→2": `e |...tab montée #1 / descente #2...`,
    "2→1": `e |...tab montée #2 / descente #1...`
  }
  // ❌ PAS de propriété `tab` — remplacée par `directions`
}
```

### Interface

Deux boutons pleine largeur au-dessus de la tab (avant le sélecteur de cordes) :

- **Actif** → fond `var(--blue)`, texte blanc
- **Inactif** → transparent, texte `var(--text2)`
- Cliquer change la direction → tab + grille de progression mis à jour instantanément, sans re-render global

### État persistant

```javascript
// Dans state.gammeSelectedDir (localStorage)
{
  "pentaTrans1": "1→2"   // direction active par gamme
}
```

### Fonctions clés

| Fonction | Fichier | Rôle |
|----------|---------|------|
| `getGammeSelectedDir(patId)` | `index.html` | Retourne la direction active (première par défaut) |
| `getGammeActiveTab(pat)` | `index.html` | Retourne le tab de la direction sélectionnée |
| `setGammeDirection(patId, dirKey)` | `index.html` | Change la direction + met à jour tab, grille et boutons |
| `buildGammeProgGrid(p)` | `render.js` | Génère le HTML de la grille de progression (utilisé au render initial ET au live refresh) |

### Progression séparée par direction

Chaque direction a sa propre progression indépendante. La clé localStorage encode la direction :

```javascript
// Format de la clé :
progressId = patId + '__' + dirKey.replace(/[→↔]/g, '-')

// Exemples :
"pentaTrans1__1-2__1__U__Down__lent"
"pentaTrans1__2-1__1__U__Down__cool"
```

Le `th` de la grille affiche un **badge** de la direction active (ex : `1→2`) pour que l'utilisateur sache toujours quelle progression il remplit.

Le **% global** de la carte (affiché dans le header) agrège les progressions des deux directions via `getGroupPct()` dans `state.js`.

### Pipeline complet

```
Affichage tab :
  pat.directions[dirKey] → transformTab() → applyGammeStringFilter() → tabWithSymbols → pre.innerHTML

Audio :
  pat.directions[dirKey] → transformTab() → applyGammeStringFilter() → parseTabNotesSpecial → cycle

Curseur :
  pat.directions[dirKey] → transformTab() → applyGammeStringFilter() → parseTabForCursorSpecial → steps
```

### Mise à jour DOM ciblée au changement de direction

`setGammeDirection()` met à jour sans `render()` global :
- `document.getElementById('tab-pre-' + patId)` → tab rechargée
- `document.getElementById('gamme-prog-' + patId)` → grille régénérée via `buildGammeProgGrid(pat)`
- `document.getElementById('pat-train-' + patId)` → % progression rechargé
- `document.getElementById('gamme-dir-btn-' + patId + '-' + dk)` → styles boutons

### Règle de nommage des IDs de bouton de direction

Les caractères `→` et `↔` sont remplacés par `_` dans l'ID HTML pour éviter les problèmes de sélecteur :
```javascript
btnId = 'gamme-dir-btn-' + patId + '-' + dk.replace(/[→↔]/g, '_')
// "1→2" → id="gamme-dir-btn-pentaTrans1-1_2"
```

---

## Badge de mode dans la grille de progression (patterns classiques)

**Cas d'usage :** Indiquer visuellement dans le tableau de progression quel mode (Ascendant / Descendant / Mix) est actuellement affiché, sans avoir à lever les yeux vers les boutons de direction.

### Interface

Un badge coloré dans le `th` du coin gauche de la grille, aux couleurs du mode actif :

| Mode | Label | Couleur |
|------|-------|---------|
| U (Ascendant) | `↑ Asc.` | `#1a7a5e` (vert teal) |
| D (Descendant) | `↓ Desc.` | `#b84a20` (orange brun) |
| M (Mix) | `↑↓ Mix` | `#6b4faa` (violet) |

Les couleurs sont cohérentes avec les boutons de direction (`DIR_BTN_COLORS`) et le fond du tbody (`DIR_BG`).

### Code (render.js)

```javascript
const DIR_BADGE_LABELS = {U:'↑ Asc.', D:'↓ Desc.', M:'↑↓ Mix'};
const dirBadge = `<span style="font-size:9px;font-weight:700;color:#fff;
  background:${dirColor};border-radius:6px;padding:1px 6px;opacity:.9">
  ${DIR_BADGE_LABELS[activeDir] || activeDir}
</span>`;
// Injecté dans le th : <th style="...;vertical-align:middle">${dirBadge}</th>
```

Le badge se met à jour automatiquement à chaque changement de direction (via `setCardDir()` qui déclenche un `render()` complet).

---

## Gamme spécialisée : Triades Diminuées V2 (`customInterps`, `disableHighNeck`, `stringGroups`)

**Cas d'usage :** Une gamme multi-groupe avec interprétations customisées (Down, Up, Sweep) et groupes de cordes sélectionnables. Utilisée pour les arpègements sur différentes positions (GBe, DGB, ADG, EAD) sans transposition high-neck.

### Structure du code

```javascript
{
  id: "triadeDim1",
  cat: "gamme",
  num: "13",
  special: true,
  disableHighNeck: true,                    // ← Désactive la transposition high-neck
  customInterps: ["Down", "Up", "Sweep"],   // ← Remplace ["Down", "Up", "Leg"]
  difficulty: "Avancé",
  name: "Triades Diminuées V2",
  bpm: 120,
  stringGroups: {
    "GBe": `...tab pour cordes e, B, G...`,
    "DGB": `...tab pour cordes B, G, D...`,
    "ADG": `...tab pour cordes D, A, G...`,
    "EAD": `...tab pour cordes E, A, D...`
  }
  // ❌ PAS de `tab` — remplacée par `stringGroups`
}
```

### Interface et fonctionnalités

1. **Sélection de groupes de cordes** (à côté des onglets de direction, le cas échéant)
   - 4 boutons pleine largeur : `GBe · DGB · ADG · EAD`
   - **Actif** → fond `var(--blue)`, texte blanc
   - **Inactif** → transparent, texte `var(--text2)`
   - Cliquer change le groupe → tab + tuning visuelle mise à jour, sans re-render global

2. **Interprétations customisées (Sweep)**
   - Affiche les flèches de picking du fichier ASCII (`.n` = ↓ bleu, `.V` = ↑ orange)
   - Grille de progression avec colonnes **Pick ↓ · Pick ↑ · Sweep** (au lieu de Pick ↓ · Pick ↑ · Legato)
   - Même badge de direction/groupe dans le `th` que les autres gammes

3. **Tuning standard EADGBe préservée**
   - Chaque groupe affiche toujours les 6 cordes dans le même ordre : `e, B, G, D, A, E`
   - Seuls les frets changent selon le groupe
   - `disableHighNeck: true` → pas de transposition d'affichage (pour éviter la confusion pédagogique)

### État persistant

```javascript
// Dans state.triadeStringGroup (localStorage)
{
  "triadeDim1": "GBe"   // groupe actif par gamme multi-groupe
}
```

### Fonctions clés

| Fonction | Fichier | Rôle |
|----------|---------|------|
| `getTriadeStringGroup(patId)` | `index.html` | Retourne le groupe actif (premier par défaut) |
| `getTriadeActiveTab(pat)` | `index.html` | Retourne le tab du groupe sélectionné |
| `setTriadeStringGroup(patId, groupKey)` | `index.html` | Change le groupe + met à jour tab, grille et boutons |
| `getValidInterp(pat)` | `index.html` | Retourne une interprétation valide pour ce pattern (utilise `customInterps` si présent) |
| `getValidInterpForPat(p)` | `render.js` | Variante pour le contexte de rendu |

### Propriétés spéciales

**`disableHighNeck: true`**
- Désactive la transposition `+7` frets en high-neck
- Utile quand la pédagogie exige une tuning visuelle strictement EADGBe
- Pipeline audio/affichage contournent `transformTab()` pour cette propriété

**`customInterps: ["Down", "Up", "Sweep"]`**
- Remplace le `INTERPS` global pour CE pattern uniquement
- La grille de progression utilise ces labels au lieu de (Down, Up, Leg)
- `tabWithSymbols()` et `setPreviewInterp()` respectent ce tableau

**`stringGroups: { "GBe": ..., "DGB": ..., ... }`**
- Stocke N variantes du tab (dans ce cas, 4 groupes de cordes)
- Structure identique à `directions` (pattern → multi-variant)
- Chaque groupe a un **progressId distinct** pour une progression indépendante
- Format progressId : `patId + '__' + groupKey`

### Affichage des flèches de picking pour Sweep

Les flèches (`n` = pick down, `V` = pick up) sont encodées dans le tab avec des lignes de spacing :

```
     n     n  n  V     V  V  n     n  n  V     V  V
e |-----------4--7--4-----------------7--10-7----------|
...
↩
  n     n  n  V     V  V  n     n  n  V     V  V
-----------10-13-10----------------7--10-7----------|
...
```

Quand **Sweep** est sélectionné :
1. `tabWithSymbols()` détecte les lignes de picking (`isPickLine()` = `/^\s*[nV\s]+$/ && /[nV]/`)
2. Convertit les caractères en symboles colorés :
   - `n` → **↓** bleu (`var(--blue)`)
   - `V` → **↑** orange (`var(--orange)`)
3. Affiche les flèches AVANT chaque bloc de cordes (montée ET descente)

Pour les autres interprétations (Down, Up), les flèches sont masquées et les symboles générés automatiquement selon le rythme.

### Progression par groupe

Chaque groupe a sa propre progression indépendante, agrégée dans le % global de la carte :

```javascript
// Format de la clé :
progressId = patId + '__' + groupKey

// Exemples :
"triadeDim1__GBe__1__U__Down__lent"
"triadeDim1__DGB__1__U__Down__lent"
"triadeDim1__ADG__1__U__Down__lent"
"triadeDim1__EAD__1__U__Down__lent"
```

Le badge dans le `th` affiche le groupe actif pour clarifier quelle progression est remplie.

### Pipeline complet

```
Affichage tab :
  pat.stringGroups[groupKey] → transformTab() [si disableHighNeck=false] → tabWithSymbols() [avec flèches pour Sweep] → pre.innerHTML

Audio (previewPlay) :
  pat.stringGroups[groupKey] → transformTab() [si disableHighNeck=false] → parseTabNotesSpecial → cycle

Curseur (previewPlay) :
  pat.stringGroups[groupKey] → transformTab() [si disableHighNeck=false] → parseTabForCursorSpecial → steps

Rafraîchissement interp (setPreviewInterp) :
  Utilise customInterps si présent pour l'affichage des symboles
```

### Mise à jour DOM ciblée au changement de groupe

`setTriadeStringGroup()` met à jour sans `render()` global :
- `document.getElementById('tab-pre-' + patId)` → tab rechargée
- `document.getElementById('gamme-prog-' + patId)` → grille régénérée
- `document.getElementById('pat-train-' + patId)` → % progression rechargé
- Boutons du groupe → styles mis à jour

### Règle de nommage des IDs de bouton de groupe

```javascript
btnId = 'triade-group-btn-' + patId + '-' + groupKey
// "GBe" → id="triade-group-btn-triadeDim1-GBe"
```

---

## Pattern avec timing rythmique réel (`rhythmicTiming`)

### Contexte

Par défaut, le moteur audio joue toutes les notes de façon **équidistante** : chaque note est séparée par une "subdivision" (16th, 8th, etc. selon le réglage du header). L'espacement visuel des tirets dans la tab n'est pas interprété comme durée.

La propriété `rhythmicTiming: true` active un mode où **l'espacement des tirets dans la tab est interprété comme durée musicale réelle**. Cela permet d'écrire des patterns avec des valeurs de note mixtes (croches + doubles croches, etc.).

### Propriétés data.js

```javascript
{
  id: "rhythmic-test",
  rhythmicTiming: true,      // Active le moteur de timing rythmique
  rhythmicResolution: 3,     // Nombre de chars de tab = 1 subdivision (1 sixteenth)
  tab: `...`
}
```

**`rhythmicResolution`** est le facteur de conversion entre les caractères de la tab et les subdivisions musicales :
- `1 sixteenth = rhythmicResolution chars dans la tab`
- Exemple : avec resolution=3, une croche (8th = 2 sixteenths) = 6 chars, une double croche (16th) = 3 chars

### Comment écrire une tab rythmique

La règle clé : **le nombre de tirets entre les notes détermine leur durée relative**.

```
E|0-----0--0--0-----0--0--|
    ↑6    ↑3 ↑3  ↑6    ↑3 ↑3
  croche  dc  dc croche  dc  dc
```

**Règle d'alignement des longueurs de lignes :**
- Toutes les lignes (y compris les cordes muettes `e|`, `B|`, etc.) doivent avoir **exactement la même longueur** de contenu
- La durée de la dernière note est calculée comme `lineLength - lastNoteCol`
- Si les lignes muettes sont plus longues, `lineLength` sera incorrecte → dérive de tempo

**Exemple correct (48 chars pour toutes les lignes) :**
```javascript
tab:`e|------------------------------------------------|
B|------------------------------------------------|
G|------------------------------------------------|
D|------------------------------------------------|
A|------------------------------------------------|
E|0-----0--0--0-----0--0--0-----0--0--0-----0--0--|`
```

### Calcul de la résolution

Pour trouver `rhythmicResolution` :
1. Identifier la plus petite valeur de note (subdivision de référence)
2. Compter les chars entre deux notes adjacentes de cette valeur
3. Ce nombre = `rhythmicResolution`

Exemple : doubles croches séparées par 3 chars → `rhythmicResolution = 3`

### Architecture audio (audio.js)

**Parsing : `parseTabNotesWithDurations()` et `parseSectionWithDurations()`**

Au lieu de simplement enregistrer les positions de colonnes, ces fonctions calculent aussi la **durée de chaque note** :

```javascript
// Durée = distance jusqu'à la prochaine note
distance = nextNoteCol - currentNoteCol

// Dernière note : distance jusqu'à la fin de la ligne
distance = lineLength - lastNoteCol  // ← nécessite lignes de même longueur !
```

**Scheduling : mode `hasRhythmicTiming` dans `scheduleCycle()`**

Au lieu de `noteOffset(i, sixteenth)` (équidistant), chaque note est positionnée par accumulation :

```javascript
let currentTime = 0;
cycle.forEach(({ duration }) => {
  pluckNote(..., safeT0 + currentTime, ...);
  currentTime += duration * sixteenth / rhythmicResolution;
});
```

**Ancrage absolu (anti-dérive) :**

La durée de boucle est calculée une seule fois à `previewPlay()` et stockée dans `PREVIEW._rhythmicLoopDuration`. Chaque boucle suivante est ancrée sur `patStart` :

```javascript
// Calcul unique au démarrage
PREVIEW._rhythmicPatStart = patStart;
PREVIEW._rhythmicLoopDuration = sum(durations) * sixteenth / rhythmicResolution;
PREVIEW._rhythmicCumulativeTimes = [...]; // offset de chaque note

// nextT0 pour chaque boucle = ancre absolue (pas de dérive d'accumulation timer)
nextT0 = PREVIEW._rhythmicPatStart + PREVIEW.sessionLoops * PREVIEW._rhythmicLoopDuration;
```

Pourquoi c'est important : sans ancrage, un timer qui arrive systématiquement 5ms en retard dérive de 5ms × N boucles → 500ms après 100 boucles.

**Curseur synchronisé :**

Le curseur utilise `PREVIEW._rhythmicCumulativeTimes[i]` au lieu de `noteOffset(i, sx)`, et `PREVIEW._rhythmicLoopDuration` pour la durée du cycle, ce qui le maintient aligné sur les notes réelles.

### Piège classique : tab mal dimensionnée

Le bug le plus courant : des lignes de longueurs différentes.

```
# BUG : e=52 chars, E=52 chars mais note12 à col 47
# lineLength = 52, durée note12 = 52-47 = 5 chars
# Total = 6+3+3+6+3+3+6+3+3+6+3+5 = 50 → loop = 50/3 = 16.67 sixteenths ≠ 16
# Résultat : dérive de 83ms par boucle → décalage "fort" perceptible dès la 2ème boucle

# FIX : aligner toutes les lignes sur 48 chars
# lineLength = 48, durée note12 = 48-45 = 3
# Total = 48 → loop = 48/3 = 16 sixteenths = 4 beats exactement
```

---

**TL;DR:**
- **Pattern** = exercice technique, multiple directions, doigtés
- **Gamme** = pattern spécial, `special:true`, `cat:"gamme"`, note-par-note, 2 mesures
- **fretOffset** = propriété optionnelle pour décaler les cases à l'affichage (lisibilité)
- **tabMid/tabHigh** = pattern statique multi-cordes, tab fixe par position neck, string shift toujours actif
- **gammeActiveStrings** = sélection par corde pour les gammes, masquage des notes inactives, persisté en localStorage
- **hasDirectionTabs** = gamme avec variantes de direction (ex: pentatonique 1↔2), une progression distincte par direction, live refresh ciblé
- **dirBadge** = badge dans le `th` de la grille pour afficher le mode actif (patterns classiques et gammes à onglets)
- **rhythmicTiming** = pattern avec durées réelles basées sur l'espacement de la tab, ancrage absolu anti-dérive, curseur synchronisé

---

---

# Partie 3 — Décisions de design

## Vue d'ensemble
Document des choix de design majeurs et des rationnements derrière ces choix.

---

## 1. Suppression du système de doigtés (v1.1)

**Date :** 3 juin 2026  
**Status :** ✅ Implémentée

### Rationnement
- Les doigtés ajoutent une **complexité inutile** pour l'utilisateur courant
- Chaque guitariste a **ses propres préférences** de doigté selon sa main, son style, ses objectifs
- L'app est déjà **très complète** sans cette feature (progression, notes, métronome, etc.)
- Les notes suffisent pour que l'utilisateur **documente son approche personnelle**

### Changements effectués
1. Supprimé le système d'accordéons de doigtés dans les patterns
2. Gardé la section "Notes" sous chaque tableau de progression
3. Supprimé le code associé :
   - Boutons d'accordéons doigtés
   - Affichage des tabs alternatives pour chaque doigté
   - Fonction `toggleFingering()` et assimilées
   - Données `pimtDone` du localStorage

### Bénéfices
- ✅ Interface plus **épurée et lisible**
- ✅ Moins de **distractions** pendant la pratique
- ✅ Utilisateur **responsable de son approche** (liberté créative)
- ✅ Maintenance **plus simple** du code

### Réouverture possible
Si à l'avenir on souhaite revenir à un système de doigtés :
- Repartir d'une architecture plus modulaire
- Permettre à l'utilisateur d'**uploader ses propres doigtés**
- Système de **presets de doigtés** par style (jazz, metal, classique)

---

## 2. Architecture actuelle

### Simplifications faites
- ✅ Header minimaliste par défaut (décompte + clic + BPM)
- ✅ Navigation réduite (Parcours | Patterns | Gammes | Journal)
- ✅ Onboarding adaptatif par niveau
- ✅ Valeurs rythmiques cohérentes (notation anglo-saxonne)

### À explorer plus tard
- Partage de progression entre utilisateurs
- Intégration avec des forums de guitaristes
- Mode collaboratif (coach virtuel)
- Export de sessions vers YouTube (vidéos tutoriels)

---

## 3. Priorités de l'app

### Cœur (✅ Implemented)
1. Métronome avec subdivision
2. Progression visuelle et sonore
3. Journal de pratique
4. Onboarding adaptatif

### Important (✅ Implemented)
1. Gammes (pentatoniques + modes)
2. Export/Import de données
3. PWA (offline + installation)
4. Mode sombre

### Nice-to-have (reporté ou supprimé)
- ~~Doigtés interactifs~~ → Supprimé
- ~~Coach vocal~~ → Complexe
- ~~Gamification avancée~~ → Simple progression suffisant

---

## 4. Philosophie de l'app

**Dico Pattern** suit la philosophie **"less is more"** :
- **Pas d'overwhelm** : l'utilisateur choisit ce qu'il voit
- **Responsabilité de l'utilisateur** : on propose les outils, l'utilisateur adapte sa pratique
- **Efficacité d'abord** : chaque feature doit avoir une raison d'être
- **Respect du musicien** : l'app ne dicte pas comment bien jouer

---

## 5. Structure du dossier (v2.10+)

```
dico-pattern/
├── index.html          ← Core PWA (markup + CSS + orchestration)
├── audio.js            ← Web Audio API (métronome + preview)
├── render.js           ← Logique UI (rendu de tous les onglets)
├── state.js            ← Gestion état + localStorage
├── data.js             ← Base de données patterns (147+ patterns)
├── sw.js               ← Service Worker (offline PWA)
├── onboarding.js       ← Guide utilisateur adaptatif
├── manifest.json       ← Config PWA
├── version.json        ← Version app + cacheVersion SW
├── README.md
│
├── assets/icons/       ← Icons PWA (180, 192, 512px)
├── scripts/            ← Utilitaires build
│   ├── bump-version.sh
│   └── generate-version.js
└── docs/               ← Documentation complète
    ├── REFERENCE.md    ← Ce fichier
    ├── IDEES.md        ← Roadmap & idées
    ├── JOURNAL.md      ← Journal de développement
    └── ...
```

---

## 6. Qualité du code

### JSDoc (v2.10)
Toutes les fonctions publiques ont un JSDoc `@param` + `@returns` :
- `render.js` : 25+ fonctions documentées
- `state.js` : 15+ fonctions documentées
- `audio.js` : 10+ fonctions documentées

### Principes à respecter
- **DRY** : pas de duplication de logique — utiliser `buildProgGridRows()`, `buildCalendarCells()`
- **Pas de refactoring inline handlers** : risque trop élevé, pas de gain fonctionnel
- **Pas de consolidation logique %** : 4 fonctions légèrement différentes, risque de régression sans tests

---

## 7. Prompt — consolidation de patterns

> Copier-coller dans une nouvelle conversation Claude pour unifier un groupe de patterns séparés.

**Contexte — app guitare PWA (dico-pattern)**

Le projet est dans `/Users/cedm4/Desktop/dico-pattern/`. Stack : HTML/JS vanilla, pas de framework. Les fichiers clés sont `data.js` (patterns), `render.js` (rendu HTML), `index.html` (fonctions JS), `state.js` (progression).

**Tâche — consolider plusieurs patterns en un seul avec sélecteurs**

Je veux fusionner un groupe de patterns séparés en **un seul pattern unifié** avec deux sélecteurs (comme A2P1 / "Intervalles express"). Voici le modèle exact à reproduire.

**Structure data.js du pattern unifié :**
```javascript
{
  id: "monPattern",
  cat: "A2",          // catégorie existante
  num: '1',           // numéro unique dans la catégorie
  notes: 2,
  difficulty: "Technique",
  hasDirectionTabs: true,              // active la UI gamme-style
  versionTabs: ["U", "D", "M"],        // 1er sélecteur (boutons)
  versionLabels: { U:"Ascendant", D:"Descendant", M:"Mix" },
  versionSelectorLabel: "Direction",   // label du 1er sélecteur
  disableStringSelector: true,         // masque le filtre cordes E A D G B e
  formeTabs: ["1-2", "1-3", "1-4"],    // 2e sélecteur
  formeSelectorLabel: "Intervalle",    // label du 2e sélecteur
  name: "Nom du pattern",
  bpm: 80, bpmTarget: 160,
  tab: `...`,   // tab par défaut (optionnel, fallback)
  directions: {
    "U|1-2": `tab ascii...`,
    "D|1-2": `tab ascii...`,
    "M|1-2": `tab ascii...`,
    "U|1-3": `tab ascii...`,
    // ... toutes les combinaisons versionTab|formeTabs
  }
}
```

**Règles critiques :**
- Pas de `special: true` → préserve l'audio colonne par colonne (≠ gammes qui utilisent `parseSectionSpecial`)
- Clé `directions` toujours au format `"versionTab|formeTabs"` (pipe comme séparateur)
- `disableStringSelector: true` supprime le sélecteur de cordes gamme-style
- Le routing `isSpecial` dans render.js gère déjà ce cas : `const isSpecial = pats[0].special || !!(pats[0].hasDirectionTabs && pats[0].versionTabs);` — rien à modifier
- `state.js` `getGroupPct` gère déjà le cas `hasDirectionTabs && versionTabs && formeTabs` — rien à modifier
- Le groupe de cordes (DGBE/ADGB/EADG) fonctionne automatiquement car `transformTab` utilise `!!p.special` pour skipStringShift

**UI automatique selon le nombre de formes :**
- ≤ 5 formes → boutons segmentés côte à côte
- > 5 formes → chips scrollables horizontalement
Détecté via `formeTabs.length > 5` dans render.js — aucun flag à ajouter.

**Ce qu'il faut faire concrètement :**
1. Identifier les patterns à fusionner (donner les IDs actuels)
2. Créer le nouveau pattern unifié dans data.js avec le format ci-dessus
3. Supprimer les anciens patterns de data.js
4. Vérifier que `related:` dans d'autres patterns ne pointe pas vers les anciens IDs

---

## 8. Log des modifications majeures

| Date | Version | Changement |
|------|---------|-----------|
| 2026-06-13 | 2.11 | Arpège Em #1 + famille B8P1/B8P2 complète (a/b/c/d) |
| 2026-06-10 | 2.10 | Organisation dossier (assets/, scripts/, docs/) + JSDoc 50+ fonctions |
| 2026-06-10 | 2.9.x | Ajustements mineurs UX + SSH GitHub configuré |
| 2026-06-10 | 2.9 | Refactoring : buildProgGridRows(), buildCalendarCells(), tri journal par timestamp |
| 2026-06-09 | 1.2 | Moteur audio rythmique (`rhythmicTiming`), ancrage absolu anti-dérive |
| 2026-06-09 | 1.2 | Tableaux de progression séparés par groupe de cordes (Triades Diminuées) |
| 2026-06-03 | 1.1-onboarding | Ajout onboarding adaptatif + versioning PWA |
| 2026-06-03 | 1.1-notation | Notations rythmiques anglo-saxonnes (8/3:8/16/6:16) |
| 2026-06-03 | 1.1-design | Décision : suppression doigtés, garde notes seulement |
| 2026-06-01 | 1.0-gammes | Réorganisation gammes (penta 1-5 → transitions 6-10 → Ionien 11) |
| 2026-06-01 | 1.0-release | Première version stable |
