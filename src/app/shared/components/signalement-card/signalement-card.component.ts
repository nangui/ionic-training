import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon, IonRouterLinkWithHref } from '@ionic/angular';
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
  // IonRouterLinkWithHref et non IonRouterLink : le premier vise
  // « a[routerLink] », le second « :not(a)[routerLink] ». La carte est une
  // ancre, donc sans ce choix routerDirection resterait un attribut inerte.
  imports: [RouterLink, IonRouterLinkWithHref, IonIcon, StatutChipComponent],
})
export class SignalementCardComponent {
  readonly signalement = input.required<Signalement>();

  /**
   * Cible de navigation. Absente pour un signalement en attente d'envoi :
   * il n'existe pas encore cote serveur, il n'a donc pas de detail a
   * ouvrir. La carte cesse alors d'etre un lien.
   */
  readonly lien = input<unknown[] | undefined>(undefined);

  /** Mention affichee a la place de la date, ex. « En attente d'envoi ». */
  readonly mention = input<string | undefined>(undefined);

  /**
   * Masque l'etiquette de statut. Un signalement pas encore envoye n'a
   * aucun statut serveur : en afficher un serait inventer une information.
   */
  readonly afficherStatut = input(true);

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
