import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
// Leaflet 1.9 : la classe s'appelle `Map`, renommee ici pour ne pas masquer
// la Map native de JavaScript. La documentation en ligne decrit souvent la
// 2.0 (`LeafletMap`), qui n'est pas la version publiee.
import {
  CircleMarker,
  LatLngBounds,
  Map as CarteLeaflet,
  TileLayer,
  type CircleMarkerOptions,
} from 'leaflet';

import { LIBELLES_STATUT, Signalement } from '../../../core/models/signalement.model';
import { formaterDateCourte } from '../../../core/models/signalement.format';
import { PointCarte } from './carte-signalements.model';

/** Dakar : centre de repli quand il n'y a aucun signalement a cadrer. */
const CENTRE_DEFAUT: [number, number] = [14.7167, -17.4677];
const ZOOM_DEFAUT = 12;

/**
 * Couleur du marqueur par statut.
 *
 * Reprend les tokens de statut, mais en dur : Leaflet dessine dans un canvas
 * et ne resout pas les variables CSS.
 */
const COULEUR_STATUT: Record<Signalement['statut'], string> = {
  nouveau: '#1d4ed8',
  en_cours: '#b45309',
  resolu: '#15803d',
};

/** Point pas encore envoye : neutre, il n'a pas de statut serveur. */
const COULEUR_EN_ATTENTE = '#5b6b66';

/**
 * Carte des signalements.
 *
 * Leaflet est manipule directement plutot que via une surcouche Angular :
 * une dependance de moins a suivre, et l'API imperative se prete mal a
 * l'encapsulation de toute facon.
 *
 * `ViewEncapsulation.None` est indispensable : la feuille de style de
 * Leaflet cible des elements qu'il cree lui-meme, hors de la portee des
 * styles encapsules. La declarer ici plutot que globalement la garde dans
 * le morceau differe, donc non telechargee tant que la carte n'est pas
 * ouverte.
 */
@Component({
  selector: 'app-carte-signalements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  templateUrl: 'carte-signalements.component.html',
  styleUrls: ['carte-signalements.component.scss'],
})
export class CarteSignalementsComponent {
  readonly points = input.required<PointCarte[]>();

  /** Annonce du contenu pour les lecteurs d'ecran. */
  readonly resumeAccessible = computed(() => {
    const nombre = this.points().length;
    if (nombre === 0) {
      return 'Carte sans signalement à afficher.';
    }
    return `Carte de ${nombre} signalement${nombre > 1 ? 's' : ''}. Les points ne sont pas lisibles par un lecteur d'écran : utilisez la vue liste, accessible par le bouton « Liste » en haut de l'écran.`;
  });

  /** Emis quand l'utilisateur ouvre un signalement depuis la carte. */
  readonly ouvrir = output<Signalement>();

  private readonly conteneur = viewChild.required<ElementRef<HTMLElement>>('carte');

  private carte?: CarteLeaflet;
  private marqueurs: CircleMarker[] = [];
  /** Signature du jeu de points deja cadre, pour ne pas recadrer en boucle. */
  private cadrage = '';

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detruire());

    effect(() => {
      const points = this.points();
      const element = this.conteneur().nativeElement;
      this.dessiner(element, points);
    });
  }

  /**
   * Recalcule les dimensions de la carte.
   *
   * A appeler quand le conteneur devient visible : une carte Leaflet
   * initialisee dans un element masque mesure zero et s'affiche en gris.
   */
  rafraichirTaille(): void {
    this.carte?.invalidateSize();
  }

  private dessiner(element: HTMLElement, points: PointCarte[]): void {
    const carte = this.carte ?? this.creerCarte(element);

    for (const marqueur of this.marqueurs) {
      marqueur.remove();
    }
    this.marqueurs = points.map((point) => this.marqueur(carte, point));

    // Le cadrage ne se rejoue que si l'ensemble des points a change.
    // `charger()` produit une nouvelle instance de tableau a chaque entree
    // dans la vue : recadrer a chaque fois arracherait la carte des mains
    // d'un utilisateur qui vient de la deplacer.
    const signature = points.map((p) => p.signalement.id).join(',');
    if (points.length > 0 && signature !== this.cadrage) {
      const bornes = new LatLngBounds(
        points.map(
          (p) => [p.signalement.latitude, p.signalement.longitude] as [number, number],
        ),
      );
      carte.fitBounds(bornes, { padding: [32, 32], maxZoom: 16 });
      this.cadrage = signature;
    }
  }

  private creerCarte(element: HTMLElement): CarteLeaflet {
    // preferCanvas : les marqueurs sont dessines dans un seul canvas au
    // lieu d'un element SVG chacun. La difference se voit des quelques
    // centaines de points, et le cout est nul en dessous.
    const carte = new CarteLeaflet(element, { preferCanvas: true }).setView(
      CENTRE_DEFAUT,
      ZOOM_DEFAUT,
    );
    new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      // Attribution obligatoire : c'est la contrepartie de la politique
      // d'usage des tuiles d'OpenStreetMap.
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(carte);

    // Une carte creee pendant une transition de page peut mesurer ses
    // dimensions trop tot et s'afficher en gris. Une passe au cadre
    // suivant suffit a la recadrer.
    requestAnimationFrame(() => this.carte?.invalidateSize());

    this.carte = carte;
    return carte;
  }

  private marqueur(carte: CarteLeaflet, point: PointCarte): CircleMarker {
    const { signalement, ouvrable } = point;
    const options: CircleMarkerOptions = {
      radius: 10,
      color: '#ffffff',
      weight: 2,
      fillColor: ouvrable ? COULEUR_STATUT[signalement.statut] : COULEUR_EN_ATTENTE,
      fillOpacity: 1,
    };
    const marqueur = new CircleMarker(
      [signalement.latitude, signalement.longitude],
      options,
    );

    // Une infobulle, et elle seule, reagit au toucher. La version
    // precedente ouvrait le detail dans le meme geste : l'infobulle
    // apparaissait et l'ecran changeait, elle n'etait jamais lisible - et
    // le libelle du statut qu'elle porte devenait inatteignable.
    marqueur.bindPopup(() => this.infobulle(point));
    marqueur.addTo(carte);
    return marqueur;
  }

  /**
   * Contenu de l'infobulle, construit en DOM et non en chaine HTML : le
   * titre vient de l'utilisateur et `textContent` le neutralise sans qu'on
   * ait a y penser.
   */
  private infobulle(point: PointCarte): HTMLElement {
    const { signalement, ouvrable } = point;
    const contenu = document.createElement('div');
    contenu.className = 'infobulle';

    const titre = document.createElement('strong');
    titre.textContent = signalement.titre;
    contenu.append(titre);

    // Le libelle du statut est ecrit : la couleur du point ne porte jamais
    // seule l'information.
    const meta = document.createElement('p');
    meta.className = 'infobulle__meta';
    meta.textContent = ouvrable
      ? `${LIBELLES_STATUT[signalement.statut]} · ${formaterDateCourte(signalement.dateCreation)}`
      : "En attente d'envoi";
    contenu.append(meta);

    if (ouvrable) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'infobulle__action';
      bouton.textContent = 'Ouvrir le signalement';
      bouton.addEventListener('click', () => this.ouvrir.emit(signalement));
      contenu.append(bouton);
    }

    return contenu;
  }

  private detruire(): void {
    // Sans remove(), Leaflet laisse ses ecouteurs sur window et le canvas
    // en memoire a chaque aller-retour vers la carte.
    this.carte?.remove();
    this.carte = undefined;
    this.marqueurs = [];
  }
}
