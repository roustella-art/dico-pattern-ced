# 🚀 Dico Pattern — App Store/Google Play Launch Plan

**Status:** Planning (Lancement prévu fin juillet / début août 2026)
**Last Updated:** 7 juillet 2026

---

## 📊 **Modèle Commercial**

### Abonnement
- **1,99 €/mois**, essai gratuit de **7 jours** (obligatoire côté Apple)
- Paiement via StoreKit (Apple) et Google Billing Library (Android)
- Accès complet à l'app dès la fin de l'essai : catalogue de patterns A (Labo), métronome, journal de progression, challenge quotidien
- Pas de version démo séparée — l'essai de 7 jours tient ce rôle

---

## 📱 **Platforms**

| Platform | Frais | URL |
|----------|-------|-----|
| **App Store (iOS)** | 99€/an | https://developer.apple.com |
| **Google Play (Android)** | 25€ once | https://play.google.com/console |
| **Total année 1** | 124€ | — |

---

## 🔐 **Privacy Policy**

Déjà rédigée et déployée : voir [`privacy.html`](../privacy.html) (hébergée sur GitHub Pages).
Résumé : aucune donnée collectée côté serveur, tout est stocké en local (localStorage), paiement délégué à Apple/Google, partage de presets du Labo par code généré localement (aucun transit serveur).

---

## 📋 **Checklist Technique (iOS + Android)**

### Phase 1: Setup
```
☐ npm init + installer @capacitor/core @capacitor/cli
☐ npx cap init (bundleId à confirmer)
☐ npx cap add ios / npx cap add android
☐ webDir pointé sur les fichiers statiques existants (pas de bundler)
☐ Installer Xcode.app complet + CocoaPods
☐ Installer Android Studio
☐ Tester sur émulateurs
```

### Phase 2: Paiements
```
☐ StoreKit (Swift) : abonnement 1,99€/mois + essai 7 jours
☐ Google Billing Library (Kotlin) : abonnement équivalent
☐ Créer les produits d'abonnement dans App Store Connect / Play Console
☐ Écran d'onboarding paiement/essai
☐ Tester restauration d'achat, annulation, renouvellement
```

### Phase 3: Build & Assets
```
iOS:
☐ Certificats de signature + provisioning profiles
☐ Build Device + Simulator, test sur iPhone réel

Android:
☐ Clés de signature
☐ Build APK + AAB, test sur device réel + émulateur

Assets:
☐ Icône 1024×1024 (actuellement seulement 180/192/512 disponibles)
☐ Screenshots 6.5" et 6.7" (iOS), 4-8 screenshots (Android)
☐ Description App Store (80-170 caractères) + description Google Play (courte + longue)
☐ Mots-clés, Support URL, Category: Music/Education
```

### Phase 4: Soumission
```
☐ Content Rating Form (Apple) / ESRB (Google)
☐ Soumission App Store → review Apple (3-7 jours)
☐ Soumission Google Play → review (24-48h)
☐ Cible : App Store fin juillet 2026, Google Play début août 2026
```

---

## 🎯 **Before Launch Checklist**

```
☐ Patterns testés (audio, tablatures, transposition)
☐ Labo stable (presets, partage par code, épingles)
☐ Journal de progression fiable (streak, calendrier, stats)
☐ Icônes natives complètes (1024, 512, 192, 180)
☐ Contraste texte OK (accessibilité)
☐ Testé sur iPhone + Android réels
☐ Offline mode fonctionne dans la coquille Capacitor
☐ Pas de lags audio, pas de drain batterie excessif
```

---

## 🔗 **Links Important**

- [Apple Developer](https://developer.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Capacitor Docs](https://capacitorjs.com/docs)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

---

## ✅ **Success Metrics**

Après lancement, tracker :
```
☐ Downloads totaux
☐ Taux de conversion essai → abonnement payant
☐ Ratings moyens (App Store + Play)
☐ Rétention (combien reviennent après 1 mois)
☐ Crash reports
☐ Feedback utilisateurs
```
