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
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircle,
  bulb,
  createOutline,
  trashOutline,
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
  LIBELLES_STATUT,
  STATUTS_SIGNALEMENT,
  Signalement,
  StatutSignalement,
} from '../../core/models/signalement.model';
import {
  formaterCoordonnees,
  formaterDateLongue,
} from '../../core/models/signalement.format';
import { SignalementService } from '../../core/services/signalement.service';
import {
  BrouillonSignalement,
  FormulaireSignalementComponent,
} from '../../shared/components/formulaire-signalement/formulaire-signalement.component';
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
    IonButton,
    IonSpinner,
    IonModal,
    StatutChipComponent,
    FormulaireSignalementComponent,
  ],
})
export class SignalementDetailPage {
  private readonly signalementService = inject(SignalementService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly navController = inject(NavController);

  /** Parametre `:id` de la route, lie automatiquement par le routeur. */
  readonly id = input.required<string>();

  readonly signalement = signal<Signalement | undefined>(undefined);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly descriptionDepliee = signal(false);

  /** Une action d'ecriture est en cours : on desactive les commandes. */
  readonly actionEnCours = signal(false);
  readonly editionOuverte = signal(false);

  readonly tousStatuts = STATUTS_SIGNALEMENT;
  readonly libellesStatut = LIBELLES_STATUT;

  /** Valeurs passees au formulaire d'edition. */
  readonly valeursEdition = computed<BrouillonSignalement | undefined>(() => {
    const signalement = this.signalement();
    if (!signalement) {
      return undefined;
    }
    const { titre, categorie, description, photo, latitude, longitude } = signalement;
    return { titre, categorie, description, photo, latitude, longitude };
  });

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
      createOutline,
      trashOutline,
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

  /**
   * Change le statut. PATCH d'un seul champ : on n'ecrase pas le reste avec
   * des valeurs qui pourraient etre perimees.
   */
  async changerStatut(statut: StatutSignalement): Promise<void> {
    const signalement = this.signalement();
    if (!signalement || signalement.statut === statut || this.actionEnCours()) {
      return;
    }

    this.actionEnCours.set(true);
    try {
      const modifie = await this.signalementService.modifier(signalement.id, {
        statut,
      });
      this.signalement.set(modifie);
      await this.annoncer(`Statut : ${LIBELLES_STATUT[statut]}.`, 'success');
    } catch (erreur) {
      await this.annoncer(this.message(erreur, 'Le statut n\'a pas pu être changé.'), 'danger');
    } finally {
      this.actionEnCours.set(false);
    }
  }

  ouvrirEdition(): void {
    this.editionOuverte.set(true);
  }

  fermerEdition(): void {
    this.editionOuverte.set(false);
  }

  async enregistrerEdition(brouillon: BrouillonSignalement): Promise<void> {
    const signalement = this.signalement();
    if (!signalement) {
      return;
    }
    try {
      const modifie = await this.signalementService.modifier(signalement.id, brouillon);
      this.signalement.set(modifie);
      this.fermerEdition();
      await this.annoncer('Signalement modifié.', 'success');
    } catch (erreur) {
      // La modale reste ouverte, la saisie est conservee.
      await this.annoncer(this.message(erreur, 'La modification a échoué.'), 'danger');
    }
  }

  /** Suppression, precedee d'une confirmation : l'action est irreversible. */
  async demanderSuppression(): Promise<void> {
    const alerte = await this.alertController.create({
      header: 'Supprimer ce signalement ?',
      message: 'Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: () => void this.supprimer(),
        },
      ],
    });
    await alerte.present();
  }

  private async supprimer(): Promise<void> {
    const signalement = this.signalement();
    if (!signalement) {
      return;
    }

    this.actionEnCours.set(true);
    try {
      await this.signalementService.supprimer(signalement.id);
      await this.navController.navigateBack('/tabs/signalements');
      await this.annoncer('Signalement supprimé.', 'success');
    } catch (erreur) {
      await this.annoncer(this.message(erreur, 'La suppression a échoué.'), 'danger');
    } finally {
      this.actionEnCours.set(false);
    }
  }

  private message(erreur: unknown, defaut: string): string {
    return erreur instanceof Error ? erreur.message : defaut;
  }

  private async annoncer(message: string, couleur: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: couleur,
    });
    await toast.present();
  }

  deplierDescription(): void {
    this.descriptionDepliee.set(true);
  }
}
