import { Injectable, effect, signal } from '@angular/core';

const CLE_WIFI = 'app.envoiWifiSeulement';
const CLE_COMPRESSION = 'app.compressionPhoto';

function lire(cle: string, defaut: boolean): boolean {
  try {
    const valeur = localStorage.getItem(cle);
    return valeur === null ? defaut : valeur === 'true';
  } catch {
    // Navigation privee ou stockage bloque.
    return defaut;
  }
}

/**
 * Preferences d'envoi, persistees d'une session a l'autre.
 *
 * Separees de ThemeService parce qu'elles n'ont rien a voir : celui-ci
 * touche au rendu, celles-ci au comportement reseau et a la taille des
 * donnees envoyees.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  /** N'envoyer que sur Wi-Fi, pour epargner le forfait de donnees. */
  readonly envoiWifiSeulement = signal(lire(CLE_WIFI, false));

  /** Reduire les photos avant envoi. */
  readonly compressionPhoto = signal(lire(CLE_COMPRESSION, true));

  constructor() {
    effect(() => this.ecrire(CLE_WIFI, this.envoiWifiSeulement()));
    effect(() => this.ecrire(CLE_COMPRESSION, this.compressionPhoto()));
  }

  private ecrire(cle: string, valeur: boolean): void {
    try {
      localStorage.setItem(cle, String(valeur));
    } catch {
      // Stockage indisponible : le choix vaut pour la session en cours.
    }
  }
}
