/** Categories possibles pour un signalement. */
export const CATEGORIES_SIGNALEMENT = [
  'voirie',
  'dechets',
  'eclairage',
  'eau',
  'autre',
] as const;

export type CategorieSignalement = (typeof CATEGORIES_SIGNALEMENT)[number];

/** Libelles affichables des categories. */
export const LIBELLES_CATEGORIE: Record<CategorieSignalement, string> = {
  voirie: 'Voirie',
  dechets: 'Déchets',
  eclairage: 'Éclairage',
  eau: 'Eau',
  autre: 'Autre',
};

/** Cycle de vie d'un signalement. */
export const STATUTS_SIGNALEMENT = ['nouveau', 'en_cours', 'resolu'] as const;

export type StatutSignalement = (typeof STATUTS_SIGNALEMENT)[number];

/** Libelles affichables des statuts. */
export const LIBELLES_STATUT: Record<StatutSignalement, string> = {
  nouveau: 'Nouveau',
  en_cours: 'En cours',
  resolu: 'Résolu',
};

/** Un signalement remonte par un citoyen. */
export interface Signalement {
  id: string;
  titre: string;
  description: string;
  categorie: CategorieSignalement;
  statut: StatutSignalement;
  /**
   * Photo encodee en data URI base64 (`data:image/jpeg;base64,...`).
   * Ne jamais y stocker le `webPath` de @capacitor/camera : c'est une URL blob
   * qui ne survit pas au redemarrage de l'application.
   */
  photo?: string;
  latitude: number;
  longitude: number;
  /**
   * Date de creation au format ISO 8601 (`new Date().toISOString()`).
   * Volontairement une chaine et non un `Date` : le modele transite par
   * JSON.stringify/parse (Preferences, localStorage, API) ou un `Date`
   * reviendrait en `string` sans que TypeScript ne le signale.
   */
  dateCreation: string;
}
