# 🚀 Dico Pattern — App Store/Google Play Launch Plan

**Status:** Planning (Lancement prévu juillet 2026)  
**Last Updated:** 18 mai 2026

---

## 📊 **Modèle Commercial**

### Stratégie Freemium
- **Version DÉMO** (Gratuite)
  - Patterns A2-A4 (2-4 notes) accessibles
  - Étape 1 du parcours seulement
  - Gammes: accès limité (essai)
  - Parfait pour tester l'app

- **Version PRO** (Paiement unique)
  - **Prix: 3,99€** (paiement unique, pas d'abo)
  - App Store/Google Play: ~2,80€ net (après 30% commission)
  - Accès complet:
    - Patterns A2-A6, B6, B8
    - Parcours complet (3 étapes)
    - Toutes gammes
    - Stats détaillées
    - Mode entraînement avancé

### Conversion Strategy
- Demo → démonstration qualité
- 1-2 sessions gratuits convainc de passer au Pro
- Email support pour assistance (fidélisation)

---

## 📱 **Platforms**

| Platform | Frais | URL |
|----------|-------|-----|
| **App Store (iOS)** | 99€/an | https://developer.apple.com |
| **Google Play (Android)** | 25€ once | https://play.google.com/console |
| **Total année 1** | 124€ | — |

---

## 🔐 **Privacy Policy**

```
PRIVACY POLICY — Dico Pattern

Dernière mise à jour: [2026-07-XX]

📌 COLLECTE DE DONNÉES
Dico Pattern fonctionne entièrement hors ligne.
Toutes vos données sont stockées LOCALEMENT sur votre appareil:
- Progression (patterns complétés)
- Favoris
- Réglages personnalisés
- Sessions d'entraînement

📌 DONNÉES ENVOYÉES À NOS SERVEURS
❌ AUCUNE donnée n'est envoyée.
❌ Pas de tracking utilisateur
❌ Pas de cookies
❌ Pas de publicités
❌ Pas d'analyse d'usage

📌 SUPPRESSION DE DONNÉES
Vous pouvez réinitialiser complètement l'app via:
Settings → Reset (tout est supprimé)

📌 CONTACT
Pour toute question concernant vos données:
📧 roustella@gmail.com

📌 CONFORMITÉ LÉGALE
✅ RGPD (UE) — Pas de données collectées
✅ CCPA (Californie) — Pas de données collectées
✅ COPPA exempt — App non destinée aux mineurs
```

---

## 🎙️ **Podcast Announcement Strategy**

### Timeline
- **Semaine de lancement -2**: Épisode podcast "Dico Pattern arrive"
- **Jour de lancement**: Post/annonce réseaux sociaux
- **Semaine +1**: Follow-up podcast avec retours utilisateurs

### Script Podcast (30-60 secondes)
```
"Listeners, grande annonce! 🎸

Après des mois de développement, Dico Pattern 
— le dictionnaire interactif de patterns guitare — 
arrive sur iPhone et Android!

Vous y trouverez:
• 30+ patterns progressifs (2 à 6 notes)
• Lecture audio avec curseur en temps réel
• Métronome + mode entraînement automatique
• Gammes avec lecteur note-par-note
• Parcours complet du débutant à l'avancé

VERSION DÉMO: Entièrement GRATUITE
VERSION PRO: 3,99€ paiement unique

Téléchargez GRATUITEMENT pour essayer!
Disponible [DATE] sur App Store et Google Play."
```

### Assets Required
- 📸 Icon 1024x1024 (sans transparence)
- 📱 3-4 screenshots clés
- 🎨 Logo pour réseaux sociaux
- 🎵 Jingle court (optionnel)

---

## 📋 **Checklist Technique (iOS + Android)**

### Phase 1: Setup (Début juillet)
```
☐ Installer Capacitor CLI
☐ npm install @capacitor/core @capacitor/cli
☐ npx cap init (bundleId: com.cedm4.dicopattern)
☐ Générer ios/ et android/ folders
☐ Tester sur émulateurs
```

### Phase 2: Feature Native (Semaine 2 juillet)
```
☐ Ajouter Push Notifications (évite rejet Apple)
  - Notifications pour rappels d'entraînement
  - Optionnel au premier lancement
☐ Tester permissions
☐ Vérifier offline mode
```

### Phase 3: Build Simultanée (Semaine 3 juillet)
```
iOS:
☐ Ouvrir Xcode
☐ Générer certificats de signature
☐ Configurer provisioning profiles
☐ Build pour Device + Simulator
☐ Test sur iPhone réel

Android:
☐ Ouvrir Android Studio
☐ Générer clés de signature
☐ Build APK + AAB
☐ Test sur Android réel + émulateur
```

### Phase 4: Assets & Submission (Semaine 4 juillet)

**App Store (iOS)**
```
☐ Icon 1024x1024
☐ Screenshots (2-5):
  - Pattern example
  - Progress tracking
  - Métronome
☐ Description (80-170 chars):
  "Dictionnaire interactif de patterns guitare 
   avec lecture audio et métronome. 
   Version démo gratuite, accès complet en PRO."
☐ Preview text (30 chars):
  "Learn guitar patterns interactively"
☐ Mots-clés: guitar, pattern, learning, métronome
☐ Support URL: roustella@gmail.com
☐ Privacy Policy: [voir ci-dessus]
☐ Category: Education
☐ Content Rating Form (simple questionnaire)
```

**Google Play (Android)**
```
☐ Icon 512x512
☐ Screenshots (4-8):
  - Parcours overview
  - Pattern playback
  - Progress grid
  - Métronome
☐ Short description (80 chars):
  "Interactive guitar pattern dictionary"
☐ Full description (4000 chars max):
  Features list + pricing model
☐ Graphics (optionnel):
  - Feature graphic (1024x500)
  - Banner (512x268)
☐ Privacy Policy: [voir ci-dessus]
☐ Permissions déclarées claires
☐ Pricing: Free (démo) + 3,99€ (Pro)
☐ Content Rating: ESRB Everyone
```

---

## ⏰ **Timeline Juillet 2026**

```
SEMAINE 1 (1-7 juillet)
│
├─ Lun-Mar: Setup Capacitor + émulateurs
├─ Mer-Jeu: Feature native (notifications)
├─ Ven: Tests émulateurs complets
│
├─ Podcast episode enregistré (avant)
└─ Assets finalisés

SEMAINE 2 (8-14 juillet)
│
├─ Lun-Mar: Build iOS (Xcode)
├─ Mer: Build Android (Android Studio)
├─ Jeu-Ven: Test sur devices réels
│
└─ Corrections bugs si nécessaire

SEMAINE 3 (15-21 juillet)
│
├─ Lun: Screenshots et descriptions finales
├─ Mar-Mer: Soumission App Store
├─ Jeu: Soumission Google Play
│
├─ Podcast episode live (annonce)
└─ Attendre review Apple (3-7 jours)

SEMAINE 4 (22-31 juillet)
│
├─ Apple review + réponses éventuelles
├─ Google Play: acceptation (24-48h)
│
└─ 🚀 LANCEMENT! (fin juillet si tout OK)
```

---

## 🎯 **Before Launch Checklist**

### App Completion
```
Patterns:
☐ Tous les patterns testés (pas de bugs)
☐ Tablatures correctes
☐ Audio playback OK

Gammes:
☐ Collection complète
☐ Lecture note-par-note stable
☐ Format ASCII validé

UI/UX:
☐ Icons app natives (512x512)
☐ Splash screen
☐ Contraste texte OK (accessibility)
☐ Testé sur iPhone + Android réels

Performance:
☐ Pas de lags en lecture
☐ Offline mode fonctionne
☐ Storage local OK
☐ Battery: pas de drain excessif
```

### Marketing
```
☐ Podcast episode enregistré
☐ Description App Store/Play rédigée
☐ Mots-clés sélectionnés
☐ Screenshots préparés
☐ Privacy Policy finalisée
☐ Support email défini: roustella@gmail.com
```

### Legal/Admin
```
☐ Compte Apple Developer ($99)
☐ Compte Google Play Developer ($25)
☐ BundleID: com.cedm4.dicopattern
☐ Privacy Policy
☐ Email de contact
```

---

## 💰 **Budget Estimé**

| Poste | Coût |
|-------|------|
| Apple Developer (1 an) | 99€ |
| Google Play (one-time) | 25€ |
| Certificats/provisioning | 0€ (gratuit) |
| Développement Capacitor | 0€ (DIY) |
| **Total Année 1** | **124€** |
| **Revenu potentiel** | 3,99€ × N utilisateurs |

---

## 🔗 **Links Important**

- [Apple Developer](https://developer.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

---

## ✅ **Success Metrics**

Après lancement, tracker:
```
☐ Downloads totaux
☐ Ratio demo → pro conversions
☐ Ratings moyens (App Store + Play)
☐ Retention (combien reviennent après 1 mois)
☐ Crash reports
☐ Feedback utilisateurs
```

---

**Next Step:** Créer scheduled task pour juillet 2026 ⏰
