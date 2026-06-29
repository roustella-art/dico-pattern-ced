# Archive — Gammes & Arpèges

_Créé le 29 juin 2026_

## Contexte

En juin 2026, les onglets Gammes et Arpèges ont été retirés de l'application principale Dico Pattern. La décision a été prise car le **Shaker** remplace ces fonctions de manière plus cohérente avec la philosophie de l'app (patterns libres, pas de méthode figée).

Le travail réalisé sur Gammes/Arpèges n'est pas perdu — il est conservé dans une branche git dédiée et pourra servir de base pour une application séparée (**Dico Arpège**) à développer ultérieurement.

---

## Où retrouver le contenu archivé

**Repo GitHub :** `roustella-art/dico-pattern-ced`  
**Branche :** `archive/gammes-arpeges`

Ce snapshot contient l'état complet de l'app au moment de la suppression :
- Tous les patterns `cat:"gamme"` et `cat:"arpeges"` dans `data.js`
- Les fonctions `renderGammes()` et `renderArpeges()` dans `render.js`
- Les onglets nav Gammes et Arpèges dans `index.html`
- Le moteur audio complet (`audio.js`)
- Le système de progression et localStorage (`state.js`)

---

## Comment reprendre ce travail

### 1. Récupérer la branche en local
```bash
cd /Users/cedm4/Desktop
git clone git@github.com:roustella-art/dico-pattern-ced.git dico-arpeges
cd dico-arpeges
git checkout archive/gammes-arpeges
```

### 2. Créer un nouveau repo GitHub
- Créer `roustella-art/dico-arpeges` sur github.com (repo vide)
- Puis :
```bash
git remote set-url origin git@github.com:roustella-art/dico-arpeges.git
git push -u origin archive/gammes-arpeges:main
```

### 3. Nettoyer le code pour l'app Dico Arpège
Supprimer de ce nouveau repo :
- Les patterns `cat:"A2"`, `cat:"A3"`, `cat:"A4"`, `cat:"A5"`, `cat:"A6"`, `cat:"B6"`, `cat:"B8"` dans `data.js`
- Les fonctions `renderPatterns()`, `renderJournalPage()`, `renderProgress()` si non pertinentes
- L'onglet Shaker
- Garder : moteur audio, système de progression, onglets Gammes/Arpèges

---

## Contenu Gammes/Arpèges au moment de l'archive

| ID | Nom | Catégorie | Difficulté |
|----|-----|-----------|------------|
| pentaPos | Pentatonic (5 positions) | gamme | Basique |
| triadeDim1 | Triades Diminuées | arpeges | Complexe |
| arpegeEm1 | Arpège Em #1 | arpeges | Technique |

_D'autres gammes pentatoniques étaient en cours d'intégration au moment de l'archive._

---

## Idées pour Dico Arpège

- Reprendre le système de progression (grille BPM + interps)
- Ajouter les arpèges manquants : Em, Am, G maj, D maj, triades majeures/mineures/dim
- Intégrer les presets Shaker comme point d'entrée pédagogique
- Modèle économique envisagé : app séparée sur App Store, même pricing que Dico Pattern (~1,99€/mois)
