import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, checkmarkCircle, funnel, funnelOutline } from 'ionicons/icons';

import {
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
  Signalement,
  StatutSignalement,
} from '../../core/models/signalement.model';
import { SignalementService } from '../../core/services/signalement.service';

/** Classe CSS du badge, par statut. */
const CLASSE_STATUT: Record<StatutSignalement, string> = {
  nouveau: 'badge--nouveau',
  en_cours: 'badge--encours',
  resolu: 'badge--resolu',
};

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

@Component({
  selector: 'app-signalements',
  templateUrl: 'signalements.page.html',
  styleUrls: ['signalements.page.scss'],
  imports: [
    RouterLink,
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
  ],
})
export class SignalementsPage {
  private readonly signalementService = inject(SignalementService);

  /** Etat de la liste. */
  readonly signalements = signal<Signalement[]>([]);

  /** Filtre de l'action secondaire : masquer ou non les signalements resolus. */
  readonly masquerResolus = signal(false);

  /** Ce que la vue affiche reellement, derive de l'etat et du filtre. */
  readonly signalementsAffiches = computed(() => {
    const tous = this.signalements();
    return this.masquerResolus()
      ? tous.filter((signalement) => signalement.statut !== 'resolu')
      : tous;
  });

  readonly libellesStatut = LIBELLES_STATUT;
  readonly libellesCategorie = LIBELLES_CATEGORIE;

  constructor() {
    addIcons({ add, checkmarkCircle, funnel, funnelOutline });
    this.charger();
  }

  /** Recharge la liste depuis le service. */
  charger(): void {
    this.signalements.set(this.signalementService.lister());
  }

  /** Tire-pour-actualiser : recharge puis rend la main au refresher. */
  rafraichir(evenement: RefresherCustomEvent): void {
    this.charger();
    void evenement.detail.complete();
  }

  basculerFiltre(): void {
    this.masquerResolus.update((actif) => !actif);
  }

  classeStatut(statut: StatutSignalement): string {
    return CLASSE_STATUT[statut];
  }

  /** Coordonnees abregees a quatre decimales (~11 m de precision). */
  formaterCoordonnees(signalement: Signalement): string {
    return `${signalement.latitude.toFixed(4)}, ${signalement.longitude.toFixed(4)}`;
  }

  /** Date ISO -> "19 sept. 10:42", sans dependre de la locale du navigateur. */
  formaterDate(dateIso: string): string {
    return FORMAT_DATE.format(new Date(dateIso));
  }
}
