import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bulb, calendar, construct, ellipsisHorizontal, location, trash, water } from 'ionicons/icons';

import {
  CategorieSignalement,
  LIBELLES_CATEGORIE,
} from '../../core/models/signalement.model';
import {
  formaterCoordonnees,
  formaterDateLongue,
} from '../../core/models/signalement.format';
import { SignalementService } from '../../core/services/signalement.service';
import { StatutChipComponent } from '../../shared/components/statut-chip/statut-chip.component';

const ICONE_CATEGORIE: Record<CategorieSignalement, string> = {
  voirie: 'construct',
  dechets: 'trash',
  eclairage: 'bulb',
  eau: 'water',
  autre: 'ellipsis-horizontal',
};

/** Nombre de caracteres au-dela duquel la description est repliee. */
const SEUIL_REPLI = 180;

@Component({
  selector: 'app-signalement-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'signalement-detail.page.html',
  styleUrls: ['signalement-detail.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    StatutChipComponent,
  ],
})
export class SignalementDetailPage {
  private readonly signalementService = inject(SignalementService);

  /** Parametre `:id` de la route, lie automatiquement par le routeur. */
  readonly id = input.required<string>();

  readonly signalement = computed(() => this.signalementService.trouver(this.id()));

  readonly descriptionDepliee = signal(false);

  readonly categorie = computed(() => {
    const signalement = this.signalement();
    return signalement ? LIBELLES_CATEGORIE[signalement.categorie] : '';
  });

  readonly icone = computed(() => {
    const signalement = this.signalement();
    return signalement ? ICONE_CATEGORIE[signalement.categorie] : 'ellipsis-horizontal';
  });

  readonly date = computed(() => {
    const signalement = this.signalement();
    return signalement ? formaterDateLongue(signalement.dateCreation) : '';
  });

  readonly coordonnees = computed(() => {
    const signalement = this.signalement();
    return signalement
      ? formaterCoordonnees(signalement.latitude, signalement.longitude)
      : '';
  });

  /** Vrai si la description est assez longue pour meriter un repli. */
  readonly descriptionLongue = computed(
    () => (this.signalement()?.description.length ?? 0) > SEUIL_REPLI,
  );

  deplierDescription(): void {
    this.descriptionDepliee.set(true);
  }

  constructor() {
    addIcons({ construct, trash, bulb, water, ellipsisHorizontal, calendar, location });
  }
}
