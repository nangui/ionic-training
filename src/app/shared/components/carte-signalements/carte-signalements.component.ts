import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
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
  readonly signalements = input.required<Signalement[]>();

  /** Emis quand l'utilisateur ouvre un signalement depuis la carte. */
  readonly ouvrir = output<Signalement>();

  private readonly conteneur = viewChild.required<ElementRef<HTMLElement>>('carte');

  private carte?: CarteLeaflet;
  private marqueurs: CircleMarker[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detruire());

    effect(() => {
      const signalements = this.signalements();
      const element = this.conteneur().nativeElement;
      this.dessiner(element, signalements);
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

  private dessiner(element: HTMLElement, signalements: Signalement[]): void {
    if (!this.carte) {
      // preferCanvas : les marqueurs sont dessines dans un seul canvas au
      // lieu d'un element SVG chacun. La difference se voit des quelques
      // centaines de points, et le cout est nul en dessous.
      this.carte = new CarteLeaflet(element, { preferCanvas: true }).setView(
        CENTRE_DEFAUT,
        ZOOM_DEFAUT,
      );
      new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        // Attribution obligatoire : c'est la contrepartie de la politique
        // d'usage des tuiles d'OpenStreetMap.
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.carte);

      // Une carte creee pendant une transition de page peut mesurer ses
      // dimensions trop tot et s'afficher en gris. Une passe au cadre
      // suivant suffit a la recadrer.
      requestAnimationFrame(() => this.carte?.invalidateSize());
    }

    for (const marqueur of this.marqueurs) {
      marqueur.remove();
    }
    this.marqueurs = signalements.map((signalement) => this.marqueur(signalement));

    if (this.marqueurs.length > 0) {
      const bornes = new LatLngBounds(
        signalements.map((s) => [s.latitude, s.longitude] as [number, number]),
      );
      this.carte.fitBounds(bornes, { padding: [32, 32], maxZoom: 16 });
    }
  }

  private marqueur(signalement: Signalement): CircleMarker {
    const options: CircleMarkerOptions = {
      radius: 10,
      color: '#ffffff',
      weight: 2,
      fillColor: COULEUR_STATUT[signalement.statut],
      fillOpacity: 1,
    };
    const marqueur = new CircleMarker([signalement.latitude, signalement.longitude], options);

    // Le libelle du statut est ecrit dans l'infobulle : la couleur du point
    // ne porte jamais seule l'information.
    marqueur.bindPopup(
      `<strong>${echapper(signalement.titre)}</strong><br>` +
        `${LIBELLES_STATUT[signalement.statut]} · ${formaterDateCourte(signalement.dateCreation)}<br>` +
        `<em>Toucher le point pour ouvrir</em>`,
    );
    marqueur.on('click', () => this.ouvrir.emit(signalement));
    marqueur.addTo(this.carte!);
    return marqueur;
  }

  private detruire(): void {
    // Sans remove(), Leaflet laisse ses ecouteurs sur window et le canvas
    // en memoire a chaque aller-retour vers la carte.
    this.carte?.remove();
    this.carte = undefined;
    this.marqueurs = [];
  }
}

/**
 * Le titre vient de l'utilisateur : il ne doit pas etre interprete en HTML.
 * Exportee pour etre testable seule : le rendu des marqueurs passe par un
 * canvas, que jsdom n'implemente pas.
 */
export function echapper(texte: string): string {
  const element = document.createElement('div');
  element.textContent = texte;
  return element.innerHTML;
}
