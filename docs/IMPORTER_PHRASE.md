# Guide : Importer une phrase musicale dans l'app

Ce document explique comment convertir une image de partition / tablature en entrée `data.js`.  
L'exemple de référence est **Test Phrase 1** (session du 10 juin 2026).

---

## Vue d'ensemble du processus

```
Image de partition
       ↓
1. Lire la tablature (notes + cordes)
2. Lire les valeurs rythmiques (portée musicale)
3. Choisir la résolution
4. Construire le tableau d'événements
5. Calculer les colonnes (Col start)
6. Écrire la chaîne tab
7. Déclarer le pattern dans data.js
```

---

## Étape 1 — Lire la tablature

Identifier, de gauche à droite sur chaque corde :

- Le **numéro de frette**
- Le **symbole de technique** éventuel :
  - `b` après un chiffre = **bend** (monte)
  - `r` après un chiffre = **pré-bend release** (descend)
  - *(autres : `h` hammer-on, `s` slide — non supportés en audio pour l'instant)*
- La **corde** (e, B, G, D, A, E)

**Exemple — Phrase 1 :**
```
e : 14
B : 14b  /  14r  /  12
```

---

## Étape 2 — Lire les valeurs rythmiques (portée)

Regarder la portée musicale (pas seulement la tab) pour déterminer :

1. La **mesure** (4/4, 3/4…) → ici 4/4 (indicateur C = common time)
2. Les **silences** en début de mesure (demi-soupir = croche de silence)
3. La **valeur de chaque note** (noire, croche, double-croche…)

> **Important :** la tablature ASCII ne montre pas les valeurs rythmiques —  
> seule la portée musicale les indique avec certitude.

**Correspondance des valeurs françaises ↔ durées :**

| Valeur FR | Valeur EN | Durée (en doubles-croches) |
|-----------|-----------|---------------------------|
| Ronde | Whole | 16 |
| Blanche | Half | 8 |
| Noire | Quarter | 4 |
| Croche | Eighth | 2 |
| Double-croche | Sixteenth | 1 |

**Vérification :** la somme des durées doit égaler exactement une mesure.  
En 4/4 → total = 16 doubles-croches.

**Exemple — Phrase 1 (4/4) :**

| Événement | Valeur | Doubles-croches |
|-----------|--------|----------------|
| Silence | croche | 2 |
| B `14b` | noire | 4 |
| e `14` | croche | 2 |
| B `14r` | noire | 4 |
| B `12` | noire | 4 |
| **Total** | | **16** ✓ |

---

## Étape 3 — Choisir la résolution

La **résolution** = nombre de caractères dans la chaîne tab par double-croche.

| Résolution | 1 double-croche = | Usage |
|------------|-------------------|-------|
| `1` | 1 char | Pattern simple, notes équidistantes |
| `2` | 2 chars | **Phrases avec croches et noires (standard)** |
| `3` | 3 chars | Patterns avec syncopes, triolets de doubles |

**Règle de choix :**  
La plus petite valeur de note dans la phrase = 1 double-croche.  
Si la plus petite valeur est une **double-croche** → res=1.  
Si la plus petite valeur est une **croche** → res=2.  
Si la plus petite valeur est une **noire** → res=2 ou 3 selon le groove.

**Phrase 1 :** plus petite valeur = croche → **res=2** (2 chars = 1 double-croche).

---

## Étape 4 — Construire le tableau d'événements

Convertir chaque durée en **nombre de caractères** :

```
Chars = Doubles-croches × Résolution
```

Puis calculer la **colonne de départ** (Col start) en accumulant les chars :

| Événement | Doubles-croches | Chars (res=2) | Col start |
|-----------|----------------|---------------|-----------|
| Silence | 2 | 4 | 0 |
| B `14b` | 4 | 8 | **4** |
| e `14` | 2 | 4 | **12** |
| B `14r` | 4 | 8 | **16** |
| B `12` | 4 | 8 | **24** |

> Col start d'un événement N = Col start(N-1) + Chars(N-1)

**Vérification :** dernière Col start + derniers Chars = longueur totale du tab.  
Ici : 24 + 8 = **32 chars** = 1 mesure de 4/4 en res=2 ✓

---

## Étape 5 — Écrire la chaîne tab

Pour chaque corde, placer le symbole à la bonne colonne et remplir le reste avec des tirets.

**Règles de placement :**
- Positionner le premier chiffre du symbole à la colonne exacte
- Le symbole occupe autant de chars que de chiffres + lettres : `14b` = 3 chars, `12` = 2 chars
- Le reste de la ligne = tirets `-`
- Toutes les lignes doivent avoir la même longueur

**Construction ligne par ligne (longueur = 32) :**

```
e : 14 à col 12
  → 12 tirets + "14" + 18 tirets = "------------14------------------"

B : 14b à col 4 / 14r à col 16 / 12 à col 24
  → "----14b---------14r-----12------"
     0123456789...
       ↑col4   ↑col16  ↑col24
```

**Vérification du placement B :**
```
"----"   = cols 0-3   (4 chars = silence croche)
"14b"    = cols 4-6   (3 chars)
"---------" = cols 7-15 (9 tirets : 4-3=1 char symbole + gap jusqu'à col16)
  ↳ gap = 16 - (4+3) = 9  ✓
"14r"    = cols 16-18 (3 chars)
"-----"  = cols 19-23 (5 tirets)
  ↳ gap = 24 - (16+3) = 5  ✓
"12"     = cols 24-25 (2 chars)
"------" = cols 26-31 (6 tirets de fin)
Total : 4+3+9+3+5+2+6 = 32 ✓
```

**Tab final :**
```
e|------------14------------------|
B|----14b---------14r-----12------|
G|--------------------------------|
D|--------------------------------|
A|--------------------------------|
E|--------------------------------|
```

> Le `|` final est facultatif mais recommandé pour la lisibilité.  
> Les cordes silencieuses (G D A E) sont remplies de tirets à la même longueur.

---

## Étape 6 — Propriétés du pattern dans `data.js`

```javascript
{
  id: "nom-unique",
  cat: "test",               // catégorie
  dir: "U",
  num: "identifiant",
  notes: 4,                  // nombre de notes jouées
  difficulty: "Test",

  name: "Nom affiché",
  bpm: 80, bpmTarget: 80,

  // ── Moteur rythmique ──────────────────────────────
  rhythmicTiming: true,          // active le moteur de timing réel
  rhythmicResolution: 2,         // résolution choisie à l'étape 3

  // ── Options supplémentaires selon le contenu ──────
  disableHighNeck: true,         // si notes ≥ fret 12 (empêche transpo +12)
  rhythmicBeatPicking: true,     // si picking temps/contre-temps (voir §)

  customInterps: ["Down", "Up"], // interprétations disponibles

  desc: "Description courte.",
  tip: "Conseil de jeu.",

  tab: `e|------------14------------------|
B|----14b---------14r-----12------|
G|--------------------------------|
D|--------------------------------|
A|--------------------------------|
E|--------------------------------|`,
}
```

---

## Référence — Notations spéciales dans la tab

| Symbole | Exemple | Audio | Description |
|---------|---------|-------|-------------|
| (aucun) | `14` | note sèche | Note normale |
| `b` | `14b` | monte 14→16 | Bend plein ton (+2 demi-tons) |
| `b` + chiffre | `14b16` | monte 14→16 | Bend vers frette cible explicite |
| `r` | `14r` | descend 16→14 | Pré-bend release (attaque à +2, descend) |

**Durée des effets (automatique) :**
- Bend montant : rapide (~0.25s, 50% de la note)
- Release descendant : lent (durée totale de la note)

---

## Référence — Flag `rhythmicBeatPicking`

À activer quand les notes tombent sur des **temps et des contre-temps** en 4/4.

**Sans le flag** (défaut) : flèche ↓ sur doubles-croches paires, ↑ sur impaires.  
**Avec le flag** : flèche ↓ sur les **temps** (beats 1-2-3-4), ↑ sur les **contre-temps** (les "et").

Calcul interne : `(Math.floor(col / resolution) % 4) < 2` → sur le temps.

**Exemple Phrase 1 (Down) :**
```
B 14b  col 4  → 16ème 2 → 2%4=2 → contre-temps → ↑
e 14   col 12 → 16ème 6 → 6%4=2 → contre-temps → ↑
B 14r  col 16 → 16ème 8 → 8%4=0 → temps 3      → ↓
B 12   col 24 → 16ème12 → 12%4=0→ temps 4      → ↓
```
→ Down = ↑↑↓↓ / Up = ↓↓↑↑

---

## Checklist d'import

- [ ] Notes et cordes identifiées depuis la tab
- [ ] Valeurs rythmiques lues depuis la portée (pas la tab)
- [ ] Total doubles-croches = multiple de la mesure (16 pour 4/4)
- [ ] Résolution choisie
- [ ] Tableau d'événements complété avec Col start
- [ ] Tab écrite et longueurs vérifiées (toutes les cordes = même longueur)
- [ ] Propriétés du pattern déclarées
- [ ] `disableHighNeck: true` si frets ≥ 12
- [ ] `rhythmicBeatPicking: true` si picking temps/contre-temps
