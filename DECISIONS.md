# Notes de conception

Les choix non évidents de ce projet, et **pourquoi** ils ont été faits. Chaque
entrée répond à une question qu'un lecteur du code se poserait légitimement.

La seconde moitié du document rassemble les défauts qui ont réellement été
livrés puis corrigés. Ils sont conservés parce qu'ils ont un point commun : le
build était vert à chaque fois.

---

## Données et API

### Le serveur filtre, la vue affiche

Recherche, filtres et pagination sont délégués à `GET /signalements`.

**Pourquoi.** Le serveur seul connaît l'ensemble des données. Filtrer la page
reçue côté client donne des résultats faux dès que la liste dépasse une page :
on filtrerait 20 éléments sur 200.

**Conséquence assumée.** L'API n'accepte **qu'une** catégorie et **qu'un**
statut. Les étiquettes de filtre sont donc à valeur unique par famille, alors
que la spec d'origine demandait une sélection multiple. Le contrat du serveur
l'emporte sur la maquette.

### `dateCreation` est une chaîne, pas un `Date`

Le modèle transite par `JSON.stringify` / `parse`. Un `Date` en reviendrait en
`string` **sans que TypeScript ne le signale** : le type mentirait, et le
premier `.toLocaleDateString()` planterait à l'exécution.

### L'en-tête `X-Trainee` est posé par un intercepteur

Et non dans chaque appel. Un oubli ne se serait vu qu'au moment où l'on aurait
écrit dans le jeu commun `demo`, partagé par toute la promotion.

---

## Mode hors-ligne

### La règle anti-doublon

`POST /signalements` **n'est pas idempotent** et l'API n'accepte aucune clé
d'idempotence (vérifié dans l'OpenAPI). Si la requête atteint le serveur mais
que la réponse se perd — un tunnel suffit — un réessai crée un second
signalement identique.

| Situation | Décision |
| --- | --- |
| Statut 0 — la requête n'est jamais partie | Le serveur n'a rien vu. Réessai sûr, l'entrée reste en file. |
| Toute réponse reçue, 4xx et 5xx compris | Le serveur a peut-être enregistré. L'entrée passe en échec, **l'utilisateur décide**. |

Réessayer automatiquement dans le second cas serait plus confortable et
fabriquerait des doublons dans le dos de l'utilisateur.

### `@capacitor/preferences` et non `localStorage`

Sur mobile, le système peut vider `localStorage` quand l'espace manque.
`SharedPreferences` (Android) et `UserDefaults` (iOS) ne sont pas purgés. Pour
des signalements en attente d'envoi, c'est la différence entre « différé » et
« perdu ».

### Le cache affiche sa date, et n'est pas servi sous filtre

Une liste datée vaut mieux qu'un écran vide, **à condition de dire qu'elle est
datée** : sans la date, l'utilisateur croit consulter l'état courant. C'est la
différence entre « hors ligne » et « faux ».

Et le cache ne contient que la liste **non filtrée**. La servir en réponse à un
filtre ferait croire que tout y correspond.

### Le plafond de la file est en octets

20 entrées *et* 5 Mo. Un plafond exprimé en nombre d'entrées serait inopérant :
une seule photo non compressée suffit à saturer. `SharedPreferences` est chargé
en mémoire au démarrage de l'application.

### Une carte en attente n'est pas cliquable

Elle n'existe pas encore côté serveur : elle n'a pas de détail à ouvrir. Elle
n'affiche pas non plus d'étiquette de statut — en inventer un serait une
information fausse.

---

## Interface

### Le mode sombre passe par une classe, pas une media query

Une media query ne se désactive pas. Un utilisateur dont le téléphone est en
sombre mais qui veut du clair n'aurait jamais pu l'obtenir. `ThemeService` pose
`.ion-palette-dark` sur `<html>`.

### La couleur seule ne porte jamais l'information

Chaque statut écrit son libellé. Indispensable pour les daltonismes, et pour la
lecture en plein soleil — qui est le contexte d'usage de cette application.

### Les étiquettes de statut ont un texte légèrement décalé

Le fond teinté à 12 % avec le texte en couleur pleine échouait à 4,5:1 dans
trois cas sur six (texte de 13 px = petit texte). Le texte est ajusté de 3 à
13 % ; la couleur d'identité du statut reste intacte. Tokens séparés :
`--app-color-status-*` pour l'identité, `*-on-bg` pour le texte.

### Un réglage qui ne fait rien a été retiré

« Suivi de mes signalements » supposait une infrastructure de notification qui
n'existe pas. Dans une application de démonstration, un réglage qui ment se
remarque.

### La carte : Leaflet plutôt que MapLibre GL

Les deux sont libres et sérieux. Comparaison faite pour **ce** projet :

| | Leaflet 1.9 | MapLibre GL |
| --- | --- | --- |
| Rendu | Tuiles raster, DOM/canvas | Tuiles vectorielles, WebGL |
| Poids transféré | **41 ko** (mesuré, chunk différé) | ~200 ko |
| Fond de carte sans clé | OpenStreetMap directement | OpenFreeMap, ou une clé |
| Avantage décisif | Poids, robustesse sur bas de gamme | Des milliers de points, 3D, rotation |

À quelques centaines de signalements, l'avantage GPU de MapLibre ne se voit
pas ; son poids, si. L'utilisateur est dehors avec une connexion instable :
c'est le poids qui compte. **MapLibre redeviendrait le bon choix** au-delà de
quelques milliers de marqueurs, ou si une vue 3D était demandée.

Décisions qui accompagnent ce choix :

- **`@defer`** : Leaflet et sa feuille de style ne sont pas téléchargés tant
  que l'utilisateur n'ouvre pas la carte. Le bundle initial est inchangé —
  194,04 ko avant, 194,04 ko après.
- **`preferCanvas: true`** : les marqueurs sont dessinés dans un seul canvas au
  lieu d'un élément SVG chacun. Coût nul en dessous de quelques centaines de
  points, gain net au-delà.
- **Pas de surcouche Angular** (`ngx-leaflet` et consorts) : une dépendance de
  moins à suivre, et l'API impérative de Leaflet se prête mal à
  l'encapsulation.
- **`ViewEncapsulation.None`** : la feuille de Leaflet cible des éléments qu'il
  crée lui-même, hors de portée des styles encapsulés. La déclarer dans le
  composant plutôt que globalement la garde dans le morceau différé.
- **L'import ESM a été essayé puis écarté** : `leaflet/dist/leaflet-src.esm.js`
  économise 1,3 ko transférés, au prix d'un alias `paths` dans `tsconfig` qui
  casserait si Leaflet réorganise son `dist`. `allowedCommonJsDependencies` est
  le mécanisme documenté, et le chunk ne se charge qu'une fois.
- **Budget `anyComponentStyle` relevé à 16/24 ko** : `leaflet.css` pèse 11,6 ko
  et vit dans un composant *par conception*. C'est un seuil déplacé pour une
  feuille tierce, pas pour excuser notre propre CSS.

**Le type `PointCarte` vit dans son propre fichier**, pas à côté du composant.
L'importer depuis le fichier du composant crée une référence statique qui
**annule le `@defer`** : Leaflet retombe dans le morceau de la page, sans
erreur ni avertissement. Mesuré quand c'est arrivé : la page est passée de 8 à
49 ko transférés, et le morceau différé a simplement disparu de la sortie de
build.

`npm run verify:defer` garde désormais ce point : il lit les tailles de morceaux
de la sortie de build, exige la présence du morceau de la carte, et refuse que
la page de liste dépasse 20 ko transférés. Vérifié en reproduisant l'erreur —
les deux contrôles se déclenchent et le script sort en échec.

Attention : la [politique d'usage des tuiles
OSM](https://operations.osmfoundation.org/policies/tiles/) exige l'attribution
(elle est affichée) et interdit un usage massif en production. Pour une vraie
mise en production, il faudrait un fournisseur de tuiles dédié.

---

## Défauts livrés, puis corrigés

Tous avaient un build vert, un lint propre et des tests au vert.

### La palette sombre amputée de 41 paliers

En désactivant `dark.system.css` pour éviter qu'il n'écrase mes tokens, j'ai
emporté les 41 paliers dérivés (`--ion-background-color-step-*`,
`--ion-text-color-step-*`) dont dépendent **37 composants Ionic**. Les titres de
section de Réglages tombaient à 1,1:1, illisibles.

**Révélé par** une capture d'écran. **Leçon** : la palette d'Ionic est une
fondation, pas une concurrente. On la charge et on surcharge par-dessus.

### Le titre collé au bord, puis sous le bouton retour

En mode iOS, `ion-title` est **sorti du flux** pour rester centré. Le
`--padding-start` de la barre ne l'atteint donc pas. Premier correctif : posé
sur la barre, sans effet. Deuxième : `padding-inline: 0` sur le titre, qui l'a
envoyé sous le bouton « Retour ».

**Révélé par** deux séries de captures. **Leçon** : un positionnement raisonné
sans être vu est une hypothèse, pas un correctif.

### La liste qui ne se rafraîchissait pas

`IonicRouteStrategy` garde les pages montées pour animer le retour. Ni le
constructeur ni `ngOnInit` ne rejouent. Un signalement créé depuis l'onglet
« Nouveau » n'apparaissait qu'après avoir touché un filtre.

**Correctif** : `ionViewWillEnter`. **Leçon** : le cycle de vie d'Ionic n'est
pas celui d'Angular.

### `routerDirection` inerte

`IonRouterLink` vise `:not(a)[routerLink]`, `IonRouterLinkWithHref` vise
`a[routerLink]`. Avec le mauvais, l'attribut ne fait rien — sans la moindre
erreur à l'exécution.

**Révélé par** l'avertissement `NG8113` du compilateur Angular.

### Le proxy Capacitor dans le conteneur d'injection

Angular appelle `ngOnDestroy()` sur les valeurs fournies qui en possèdent une.
Un proxy Capacitor répond à **n'importe quel** nom de propriété : la destruction
de l'injecteur partait en `Network.ngOnDestroy() is not implemented on web`.

**Correctif** : le jeton expose un objet qui délègue, jamais le proxy.
**Révélé par** l'écriture d'un test.

### La course entre requêtes

Deux lectures concurrentes : la plus lente arrivait en dernier et écrasait la
plus récente. Chaque frappe dans la recherche pouvait afficher un résultat
périmé. Chaque lecture porte désormais un numéro de séquence.

### La carte : trois défauts de conception d'un coup

Livrés ensemble, trouvés en relecture :

1. **La carte affichait une page, pas les signalements.** Elle était branchée
   sur la liste paginée. Un point manquant sur une carte ne se perçoit pas,
   contrairement à une liste tronquée où l'on sent qu'on cesse de défiler.
   Corrigé par `listerTout()`, qui parcourt les pages jusqu'au total.
2. **Deux interactions sur le même geste.** `bindPopup` ouvrait l'infobulle et
   un `on('click')` naviguait simultanément : l'infobulle n'était jamais
   lisible. Or elle portait le libellé du statut — la règle « jamais la couleur
   seule » n'était donc **pas** respectée sur la carte, alors que le commit
   affirmait le contraire. L'infobulle est désormais seule à réagir, avec un
   bouton « Ouvrir » explicite.
3. **Recadrage à chaque rechargement.** `fitBounds` se rejouait dès que les
   données changeaient, et `charger()` produit un nouveau tableau à chaque
   entrée dans la vue. L'utilisateur perdait sa position dès qu'il revenait sur
   l'onglet. Le cadrage ne se rejoue plus que si l'ensemble des identifiants
   change.

### La course entre requêtes, réintroduite à côté du correctif

Le chargeur de carte a été écrit sans garde de séquence, alors que le
chargeur de liste en avait une **quinze lignes plus haut dans le même
fichier**. Mesuré : la réponse lente l'emportait. Et c'était pire que sur la
liste, `listerTout()` enchaînant plusieurs requêtes.

**Leçon** : un correctif local ne se propage pas seul. La garde est désormais
un objet nommé, `Sequenceur`, avec son propre test — pour qu'elle se réutilise
au lieu de se re-découvrir.

### La boucle de réessai infinie

**38 requêtes POST en 60 ms** pour une seule entrée en échec. Deux causes
cumulées : `synchroniser()` ne sautait pas les entrées déjà en échec, et l'effet
lisait le signal que la synchronisation écrivait elle-même.

Le plus grave n'est pas le martèlement : c'est que ce code **fabriquait
exactement les doublons** que la politique documentée trois paragraphes plus
haut prétendait écarter. La règle était écrite, le code ne l'appliquait pas.

**Correctif** : filtre sur l'état, et `untracked()` dans l'effet. Les deux
moitiés sont couvertes par des tests vérifiés par mutation.

### Un test au nom mensonger

Le test « marque en échec sans réessayer » était vert : il n'attendait que deux
macrotâches, et la boucle démarrait après. Il mesurait l'instant où le
comportement était encore correct.

**Leçon** : un test vert qui porte un nom de garantie est pire qu'une absence de
test — il donne confiance.

---

## Ce qui reste non vérifié

- **Rien n'a jamais tourné sur un appareil.** Caméra, géolocalisation,
  permissions natives, transitions, mode hors-ligne : tout est validé par des
  tests à doublures.
- **La compression photo n'a aucun test** : jsdom n'a pas de canvas, le code y
  emprunte systématiquement le chemin de repli.
- **Le rendu des marqueurs de la carte n'est pas couvert**, pour la même
  raison. Installer le paquet `canvas` ferait entrer une dépendance native
  dans le projet pour un gain limité.
- **Aucun test ne touche la vraie API.** Le contrat HTTP est verrouillé contre
  des réponses que nous écrivons nous-mêmes.
