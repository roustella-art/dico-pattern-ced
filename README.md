# Dico Pattern — par Ced

App PWA d'entraînement guitare (patterns techniques + gammes).

**Production :** https://roustella-art.github.io/dico-pattern/

---

## Fichiers source

```
index.html      → structure HTML + CSS + fonctions globales
data.js         → tous les patterns et gammes
state.js        → état, réglages, localStorage
audio.js        → moteur audio Web Audio API + métronome
render.js       → rendu DOM
```

## Configuration / déploiement

```
manifest.json   → config PWA
sw.js           → Service Worker (cache offline)
version.json    → numéro de version (mise à jour auto PWA)
deploy.sh       → commit + push GitHub Pages en une commande
```

## Documentation

```
docs/REFERENCE.md            → référence technique complète :
                               types de patterns, guide d'ajout, décisions de design
docs/JOURNAL.md              → historique du projet, sessions de dev, changelog
docs/IDEES.md                → idées et backlog
docs/DESIGN_AUDIT.md         → audit design
docs/APP_STORE_LAUNCH_PLAN.md → plan de lancement
```

---

## Lancer en local

```bash
python3 -m http.server 8765
# → http://localhost:8765
```
