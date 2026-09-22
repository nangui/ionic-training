import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  InfiniteScrollCustomEvent,
  RefresherCustomEvent,
  ScrollDetail,
  ToastController,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, alertCircle, checkmarkCircle, cloudOffline } from 'ionicons/icons';

import {
  CategorieSignalement,
  CriteresRecherche,
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

/** Taille d'une page. Aligne sur le defaut du serveur. */
export const TAILLE_PAGE = 20;

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
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonModal,
    SignalementCardComponent,
    FormulaireSignalementComponent,
    BarreRechercheComponent,
    FiltresSignalementsComponent,
    BanniereHorsLigneComponent,
    CarteSqueletteComponent,
  ],
})
export class SignalementsPage implements ViewWillEnter {
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
  // Une seule valeur par famille : `GET /signalements` n'accepte qu'une
  // categorie et qu'un statut. Filtrer plusieurs valeurs cote client
  // donnerait des resultats faux des que la liste depasse une page.
  readonly categorieFiltree = signal<CategorieSignalement | undefined>(undefined);
  readonly statutFiltre = signal<StatutSignalement | undefined>(undefined);

  /** Nombre total cote serveur, tous filtres appliques. */
  readonly total = signal(0);

  /** Vrai quand la liste affichee couvre tout ce que le serveur a. */
  readonly toutCharge = computed(
    () => this.signalements().length >= this.total(),
  );

  /** Le bouton flottant s'efface quand on descend, revient quand on remonte. */
  readonly fabVisible = signal(true);

  readonly modalOuvert = signal(false);

  readonly squelettes = Array.from({ length: NOMBRE_SQUELETTES });

  private readonly formulaire = viewChild(FormulaireSignalementComponent);

  private dernierDefilement = 0;
  private premierPassage = true;
  /**
   * Numero de la derniere lecture lancee.
   *
   * Sans lui, une reponse lente correspondant a un filtre abandonne peut
   * arriver apres une reponse rapide et ecraser la liste courante : on
   * afficherait le resultat d'une recherche que l'utilisateur a deja
   * remplacee.
   */
  private lectureCourante = 0;
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
      this.categorieFiltree() !== undefined ||
      this.statutFiltre() !== undefined,
  );

  /**
   * Ce que la vue affiche : exactement ce que le serveur a renvoye. Le
   * filtrage, la recherche et la pagination lui sont delegues - lui seul
   * connait l'ensemble des donnees.
   */
  readonly signalementsAffiches = computed(() => this.signalements());

  constructor() {
    addIcons({ add, alertCircle, checkmarkCircle, cloudOffline });
    inject(DestroyRef).onDestroy(() => {
      this.detruit = true;
      clearTimeout(this.minuteurLenteur);
    });

    // Toute variation de critere relance une lecture : c'est le serveur qui
    // filtre, pas la vue. Le premier passage est laisse a ionViewWillEnter,
    // sinon la page ferait deux requetes a son ouverture.
    effect(() => {
      const criteres = {
        q: this.recherche() || undefined,
        categorie: this.categorieFiltree(),
        statut: this.statutFiltre(),
      };
      if (this.premierPassage) {
        this.premierPassage = false;
        return;
      }
      void this.charger(criteres);
    });
  }

  /**
   * Relit la liste a chaque entree dans la vue.
   *
   * Indispensable avec IonicRouteStrategy : Ionic garde les pages montees
   * pour animer le retour, donc le constructeur et ngOnInit ne rejouent
   * pas. Sans ce crochet, un signalement cree depuis l'onglet « Nouveau »
   * n'apparaissait qu'apres avoir touche un filtre.
   */
  ionViewWillEnter(): void {
    void this.charger();
  }

  /**
   * Recharge la liste depuis le service.
   *
   * Ne rejette jamais : un echec devient un etat de l'ecran. Sans ca, un
   * appelant comme le tire-pour-actualiser resterait bloque avant son
   * `complete()` et l'indicateur tournerait indefiniment.
   */
  async charger(criteres?: CriteresRecherche): Promise<void> {
    const criteresEffectifs = criteres ?? this.criteresCourants();
    const lecture = ++this.lectureCourante;

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
      const page = await this.signalementService.lister({
        ...criteresEffectifs,
        limit: TAILLE_PAGE,
        offset: 0,
      });
      if (this.estCourante(lecture)) {
        this.signalements.set(page.data);
        this.total.set(page.total);
      }
    } catch (erreur) {
      if (this.estCourante(lecture)) {
        this.erreur.set(true);
        // La liste deja affichee reste a l'ecran : un echec de
        // rafraichissement ne doit pas effacer ce que l'utilisateur lisait.
        if (this.signalements().length > 0) {
          await this.signalerEchec();
        }
      }
    } finally {
      if (this.estCourante(lecture)) {
        clearTimeout(this.minuteurLenteur);
        this.connexionLente.set(false);
        this.chargement.set(false);
      }
    }
  }

  /**
   * Page suivante, ajoutee a la suite. Declenchee par le defilement, bien
   * avant d'atteindre le bas de la liste.
   */
  async chargerSuite(evenement: InfiniteScrollCustomEvent): Promise<void> {
    const lecture = this.lectureCourante;
    try {
      const page = await this.signalementService.lister({
        ...this.criteresCourants(),
        limit: TAILLE_PAGE,
        offset: this.signalements().length,
      });
      // Un changement de filtre pendant la requete annule cette suite : elle
      // appartient a une liste qui n'est plus affichee.
      if (this.estCourante(lecture)) {
        this.signalements.update((actuels) => [...actuels, ...page.data]);
        this.total.set(page.total);
      }
    } catch {
      // Silencieux : la liste deja affichee reste utilisable, et le
      // defilement redeclenchera la tentative.
    } finally {
      await evenement.target.complete();
    }
  }

  private criteresCourants(): CriteresRecherche {
    return {
      q: this.recherche() || undefined,
      categorie: this.categorieFiltree(),
      statut: this.statutFiltre(),
    };
  }

  /** Faux si une lecture plus recente a ete lancee entre-temps. */
  private estCourante(lecture: number): boolean {
    return !this.detruit && lecture === this.lectureCourante;
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

  /** Un second appui sur l'etiquette active la retire. */
  basculerCategorie(categorie: CategorieSignalement): void {
    this.categorieFiltree.update((actuelle) =>
      actuelle === categorie ? undefined : categorie,
    );
  }

  basculerStatut(statut: StatutSignalement): void {
    this.statutFiltre.update((actuel) => (actuel === statut ? undefined : statut));
  }

  reinitialiserFiltres(): void {
    this.recherche.set('');
    this.categorieFiltree.set(undefined);
    this.statutFiltre.set(undefined);
  }

  ouvrirCreation(): void {
    this.modalOuvert.set(true);
  }

  fermerCreation(): void {
    this.modalOuvert.set(false);
  }

  async enregistrer(brouillon: BrouillonSignalement): Promise<void> {
    try {
      const cree = await this.signalementService.creer(brouillon);
      this.fermerCreation();
      // Relecture plutot qu'insertion locale : le serveur decide de l'ordre
      // et des champs qu'il a completes (id, statut, dateCreation).
      await this.charger();
      const toast = await this.toastController.create({
        message: `« ${cree.titre} » a été envoyé.`,
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (erreur) {
      // La modale reste ouverte et la saisie est conservee : l'utilisateur
      // ne doit pas avoir a tout retaper apres une coupure.
      this.formulaire()?.terminerEnvoi();
      const toast = await this.toastController.create({
        message:
          erreur instanceof Error ? erreur.message : "L'envoi a échoué.",
        duration: 5000,
        position: 'bottom',
        color: 'danger',
        buttons: [{ text: 'Réessayer', handler: () => void this.enregistrer(brouillon) }],
      });
      await toast.present();
    }
  }
}
