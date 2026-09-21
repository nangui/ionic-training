import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { add, alertCircle, checkmarkCircle, cloudOffline } from 'ionicons/icons';

import {
  CategorieSignalement,
  Signalement,
  StatutSignalement,
} from '../../core/models/signalement.model';
import { ReseauService } from '../../core/services/reseau.service';
import { SignalementService } from '../../core/services/signalement.service';
import { BanniereHorsLigneComponent } from '../../shared/components/banniere-hors-ligne/banniere-hors-ligne.component';
import { BarreRechercheComponent } from '../../shared/components/barre-recherche/barre-recherche.component';
import { CarteSqueletteComponent } from '../../shared/components/carte-squelette/carte-squelette.component';
import { FiltresSignalementsComponent } from '../../shared/components/filtres-signalements/filtres-signalements.component';
import {
  BrouillonSignalement,
  FormulaireSignalementComponent,
} from '../../shared/components/formulaire-signalement/formulaire-signalement.component';
import { SignalementCardComponent } from '../../shared/components/signalement-card/signalement-card.component';

/** Amplitude de defilement au-dela de laquelle le bouton flottant s'efface. */
const SEUIL_DEFILEMENT = 24;

/** Nombre de silhouettes affichees pendant le chargement initial. */
export const NOMBRE_SQUELETTES = 3;

/** Duree au-dela de laquelle on previent que la connexion semble lente. */
export const SEUIL_CONNEXION_LENTE_MS = 10_000;

/** Retire les accents pour une recherche tolerante a la saisie. */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

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
    BarreRechercheComponent,
    FiltresSignalementsComponent,
    BanniereHorsLigneComponent,
    CarteSqueletteComponent,
  ],
})
export class SignalementsPage {
  private readonly signalementService = inject(SignalementService);
  private readonly reseauService = inject(ReseauService);
  private readonly toastController = inject(ToastController);

  /** Etat de la liste. */
  readonly signalements = signal<Signalement[]>([]);

  readonly chargement = signal(true);
  readonly connexionLente = signal(false);
  readonly erreur = signal(false);

  readonly enLigne = this.reseauService.enLigne;

  readonly recherche = signal('');
  readonly categoriesFiltrees = signal<readonly CategorieSignalement[]>([]);
  readonly statutsFiltres = signal<readonly StatutSignalement[]>([]);

  /** Le bouton flottant s'efface quand on descend, revient quand on remonte. */
  readonly fabVisible = signal(true);

  readonly modalOuvert = signal(false);

  readonly squelettes = Array.from({ length: NOMBRE_SQUELETTES });

  private dernierDefilement = 0;
  private minuteurLenteur?: ReturnType<typeof setTimeout>;
  private detruit = false;

  /** Echec alors qu'il n'y a rien a afficher : l'ecran entier est en erreur. */
  readonly erreurBloquante = computed(
    () => this.erreur() && this.signalements().length === 0,
  );

  /**
   * Chargement initial uniquement : celui ou il n'y a encore rien a montrer.
   * Un tire-pour-actualiser ne doit pas remplacer les cartes par des
   * silhouettes - le contenu disparaitrait sous le pouce de l'utilisateur,
   * avec en prime deux indicateurs de chargement simultanes.
   */
  readonly chargementInitial = computed(
    () => this.chargement() && this.signalements().length === 0,
  );

  /** Vrai des qu'une recherche ou un filtre restreint la liste. */
  readonly filtresActifs = computed(
    () =>
      this.recherche().length > 0 ||
      this.categoriesFiltrees().length > 0 ||
      this.statutsFiltres().length > 0,
  );

  /**
   * Ce que la vue affiche reellement.
   *
   * Une famille de filtres vide signifie « toutes » : sans ca, il faudrait
   * cocher les cinq categories pour revoir la liste entiere.
   */
  readonly signalementsAffiches = computed(() => {
    const terme = normaliser(this.recherche());
    const categories = this.categoriesFiltrees();
    const statuts = this.statutsFiltres();

    return this.signalements().filter((signalement) => {
      const correspondCategorie =
        categories.length === 0 || categories.includes(signalement.categorie);
      const correspondStatut =
        statuts.length === 0 || statuts.includes(signalement.statut);
      const correspondTerme =
        terme.length === 0 ||
        normaliser(signalement.titre).includes(terme) ||
        normaliser(signalement.description).includes(terme);

      return correspondCategorie && correspondStatut && correspondTerme;
    });
  });

  constructor() {
    addIcons({ add, alertCircle, checkmarkCircle, cloudOffline });
    inject(DestroyRef).onDestroy(() => {
      this.detruit = true;
      clearTimeout(this.minuteurLenteur);
    });
    void this.charger();
  }

  /**
   * Recharge la liste depuis le service.
   *
   * Ne rejette jamais : un echec devient un etat de l'ecran. Sans ca, un
   * appelant comme le tire-pour-actualiser resterait bloque avant son
   * `complete()` et l'indicateur tournerait indefiniment.
   */
  async charger(): Promise<void> {
    this.chargement.set(true);
    this.connexionLente.set(false);
    this.erreur.set(false);
    // Un chargement relance alors qu'un autre court laisserait son minuteur
    // tourner et declencherait « connexion lente » sans raison.
    clearTimeout(this.minuteurLenteur);
    // Au-dela de dix secondes on le dit, plutot que de laisser tourner les
    // silhouettes sans explication.
    this.minuteurLenteur = setTimeout(
      () => this.connexionLente.set(true),
      SEUIL_CONNEXION_LENTE_MS,
    );

    try {
      const signalements = await this.signalementService.lister();
      if (!this.detruit) {
        this.signalements.set(signalements);
      }
    } catch {
      if (!this.detruit) {
        this.erreur.set(true);
        // La liste deja affichee reste a l'ecran : un echec de
        // rafraichissement ne doit pas effacer ce que l'utilisateur lisait.
        if (this.signalements().length > 0) {
          await this.signalerEchec();
        }
      }
    } finally {
      clearTimeout(this.minuteurLenteur);
      if (!this.detruit) {
        this.connexionLente.set(false);
        this.chargement.set(false);
      }
    }
  }

  /** Toast d'echec avec une action de reprise, quand du contenu est visible. */
  private async signalerEchec(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Actualisation impossible.',
      duration: 4000,
      position: 'bottom',
      color: 'danger',
      buttons: [{ text: 'Réessayer', handler: () => void this.charger() }],
    });
    await toast.present();
  }

  /** Cible de navigation vers le detail d'un signalement. */
  lienDetail(signalement: Signalement): unknown[] {
    return ['/tabs/signalements', signalement.id];
  }

  /** Tire-pour-actualiser : recharge puis rend la main au refresher. */
  async rafraichir(evenement: RefresherCustomEvent): Promise<void> {
    try {
      await this.charger();
    } finally {
      // Rendre la main au refresher quoi qu'il arrive : sans ce finally,
      // un echec laisserait l'indicateur tourner sans fin.
      evenement.detail.complete();
    }
  }

  surDefilement(evenement: CustomEvent<ScrollDetail>): void {
    const position = evenement.detail.scrollTop;
    const delta = position - this.dernierDefilement;
    if (Math.abs(delta) > SEUIL_DEFILEMENT) {
      this.fabVisible.set(delta < 0 || position <= 0);
      this.dernierDefilement = position;
    }
  }

  surRecherche(terme: string): void {
    this.recherche.set(terme);
  }

  basculerCategorie(categorie: CategorieSignalement): void {
    this.categoriesFiltrees.update((actuelles) =>
      actuelles.includes(categorie)
        ? actuelles.filter((c) => c !== categorie)
        : [...actuelles, categorie],
    );
  }

  basculerStatut(statut: StatutSignalement): void {
    this.statutsFiltres.update((actuels) =>
      actuels.includes(statut)
        ? actuels.filter((s) => s !== statut)
        : [...actuels, statut],
    );
  }

  reinitialiserFiltres(): void {
    this.recherche.set('');
    this.categoriesFiltrees.set([]);
    this.statutsFiltres.set([]);
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
