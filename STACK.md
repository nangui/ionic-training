# Stack technique

Versions **réellement installées** dans ce projet (relevées via `npm ls --depth=0`,
`ng version` et `npx cap --version`), et non les plages déclarées dans `package.json`.

Dernière mise à jour : 2026-09-21 — régénérer avec `npm ls --depth=0` après chaque mise à jour de dépendances.

## Framework web

| Paquet | Version |
| --- | --- |
| `@angular/core` | 22.1.7 |
| `@angular/common` | 22.1.7 |
| `@angular/compiler` | 22.1.7 |
| `@angular/forms` | 22.1.7 |
| `@angular/platform-browser` | 22.1.7 |
| `@angular/router` | 22.1.7 |
| `@angular/build` | 22.1.8 |
| `@angular/cli` | 22.1.8 |
| `@angular/compiler-cli` | 22.1.7 |
| `@angular/language-service` | 22.1.7 |
| `@ionic/angular` | 9.0.4 |
| `@ionic/angular-toolkit` | 13.0.0 |
| `ionicons` | 8.1.0 |
| `rxjs` | 7.8.2 |
| `typescript` | 6.0.3 |
| `tslib` | 2.8.1 |

## Capacitor

| Paquet | Version |
| --- | --- |
| `@capacitor/core` | 8.5.2 |
| `@capacitor/cli` | 8.5.2 |
| `@capacitor/android` | 8.5.2 |
| `@capacitor/ios` | 8.5.2 |
| `@capacitor/app` | 8.1.1 |
| `@capacitor/haptics` | 8.0.2 |
| `@capacitor/keyboard` | 8.0.5 |
| `@capacitor/status-bar` | 8.0.3 |

Configuration (`capacitor.config.ts`) : `appId: io.ionic.starter`,
`appName: test-install`, `webDir: www`.

## Outillage de développement

| Outil | Version |
| --- | --- |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| Ionic CLI | 7.2.1 |
| `eslint` | 10.11.0 |
| `angular-eslint` | 22.0.0 |
| `typescript-eslint` | 8.70.0 |
| `vitest` | 4.0.18 |
| `jsdom` | 26.1.0 |

## Plateformes natives

### Android

| Élément | Version |
| --- | --- |
| Gradle wrapper | 8.14.3 |
| JDK | OpenJDK 21.0.11 |
| `minSdkVersion` | 24 |
| `compileSdkVersion` | 36 |
| `targetSdkVersion` | 36 |
| `cordovaAndroidVersion` | 14.0.1 |

Les versions SDK et AndroidX sont centralisées dans `android/variables.gradle`.

### iOS

| Élément | Version |
| --- | --- |
| Xcode | 26.4 |
| SDK simulateur | iOS 26.4 |

Capacitor 8 déclare les plugins iOS via `Package.swift` (Swift Package Manager)
plutôt que via CocoaPods.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm start` | Serveur de développement Angular |
| `npm run build` | Build web dans `www/` |
| `npm run build:android` | Build web + `cap sync android` |
| `npm run build:ios` | Build web + `cap sync ios` |
| `npm run build:mobile` | Build web + `cap sync` (les deux plateformes) |
| `npm run typecheck` | Vérifie les types de **tout** `src/`, y compris les fichiers pas encore importés |
| `npx cap run android` / `ios` | Déploie sur un émulateur/simulateur ou un appareil |
| `npx cap open android` / `ios` | Ouvre Android Studio / Xcode |
| `ionic cap run <platform> -l --external` | Live reload sur l'appareil |
