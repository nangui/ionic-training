import { DestroyRef, InjectionToken, Injectable, inject, signal } from '@angular/core';
import { Network } from '@capacitor/network';

/** La part du plugin reseau dont le service a besoin. */
export interface PluginReseau {
  getStatus(): Promise<{ connected: boolean }>;
  addListener(
    evenement: 'networkStatusChange',
    fonction: (statut: { connected: boolean }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

/**
 * Le plugin, injecte plutot que reference en dur.
 *
 * `Network` est un proxy cree par registerPlugin : on ne peut pas
 * l'espionner. Passer par un jeton rend le service testable sans toucher au
 * code de production.
 *
 * Le jeton n'expose pas le proxy directement mais un objet qui se contente
 * de lui deleguer : Angular appelle `ngOnDestroy()` sur les valeurs fournies
 * qui en possedent une, et le proxy repond a n'importe quel nom de propriete.
 * Il transformait donc la destruction de l'injecteur en appel natif
 * « Network.ngOnDestroy() is not implemented on web ».
 */
export const PLUGIN_RESEAU = new InjectionToken<PluginReseau>('plugin reseau', {
  providedIn: 'root',
  factory: () => ({
    getStatus: () => Network.getStatus(),
    addListener: (evenement, fonction) => Network.addListener(evenement, fonction),
  }),
});

/**
 * Etat de la connexion, expose en signal.
 *
 * S'appuie sur @capacitor/network et non sur `navigator.onLine` seul : dans
 * un WebView Android, `navigator.onLine` reflete l'etat de l'interface
 * reseau et pas la joignabilite. Il reste a `true` sur un portail captif ou
 * sur un Wi-Fi connecte mais mort, c'est-a-dire exactement les situations
 * ou la banniere hors-ligne est utile.
 *
 * `navigator.onLine` sert quand meme de valeur initiale : le plugin repond
 * de facon asynchrone, et il vaut mieux une estimation immediate qu'un
 * ecran qui s'annonce hors ligne le temps d'une promesse.
 *
 * Portee du gain : sur Android et iOS uniquement. L'implementation web du
 * plugin retombe elle aussi sur `window.navigator.onLine` ; en `ionic serve`
 * ou en PWA, la detection reste donc aussi approximative qu'avant.
 */
@Injectable({ providedIn: 'root' })
export class ReseauService {
  private readonly plugin = inject(PLUGIN_RESEAU);

  private readonly enLigneInterne = signal(navigator.onLine);

  readonly enLigne = this.enLigneInterne.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);

    void this.plugin
      .getStatus()
      .then((statut) => this.enLigneInterne.set(statut.connected));

    const ecouteur = this.plugin.addListener('networkStatusChange', (statut) =>
      this.enLigneInterne.set(statut.connected),
    );

    destroyRef.onDestroy(() => {
      void ecouteur.then((handle) => handle.remove());
    });
  }
}
