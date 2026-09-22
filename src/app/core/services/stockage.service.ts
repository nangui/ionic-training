import { InjectionToken, Injectable, inject } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/** La part du plugin dont le service a besoin. */
export interface PluginStockage {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

/**
 * Le plugin, injecte plutot que reference en dur.
 *
 * Le jeton expose un objet qui delegue et non le proxy Capacitor : Angular
 * appelle `ngOnDestroy()` sur les valeurs fournies qui en possedent une, et
 * un proxy repond a n'importe quel nom de propriete.
 */
export const PLUGIN_STOCKAGE = new InjectionToken<PluginStockage>('plugin stockage', {
  providedIn: 'root',
  factory: () => ({
    get: (options) => Preferences.get(options),
    set: (options) => Preferences.set(options),
    remove: (options) => Preferences.remove(options),
  }),
});

/**
 * Stockage local durable, en JSON.
 *
 * @capacitor/preferences plutot que localStorage : sur mobile, localStorage
 * peut etre vide par le systeme quand l'espace manque, alors que Preferences
 * s'appuie sur SharedPreferences (Android) et UserDefaults (iOS), que le
 * systeme ne purge pas. Pour des signalements en attente d'envoi, la
 * difference est celle entre « differe » et « perdu ».
 *
 * Aucune lecture ne doit faire echouer l'application : une valeur illisible
 * est traitee comme une absence de valeur.
 */
@Injectable({ providedIn: 'root' })
export class StockageService {
  private readonly plugin = inject(PLUGIN_STOCKAGE);

  async lire<T>(cle: string, defaut: T): Promise<T> {
    try {
      const { value } = await this.plugin.get({ key: cle });
      return value === null ? defaut : (JSON.parse(value) as T);
    } catch {
      // JSON corrompu ou stockage indisponible : on repart du defaut plutot
      // que de bloquer l'ecran sur une donnee qu'on ne sait plus lire.
      return defaut;
    }
  }

  async ecrire(cle: string, valeur: unknown): Promise<void> {
    try {
      await this.plugin.set({ key: cle, value: JSON.stringify(valeur) });
    } catch {
      // Espace insuffisant ou stockage bloque : l'application continue de
      // fonctionner en ligne, elle perd seulement sa memoire hors-ligne.
    }
  }

  async effacer(cle: string): Promise<void> {
    try {
      await this.plugin.remove({ key: cle });
    } catch {
      // Sans consequence : la cle sera ecrasee a la prochaine ecriture.
    }
  }
}
