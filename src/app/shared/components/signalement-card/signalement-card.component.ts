import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bulb, construct, ellipsisHorizontal, trash, water } from 'ionicons/icons';

import {
  CategorieSignalement,
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
  Signalement,
} from '../../../core/models/signalement.model';
import { formaterDateCourte } from '../../../core/models/signalement.format';
import { StatutChipComponent } from '../statut-chip/statut-chip.component';

/** Icone de repli quand le signalement n'a pas de photo. */
const ICONE_CATEGORIE: Record<CategorieSignalement, string> = {
  voirie: 'construct',
  dechets: 'trash',
  eclairage: 'bulb',
  eau: 'water',
  autre: 'ellipsis-horizontal',
};

/**
 * Carte d'un signalement dans une liste.
 *
 * Toute la carte est tactile et mene au detail. Elle est annoncee d'un seul
 * tenant par les lecteurs d'ecran : titre, statut, categorie puis date.
 */
@Component({
  selector: 'app-signalement-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'signalement-card.component.html',
  styleUrls: ['signalement-card.component.scss'],
  imports: [RouterLink, IonIcon, StatutChipComponent],
})
export class SignalementCardComponent {
  readonly signalement = input.required<Signalement>();

  /** Cible de navigation, fournie par l'ecran appelant. */
  readonly lien = input.required<unknown[]>();

  readonly categorie = computed(
    () => LIBELLES_CATEGORIE[this.signalement().categorie],
  );

  readonly icone = computed(() => ICONE_CATEGORIE[this.signalement().categorie]);

  readonly date = computed(() =>
    formaterDateCourte(this.signalement().dateCreation),
  );

  /** Annonce vocale de la carte entiere, titre en tete. */
  readonly resume = computed(() => {
    const signalement = this.signalement();
    return `${signalement.titre}. ${LIBELLES_STATUT[signalement.statut]}, ${this.categorie()}, ${this.date()}.`;
  });

  constructor() {
    addIcons({ construct, trash, bulb, water, ellipsisHorizontal });
  }
}
