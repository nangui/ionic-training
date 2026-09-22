# Signalements — projet fil rouge

Application mobile de signalement de problèmes urbains à Dakar : nids-de-poule,
dépôts d'ordures, éclairage en panne, fuites d'eau.

Support de la formation **« Développer des applications mobiles hybrides avec
Angular et Ionic »**. Le code est écrit pour être lu : les choix non évidents
sont commentés à l'endroit où ils s'appliquent, et les décisions de design
renvoient aux contraintes d'usage qui les motivent.

## Le contexte d'usage, qui dicte le reste

L'utilisateur est **debout, dehors, en plein soleil, souvent à une main, avec
une connexion instable**. Presque toutes les décisions d'interface en
découlent : contrastes élevés vérifiés au ratio WCAG, cibles tactiles de 48 px
minimum, action principale en bas d'écran à portée du pouce, et tolérance à
l'absence de réseau.

Le parcours principal tient en trois gestes : **ouvrir, photographier, envoyer**.

## Démarrer

```bash
npm install
npm start          # http://localhost:4200
```

### Configurer votre jeu de données

L'API isole chaque participant par un en-tête `X-Trainee`. **Mettez votre
prénom** dans `src/environments/environment.ts` :

```ts
export const environment = {
  apiUrl: 'https://setal-api-formation-production.up.railway.app',
  trainee: 'VotrePrenom',   // ← ici
};
```

Sans cette étape, vous travaillez sur le jeu commun `demo`, partagé par toute
la promotion. Au premier appel, un participant inconnu reçoit automatiquement
une copie du jeu initial : votre liste est pleine dès le départ.

Le bouton **Réglages → Données → Restaurer le jeu initial** remet tout à zéro.

### Lancer sur un appareil

```bash
npm run build:android && npx cap run android
npm run build:ios     && npx cap run ios
```

En développement quotidien, le rechargement à chaud évite le cycle complet :

```bash
ionic cap run android -l --external
```

> `npx cap run` lance `sync` mais **pas** le build Angular. Sans `npm run
> build:*` devant, vous déployez le contenu de `www/` tel qu'il était au
> dernier build — c'est la cause n°1 de « mes modifications n'apparaissent pas ».

## Commandes

| Commande | Effet |
| --- | --- |
| `npm start` | Serveur de développement |
| `npm run build` | Build web dans `www/` |
| `npm run build:android` / `:ios` / `:mobile` | Build web + `cap sync` |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | **Types de tout `src/`**, y compris les fichiers pas encore importés |

`npm run typecheck` n'est pas redondant avec `npm run build` : le build ne
vérifie que les fichiers atteints depuis `main.ts`. Un nouveau service jamais
importé peut contenir n'importe quoi et passer le build sans un mot.

## Architecture

```
src/app/
├── core/
│   ├── models/        Types métier, formatage, compression d'image
│   └── services/      API, réseau, thème, intercepteur X-Trainee
├── pages/
│   ├── signalements/       Liste : recherche, filtres, pagination
│   ├── signalement-detail/ Détail, route /tabs/signalements/:id
│   ├── nouveau/            Formulaire de création
│   └── reglages/           Préférences
├── shared/components/ Carte, étiquette de statut, formulaire, filtres,
│                      barre de recherche, bannière, squelette
├── tabs/              Barre d'onglets et routes
└── theme/             Design tokens (voir plus bas)
```

**État en signaux.** Les écrans exposent leur état en `signal`, et ce que la
vue affiche en `computed`. Pas de `BehaviorSubject`, pas de `async` pipe.

**Le serveur filtre, pas la vue.** Recherche, filtres et pagination sont
délégués à l'API : elle seule connaît l'ensemble des données. Filtrer la page
reçue côté client donnerait des résultats faux dès que la liste dépasse une page.

## Design tokens

Tout est dans `src/theme/variables.scss` : palette, échelle d'espacement 4 pt,
typographie en `rem` pour suivre la taille de police système, rayons, ombre.

Le mode sombre se déclenche par la classe `.ion-palette-dark` posée sur `<html>`
par `ThemeService`, **pas** par une media query — sinon un utilisateur qui veut
du clair alors que son téléphone est en sombre ne pourrait jamais l'obtenir.

Deux pièges documentés dans le fichier, qui ont coûté cher :

1. `dark.class.css` d'Ionic n'apporte pas que des couleurs : il définit
   **41 paliers dérivés** dont dépendent 37 composants. Le retirer rend les
   en-têtes de liste illisibles sur fond sombre.
2. Les correspondances Ionic sont émises **deux fois**, à `:root` et à
   `:root.ion-palette-dark`. Ce n'est pas une redondance : Ionic contient un
   bloc `.ion-palette-dark.md` de spécificité supérieure qui gagnerait sinon.

## Mode hors-ligne

Le parcours ne s'interrompt pas quand le réseau disparaît.

**Création.** Un signalement créé hors ligne est enregistré sur l'appareil
(`@capacitor/preferences`, et non `localStorage` — que le système peut vider
quand l'espace manque) puis envoyé au retour du réseau. Il apparaît en tête de
liste avec la mention « En attente d'envoi », sur une carte volontairement non
cliquable : il n'existe pas encore côté serveur, il n'a pas de détail à ouvrir.

**Lecture.** Quand la lecture échoue, la liste est servie depuis le dernier
instantané connu, **avec sa date**. Sans cette date, l'utilisateur croirait
consulter l'état courant — c'est la différence entre « hors ligne » et « faux ».
Seule la liste non filtrée est mise en cache : la servir en réponse à un filtre
ferait croire que tout y correspond.

**Doublons.** `POST /signalements` n'est pas idempotent et l'API n'accepte
aucune clé d'idempotence. Si la requête atteint le serveur mais que la réponse
se perd, un réessai créerait un second signalement identique. La politique est
donc volontairement prudente :

| Situation | Décision |
| --- | --- |
| Statut 0 — la requête n'est jamais partie | Le serveur n'a rien vu, le réessai est sûr. L'entrée reste en file. |
| Toute réponse reçue, y compris 4xx/5xx | Le serveur a peut-être enregistré. L'entrée passe en échec, l'utilisateur décide. |

Le jour où l'API acceptera une clé d'idempotence, le second cas pourra devenir
un réessai automatique.

## Carte

Un bouton dans l'en-tête bascule entre la liste et la carte. Les deux vues
affichent **le même jeu filtré** : recherche et filtres s'appliquent aux deux.

Leaflet avec les tuiles OpenStreetMap, chargé en `@defer` — ni la
bibliothèque ni sa feuille de style ne sont téléchargées tant que la carte
n'est pas ouverte. Le raisonnement complet du choix est dans
[`DECISIONS.md`](DECISIONS.md).

## API

Documentée par OpenAPI : [`/openapi.json`](https://setal-api-formation-production.up.railway.app/openapi.json)

| Endpoint | Usage |
| --- | --- |
| `GET /signalements` | Liste — `q`, `categorie`, `statut`, `limit`, `offset` |
| `GET /signalements/{id}` | Détail |
| `POST /signalements` | Création |
| `PATCH /signalements/{id}` | Modification |
| `DELETE /signalements/{id}` | Suppression |
| `POST /reset` | Restaure le jeu initial du participant |

Les versions exactes de toutes les dépendances sont dans [`STACK.md`](STACK.md),
et les choix de conception — avec les défauts livrés puis corrigés, et ce qu'ils
ont appris — dans [`DECISIONS.md`](DECISIONS.md).

## Tests

```bash
npm test
```

Ce qui est verrouillé : le contrat HTTP (en-tête d'isolation, critères envoyés,
traduction des erreurs), le comportement des filtres, les états de chargement
et d'erreur, l'anti-rebond de la recherche, la bascule de thème, et la
concurrence des requêtes.

Ce dernier point mérite un mot, parce que c'est un bug que seul un test révèle :
si deux lectures se chevauchent, **la plus lente peut arriver en dernier et
écraser la plus récente**. Chaque lecture porte donc un numéro de séquence.
Retirez la garde dans `charger()` et le test correspondant passe au rouge.
