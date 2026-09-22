import { Signalement } from '../../../core/models/signalement.model';

/**
 * Un point de la carte.
 *
 * Declare a part du composant, et non a cote de lui : importer ce type
 * depuis le fichier du composant creerait une reference statique vers
 * celui-ci, ce qui annulerait le `@defer` de l'ecran appelant - et
 * ferait retomber Leaflet dans le morceau de la page, sans aucune erreur.
 */
export interface PointCarte {
  signalement: Signalement;
  /** Faux pour un signalement pas encore envoye : il n'a pas de detail. */
  ouvrable: boolean;
}
