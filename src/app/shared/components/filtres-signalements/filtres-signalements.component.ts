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
 * Selection multiple dans chaque famille : aucune etiquette cochee signifie
 * « toutes », ce qui evite d'avoir a cocher les cinq categories pour voir
 * l'ensemble de la liste.
 */
@Component({
  selector: 'app-filtres-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'filtres-signalements.component.html',
  styleUrls: ['filtres-signalements.component.scss'],
})
export class FiltresSignalementsComponent {
  readonly categories = input.required<readonly CategorieSignalement[]>();
  readonly statuts = input.required<readonly StatutSignalement[]>();

  readonly categorieBasculee = output<CategorieSignalement>();
  readonly statutBascule = output<StatutSignalement>();

  readonly toutesCategories = CATEGORIES_SIGNALEMENT;
  readonly tousStatuts = STATUTS_SIGNALEMENT;
  readonly libellesCategorie = LIBELLES_CATEGORIE;
  readonly libellesStatut = LIBELLES_STATUT;

  categorieActive(categorie: CategorieSignalement): boolean {
    return this.categories().includes(categorie);
  }

  statutActif(statut: StatutSignalement): boolean {
    return this.statuts().includes(statut);
  }
}
