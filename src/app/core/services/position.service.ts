import { InjectionToken, Injectable, inject } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';

/** Pourquoi une localisation n'a pas abouti. */
export type EchecPosition = 'refus' | 'indisponible';

export class ErreurPosition extends Error {
  constructor(
    readonly motif: EchecPosition,
    message: string,
  ) {
    super(message);
    this.name = 'ErreurPosition';
  }
}

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

/** La part du plugin dont le service a besoin. */
export interface PluginPosition {
  checkPermissions(): Promise<{ location: string }>;
  requestPermissions(): Promise<{ location: string }>;
  getCurrentPosition(options?: {
    timeout?: number;
    enableHighAccuracy?: boolean;
  }): Promise<{ coords: Coordonnees }>;
}

export const PLUGIN_POSITION = new InjectionToken<PluginPosition>('plugin position', {
  providedIn: 'root',
  factory: () => ({
    checkPermissions: () => Geolocation.checkPermissions(),
    requestPermissions: () => Geolocation.requestPermissions(),
    getCurrentPosition: (options) => Geolocation.getCurrentPosition(options),
  }),
});

/** Delai au-dela duquel on cesse d'attendre un point GPS. */
const DELAI_MS = 10_000;

/**
 * Localisation de l'appareil.
 *
 * Un refus n'est jamais bloquant : le formulaire laisse envoyer sans
 * position. C'est une contrainte d'usage, pas une politesse - l'utilisateur
 * est dehors et pressé.
 */
@Injectable({ providedIn: 'root' })
export class PositionService {
  private readonly plugin = inject(PLUGIN_POSITION);

  async obtenir(): Promise<Coordonnees> {
    let etat = await this.plugin.checkPermissions();
    if (etat.location === 'prompt' || etat.location === 'prompt-with-rationale') {
      etat = await this.plugin.requestPermissions();
    }
    if (etat.location === 'denied') {
      throw new ErreurPosition(
        'refus',
        'Accès à la position refusé. Vous pouvez envoyer le signalement sans position, ou réessayer après avoir autorisé la localisation.',
      );
    }

    try {
      const position = await this.plugin.getCurrentPosition({
        timeout: DELAI_MS,
        enableHighAccuracy: true,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      throw new ErreurPosition(
        'indisponible',
        "La position n'a pas pu être déterminée. Réessayez à ciel ouvert, ou envoyez sans position.",
      );
    }
  }
}
