import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  CATEGORIES_SIGNALEMENT,
  CategorieSignalement,
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
  STATUTS_SIGNALEMENT,
  StatutSignalement,
} from '../../../core/models/signalement.model';

/**
 * Rangee d'etiquettes de filtre, a defilement horizontal.
 *
 * Une seule valeur active par famille, parce que c'est ce que
 * `GET /signalements` accepte : le filtrage est delegue au serveur, seul a
 * connaitre l'ensemble des donnees. Aucune etiquette active signifie
 * « toutes ». Un second appui sur l'etiquette active la retire.
 */
@Component({
  selector: 'app-filtres-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'filtres-signalements.component.html',
  styleUrls: ['filtres-signalements.component.scss'],
})
export class FiltresSignalementsComponent {
  readonly categorie = input.required<CategorieSignalement | undefined>();
  readonly statut = input.required<StatutSignalement | undefined>();

  readonly categorieBasculee = output<CategorieSignalement>();
  readonly statutBascule = output<StatutSignalement>();

  readonly toutesCategories = CATEGORIES_SIGNALEMENT;
  readonly tousStatuts = STATUTS_SIGNALEMENT;
  readonly libellesCategorie = LIBELLES_CATEGORIE;
  readonly libellesStatut = LIBELLES_STATUT;

  categorieActive(categorie: CategorieSignalement): boolean {
    return this.categorie() === categorie;
  }

  statutActif(statut: StatutSignalement): boolean {
    return this.statut() === statut;
  }
}
