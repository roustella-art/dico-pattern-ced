# Dico Pattern — Idées & Chantiers
_Mis à jour : 16 juin 2026_

## App HTML — Fait ✅
- [x] Déployer sur GitHub Pages
- [x] Métronome global dans le header (remplace les widgets par pattern)
- [x] Chronomètre avec double bip toutes les 5 minutes
- [x] Onglet Guide (philosophie, nomenclature, méthode de travail)
- [x] Suppression de l'onglet Programme (pas utile pour l'instant)
- [x] Grille de progression simplifiée : 36 cases par pattern (1 direction × 3 interps × 4 doigtés × 3 tempos)
- [x] Progression sauvegardée en localStorage — persistante par appareil, chaque élève a sa propre progression indépendante
- [x] JSDoc complet sur 50+ fonctions publiques (render.js, state.js, audio.js) — v2.10
- [x] Catégories B ajoutées : B6 (multi-cordes), B8 (2 cordes) — familles B8P1/B8P2 complètes
- [x] Arpège Em #1 (arpegeEm1) ajouté — v2.11
- [x] Organisation dossier : assets/icons/, scripts/, docs/ — v2.10
- [x] Gestion iOS audio bg/fg : fermeture + prompt "reprendre la lecture" — robuste

## App HTML — À faire
- [ ] Tester l'app sur iPad / iPhone — phase test élèves
- [ ] Traiter la question des doigtés (chantier à définir)
- [ ] Ajouter catégorie C (3 cordes) quand B sera complète
- [ ] Ajouter d'autres patterns A4 si besoin après retours des élèves
- [ ] Investiguer sync clic/tab sur Samsung (voir section Bugs connus)

## Méthode / Livre
- [ ] Rédiger l'introduction philosophique de la méthode (texte rédigé ensemble, à formaliser)
- [ ] Créer le PDF imprimable version test (à partager avec les élèves)
- [ ] Définir la structure complète : niveaux débutant / intermédiaire / avancé
- [ ] Phase test avec les élèves → recueillir les retours
- [ ] Explorer le format print-on-demand (Amazon KDP ou Lulu.com)

## Podcast À la Loop !
- [ ] Intégrer des patterns comme exercices complémentaires aux épisodes
- [ ] Tourner quelques vidéos démo des patterns
- [ ] Épisode dédié à la philosophie de la méthode ?

## Catégories futures
- [ ] Catégorie "Style" : patterns signature par guitariste
  - [x] Yngwie Malmsteen (mineure harmonique) — A4P6 ✅
  - [ ] Jimi Hendrix (pentatonique / chromatique blues)
  - [ ] Guthrie Govan (intervalles larges)
  - [ ] Zakk Wylde (pentatonique minor power)
- [ ] Patterns sur 2 cordes (catégorie B) — arpèges, gammes 3 notes/corde
- [ ] Patterns sur 3 cordes (catégorie C) — runs type Yngwie multi-cordes

## Performance — Roadmap

### Situation actuelle (v2.11)
- data.js : ~184KB, 147+ patterns — OK jusqu'à ~300KB
- Latence légère perceptible à l'affichage des tabs et changements d'onglet
- Rendu complet `innerHTML` à chaque changement d'onglet → normal mais limite la scalabilité

### Seuils à surveiller
- data.js > 250KB → envisager code splitting
- data.js > 400KB → code splitting urgent
- Latence > 500ms perçue → profiler avec DevTools

### Améliorations futures (par ordre de priorité)

**Priorité haute (quand 300+ patterns) :**
- [ ] **Code splitting de data.js** — séparer par catégorie (patterns-a2a3.js, patterns-a4a5.js, etc.)
  - Effort : ~2h · Gain : -50% temps initial
  - ⚠️ Risque moyen : tester chaque onglet après, vérifier filtres et progression globale

- [ ] **Lazy loading** — charger les patterns B6/B8/gammes seulement au premier clic
  - Effort : ~3h · Gain : -40% latence initiale

**Priorité moyenne (quand 300-500 patterns) :**
- [ ] **Virtual scrolling** — n'afficher que les 15-20 patterns visibles dans la liste
  - Effort : élevé (~8h) · Gain : -70% DOM nodes
  - Nécessite algorithme custom ou lib légère

- [ ] **Caching des calculs de progression** — éviter recalcul % à chaque rendu
  - Effort : faible (~1h) · Gain : -20% latence

**Priorité basse (futur) :**
- [ ] **Web Worker** pour parser data.js (thread séparé, UI jamais bloquée)
- [ ] **IndexedDB** si localStorage atteint ses limites (~5-10MB)
- [ ] **Gzip / CDN** si migration vers Netlify/Vercel devient nécessaire

---

## Bugs connus / À investiguer

### Sync clic/tab décalé sur Samsung
- **Symptôme** : sur un Samsung (modèle inconnu), le clic n'est pas synchronisé avec les tabs — décalage croissant dans le temps
- **Non reproduit** : sur iPhone et autre Android
- **Hypothèses** : Samsung Internet (navigateur custom), mode batterie économe, modèle ancien
- **À vérifier** :
  - [ ] Quel navigateur ? (Samsung Internet vs Chrome)
  - [ ] Modèle et version Android ?
  - [ ] Le décalage est-il constant ou croissant ?
  - [ ] Changer de navigateur résout-il le problème ?
- **Fix possible** : détecter et afficher un warning "sync peut être imprécis"

---

## Notes techniques
- Progression : localStorage, par navigateur/appareil. Pas de sync multi-appareils.
- Chaque élève sur son propre téléphone = progression 100% indépendante.
- Si besoin de sync à terme → nécessiterait un backend (pas prioritaire).
- data.js est le seul fichier "lourd" — surveiller sa taille à chaque ajout de patterns.
- JSDoc complet sur les fonctions publiques → facilite les refactorings futurs.
