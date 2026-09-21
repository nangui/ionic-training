import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
  ScrollDetail,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle, funnel, funnelOutline } from 'ionicons/icons';

import { Signalement } from '../../core/models/signalement.model';
import { SignalementService } from '../../core/services/signalement.service';
import {
  BrouillonSignalement,
  FormulaireSignalementComponent,
} from '../../shared/components/formulaire-signalement/formulaire-signalement.component';
import { SignalementCardComponent } from '../../shared/components/signalement-card/signalement-card.component';

/** Amplitude de defilement au-dela de laquelle le bouton flottant s'efface. */
const SEUIL_DEFILEMENT = 24;

@Component({
  selector: 'app-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'signalements.page.html',
  styleUrls: ['signalements.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonModal,
    SignalementCardComponent,
    FormulaireSignalementComponent,
  ],
})
export class SignalementsPage {
  private readonly signalementService = inject(SignalementService);
  private readonly toastController = inject(ToastController);

  /** Etat de la liste. */
  readonly signalements = signal<Signalement[]>([]);

  /** Filtre de l'action secondaire : masquer ou non les signalements resolus. */
  readonly masquerResolus = signal(false);

  /** Le bouton flottant s'efface quand on descend, revient quand on remonte. */
  readonly fabVisible = signal(true);

  readonly modalOuvert = signal(false);

  private dernierDefilement = 0;

  /** Ce que la vue affiche reellement, derive de l'etat et du filtre. */
  readonly signalementsAffiches = computed(() => {
    const tous = this.signalements();
    return this.masquerResolus()
      ? tous.filter((signalement) => signalement.statut !== 'resolu')
      : tous;
  });

  constructor() {
    addIcons({ add, checkmarkCircle, funnel, funnelOutline });
    this.charger();
  }

  /** Recharge la liste depuis le service. */
  charger(): void {
    this.signalements.set(this.signalementService.lister());
  }

  /** Cible de navigation vers le detail d'un signalement. */
  lienDetail(signalement: Signalement): unknown[] {
    return ['/tabs/signalements', signalement.id];
  }

  /** Tire-pour-actualiser : recharge puis rend la main au refresher. */
  rafraichir(evenement: RefresherCustomEvent): void {
    this.charger();
    evenement.detail.complete();
  }

  surDefilement(evenement: CustomEvent<ScrollDetail>): void {
    const position = evenement.detail.scrollTop;
    const delta = position - this.dernierDefilement;
    if (Math.abs(delta) > SEUIL_DEFILEMENT) {
      this.fabVisible.set(delta < 0 || position <= 0);
      this.dernierDefilement = position;
    }
  }

  basculerFiltre(): void {
    this.masquerResolus.update((actif) => !actif);
  }

  reinitialiserFiltre(): void {
    this.masquerResolus.set(false);
  }

  ouvrirCreation(): void {
    this.modalOuvert.set(true);
  }

  fermerCreation(): void {
    this.modalOuvert.set(false);
  }

  async enregistrer(brouillon: BrouillonSignalement): Promise<void> {
    // Donnees statiques : rien n'est persiste, on confirme et on ferme.
    this.fermerCreation();
    const toast = await this.toastController.create({
      message: `« ${brouillon.titre} » a été envoyé.`,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}
