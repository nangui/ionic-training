/** Categories possibles pour un signalement. */
export const CATEGORIES_SIGNALEMENT = [
  'voirie',
  'dechets',
  'eclairage',
  'eau',
  'autre',
] as const;

export type CategorieSignalement = (typeof CATEGORIES_SIGNALEMENT)[number];

/** Cycle de vie d'un signalement. */
export const STATUTS_SIGNALEMENT = ['nouveau', 'en_cours', 'resolu'] as const;

export type StatutSignalement = (typeof STATUTS_SIGNALEMENT)[number];

/** Un signalement remonte par un citoyen. */
export interface Signalement {
  id: string;
  titre: string;
  description: string;
  categorie: CategorieSignalement;
  statut: StatutSignalement;
  /** Image encodee en base64 ou URI renvoyee par la camera. */
  photo?: string;
  latitude: number;
  longitude: number;
  dateCreation: Date;
}
