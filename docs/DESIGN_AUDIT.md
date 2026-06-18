# Audit Design — Dico Pattern
_Juin 2026 · Vue d'ensemble et axes d'amélioration_

---

## État actuel du design

### ✅ Points forts

**Palette cohérente — "warm vintage studio"**
- Teals profonds (#0F4C5C) + siennas brûlées (#D4622E) sur parchemin (#F4EEE2)
- CSS custom properties bien organisées
- Ratio de contraste correct pour l'accessibilité

**Architecture visuelle épurée**
- Pas de dégradés, pas d'ombres inutiles
- Design flat avec cartes blanches
- Typographie claire avec hiérarchie

**Responsive et mobile-first**
- Max-width 640px en portrait
- Landscape supporté sur tablets (iPad +500px)
- Viewport meta tags corrects (PWA-ready)

**Interactions fonctionnelles**
- Boutons avec feedback visuel (active state)
- Icônes SVG flat (métronome pendule, etc.)
- Chronomètre dans le header (position logique)

---

## Axes d'amélioration identifiés

### 1️⃣ **Hiérarchie visuelle & affordances**

**Problème:** Certains éléments manquent de clarté quant à leur rôle
- Les boutons de direction (↑ Ascendant, ↓ Descendant, ↕ Mix) ne sont pas assez distincts visuellement
- La grille de progression peut être déroutante (mix de couleurs, texte petit)
- L'iconographie emoji (🥁, 🔥, ⚡) manque de cohérence avec le reste du design plat

**Suggestions:**
- Renforcer les états boutons : border/fond plus affirmés pour le sélectionné
- Utiliser des icônes SVG pour remplacer tous les emojis
- Ajouter des séparateurs visuels clairs entre les sections principales

---

### 2️⃣ **Cohérence des composants**

**Problème:** Mélange de styles — certains éléments ne suivent pas la palette
- Le fond noir de la tablature ASCII tranche avec le parchemin
- Les boutons du tableau de progression (Pick ↑, Pick ↓) ont trop de variantes de couleur
- L'accordéon du "Challenge du jour" (orange/beige) n'est pas clairement distingué des étapes (bleus)

**Suggestions:**
- Normaliser les teintes : utiliser 3-4 couleurs max pour toute l'app
- Appliquer une "règle de 3 couleurs" : primaire (teal), secondaire (orange), neutre (parchemin + gris)
- Harmoniser les états des composants (hover, active, disabled)

---

### 3️⃣ **Espacement & alignement**

**Problème:** L'espacement n'est pas systématisé
- Marges entre les sections variables
- Padding des cartes incohérent
- Gaps entre les boutons non réguliers

**Suggestions:**
- Créer une échelle d'espacement en 4px (4, 8, 12, 16, 20, 24, 32 px)
- Appliquer 16px entre les sections principales
- Utiliser 8px pour les gaps internes (boutons, cartes)

---

### 4️⃣ **Typography & readability**

**Actuel:** Une seule font system sans variation de poids intentionnelle

**Suggestions:**
- Poids: 400 (base), 600 (labels/buttons), 700 (headings)
- Tailles: 12px (small), 14px (body), 16px (labels), 18px (h2), 20px (h1)
- Utiliser le monospace seulement pour les tablatures (déjà bon ✅)

---

### 5️⃣ **Interaction & feedback**

**Actuel:** États actifs/hover sont trop subtils

**Suggestions:**
- Ajouter des transitions plus visibles (200ms max)
- Feedback haptique déjà implémenté ✅ — à maintenir
- Ajouter des changements de couleur plus affirmés au hover (10% + clair/foncé)
- Toast de confirmation après action (ex: "Pattern ajouté aux favoris")

---

### 6️⃣ **Accessibilité & dark mode**

**Problème:**
- Pas de dark mode (demandé par les utilisateurs ?)
- Focus states peu visibles (tab navigation)
- Contraste du texte gris (--text2, --text3) peut être limite sur parchemin

**Suggestions:**
- Ajouter `prefers-color-scheme: dark` avec palette inversée
- Focus state: border/glow #FF6B35 (orange, déjà utilisé pour shuffle)
- Augmenter le contraste du --text3 (#7E746A → #6B6259)

---

### 7️⃣ **Mobile optimization**

**Actuel:** Très bon en portrait, mais landscape peut être serré

**Suggestions:**
- Sur landscape (petit écran), réduire la hauteur du header
- Augmenter le touch target minimum : 44px × 44px (vs 32px actuellement)
- Tester sur iPad en landscape → optimiser pour la width

---

## Prochaines étapes

### Sprint 1 — Fondations (~2h)
- [ ] Normaliser la palette : 3 couleurs primaires + neutres
- [ ] Créer une composant "Button" avec états cohérents
- [ ] Ajouter des focus states (tab navigation)
- [ ] Remplacer les emojis par des icônes SVG

### Sprint 2 — Refinement (2-3h)
- [ ] Implémenter une échelle d'espacement cohérente
- [ ] Améliorer la hiérarchie des boutons de direction
- [ ] Ajouter dark mode (prefers-color-scheme)
- [ ] Toast notifications pour les actions

### Sprint 3 — Polish (2h+)
- [ ] Animations subtiles (transitions entre onglets)
- [ ] Micro-interactions (hover, active, disabled)
- [ ] Test mobile (iPhone, iPad)
- [ ] Optimisation landscape

---

## Palette proposée (à valider)

**Primaire:** Teal #0F4C5C (header, liens, sélection)
**Secondaire:** Orange #D4622E (actions, CTAs, accent)
**Accent:** Vert #56864A (valeurs positives, complétions)
**Neutre:** Parchemin #F4EEE2 + Gris #1B1815
**Feedback:** Rouge #B0413E (destructive, warnings)

---

_Le design est bon — il suffit de l'affiner et le rendre plus intentionnel._
