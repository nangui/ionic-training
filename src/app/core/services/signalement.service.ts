import { InjectionToken, Injectable, inject } from '@angular/core';

import { Signalement } from '../models/signalement.model';

/**
 * Jeu de donnees en dur, servant de source unique tant qu'il n'y a pas
 * de backend. Les dates sont figees pour que l'affichage reste
 * deterministe d'un lancement a l'autre (et dans les tests).
 */
const SIGNALEMENTS_DEMO: readonly Signalement[] = [
  {
    id: 'sig-001',
    titre: 'Nid-de-poule avenue de la République',
    description:
      "Trou d'environ 40 cm sur la voie de droite, juste avant le feu. Plusieurs deux-roues ont été déviés.",
    categorie: 'voirie',
    statut: 'nouveau',
    latitude: 48.8674,
    longitude: 2.3792,
    dateCreation: '2026-09-19T08:42:00.000Z',
  },
  {
    id: 'sig-002',
    titre: 'Conteneur à verre débordant',
    description:
      'Le conteneur est plein depuis plusieurs jours, les bouteilles sont posées au sol autour du point de collecte.',
    categorie: 'dechets',
    statut: 'en_cours',
    latitude: 48.8712,
    longitude: 2.3641,
    dateCreation: '2026-09-17T17:05:00.000Z',
  },
  {
    id: 'sig-003',
    titre: 'Lampadaire éteint rue des Cascades',
    description:
      "Trois lampadaires consécutifs ne s'allument plus le soir, le trottoir est complètement sombre.",
    categorie: 'eclairage',
    statut: 'resolu',
    latitude: 48.8719,
    longitude: 2.3869,
    dateCreation: '2026-09-12T20:18:00.000Z',
  },
];

/**
 * Latence simulee de la lecture.
 *
 * PLACEHOLDER : represente l'aller-retour reseau a venir. Sans elle les
 * etats de chargement (squelettes, message de connexion lente) seraient du
 * code mort, jamais parcouru. A supprimer le jour ou un vrai appel HTTP
 * prend sa place.
 *
 * Injectable pour que les tests la ramenent a zero : une suite n'a aucune
 * raison de payer un delai decoratif.
 */
export const LATENCE_LECTURE_MS = new InjectionToken<number>('latence de lecture', {
  providedIn: 'root',
  factory: () => 600,
});

/**
 * Acces aux signalements.
 *
 * Aucune requete HTTP a ce stade : les donnees sont en dur et copiees a
 * chaque lecture, pour qu'un appelant qui mute le resultat ne corrompe
 * pas la source. La lecture est neanmoins asynchrone, parce qu'elle le sera
 * toujours une fois branchee sur un backend : autant que les ecrans soient
 * ecrits pour ca des maintenant.
 */
@Injectable({ providedIn: 'root' })
export class SignalementService {
  private readonly latence = inject(LATENCE_LECTURE_MS);

  /** Tous les signalements, du plus recent au plus ancien. */
  async lister(): Promise<Signalement[]> {
    if (this.latence > 0) {
      await new Promise((resoudre) => setTimeout(resoudre, this.latence));
    }
    return this.listerSynchrone();
  }

  /** Meme lecture, sans latence : utilisee par le detail et les tests. */
  listerSynchrone(): Signalement[] {
    // Tri lexicographique direct : les dates sont des ISO 8601, donc leur
    // ordre alphabetique est leur ordre chronologique.
    return SIGNALEMENTS_DEMO.map((signalement) => ({ ...signalement })).sort(
      (a, b) => (a.dateCreation < b.dateCreation ? 1 : -1),
    );
  }

  /** Un signalement par son identifiant, ou `undefined` s'il n'existe pas. */
  trouver(id: string): Signalement | undefined {
    const trouve = SIGNALEMENTS_DEMO.find((signalement) => signalement.id === id);
    return trouve ? { ...trouve } : undefined;
  }
}
