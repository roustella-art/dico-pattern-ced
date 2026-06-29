# Shaker — Notes de développement

**Fichier :** `shaker.html` (prototype standalone, charge `data.js`)  
**Dernière mise à jour :** 2026-06-26

---

## Concept

Le Shaker permet de composer des exercices personnalisés en assignant des patterns de catégorie A à chaque corde de guitare. Les patterns jouent en **cascade stricte** (une corde à la fois, alignement colonne) — pas de polyphonie.

---

## Architecture

### Ordre des cordes
```js
const CASCADE_ORDER  = ['E','A','D','G','B','e']; // ordre de lecture audio
const DISPLAY_ORDER  = ['e','B','G','D','A','E']; // affichage tab (haut → bas)
```

### État par corde (`stringState`)
```js
stringState[s] = {
  active:    false,
  patKey:    '',       // ex: 'A4P3'
  forme:     '',       // ex: '1-2-3-5'
  dir:       'U',      // 'U' | 'D'
  startFret: 5,        // case de départ (0–12)
}
```

### Transposition
```js
function transposedNotes(notes, startFret) {
  const offset = startFret - 5; // base du pattern = case 5
  return notes.map(n => n === 0 ? 0 : Math.max(0, n + offset));
  // les notes à 0 (corde à vide) ne sont pas transposées
}
```

---

## Rendu tablature (cascade stricte)

Chaque note occupe `2 + String(fret).length` caractères (`--5`, `--12`).  
La position de début de chaque corde = somme des largeurs des cordes précédentes.  
Les cordes inactives reçoivent des tirets sur toute la largeur totale.

---

## Modes de lecture

| Mode | Couleur | Comportement |
|------|---------|--------------|
| Strict | Bleu | Boucle la mesure 1 uniquement |
| Inversé | Violet | Mesure 1 + retour miroir (cascade inversée) |
| Patron | Orange | Mesure 1 + retour décalé de +N (1–5), notes 0 préservées |

**Boucle infinie** — la lecture tourne jusqu'au Stop.  
Stop = `masterGain.gain.setValueAtTime(0,0)` + `masterGain.disconnect()` (coupure immédiate).

---

## À implémenter (v2)

- **Presets locaux** — localStorage, liste rappelable
- **Partage par URL** — état encodé en base64 dans le hash (`shaker.html#xxxx`), bouton "Copier le lien", zéro backend
- **Intégration** dans l'app principale (onglet dédié)
- **Retour +N au niveau audio** — le mode Patron décale les frets mais n'adapte pas encore la fréquence de référence par corde (à tester avec des patterns utilisant la corde à vide)

---

## Fréquences de référence
```js
const OPEN_FREQS = { E:82.41, A:110.0, D:146.83, G:196.0, B:246.94, e:329.63 };
// fretFreq(string, fret) = OPEN_FREQS[string] * Math.pow(2, fret/12)
```
