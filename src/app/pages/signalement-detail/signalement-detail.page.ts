import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  bulb,
  calendar,
  construct,
  ellipsisHorizontal,
  location,
  trash,
  water,
} from 'ionicons/icons';

import {
  CategorieSignalement,
  LIBELLES_CATEGORIE,
  Signalement,
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
    IonSpinner,
    StatutChipComponent,
  ],
})
export class SignalementDetailPage {
  private readonly signalementService = inject(SignalementService);

  /** Parametre `:id` de la route, lie automatiquement par le routeur. */
  readonly id = input.required<string>();

  readonly signalement = signal<Signalement | undefined>(undefined);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly descriptionDepliee = signal(false);

  private detruit = false;

  readonly categorie = computed(() => {
    const signalement = this.signalement();
    return signalement ? LIBELLES_CATEGORIE[signalement.categorie] : '';
  });

  readonly icone = computed(() => {
    const signalement = this.signalement();
    return signalement
      ? ICONE_CATEGORIE[signalement.categorie]
      : 'ellipsis-horizontal';
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

  constructor() {
    addIcons({
      construct,
      trash,
      bulb,
      water,
      ellipsisHorizontal,
      calendar,
      location,
      alertCircle,
    });
    inject(DestroyRef).onDestroy(() => (this.detruit = true));

    // Recharge des que l'identifiant de route change : le composant est
    // reutilise par Ionic quand on navigue d'un detail a un autre.
    effect(() => {
      const id = this.id();
      void this.charger(id);
    });
  }

  async charger(id: string): Promise<void> {
    this.chargement.set(true);
    this.erreur.set(null);
    this.descriptionDepliee.set(false);

    const identifiant = Number(id);
    if (!Number.isInteger(identifiant)) {
      // Inutile d'interroger l'API avec un NaN : l'URL est deja invalide.
      this.signalement.set(undefined);
      this.erreur.set(`« ${id} » n'est pas une référence de signalement valide.`);
      this.chargement.set(false);
      return;
    }

    try {
      const signalement = await this.signalementService.trouver(identifiant);
      if (!this.detruit) {
        this.signalement.set(signalement);
      }
    } catch (erreur) {
      if (!this.detruit) {
        this.signalement.set(undefined);
        this.erreur.set(
          erreur instanceof Error
            ? erreur.message
            : 'Le signalement n\'a pas pu être chargé.',
        );
      }
    } finally {
      if (!this.detruit) {
        this.chargement.set(false);
      }
    }
  }

  reessayer(): void {
    void this.charger(this.id());
  }

  deplierDescription(): void {
    this.descriptionDepliee.set(true);
  }
}
