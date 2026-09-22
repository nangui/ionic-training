import { Injectable, inject, signal } from '@angular/core';

import { CacheListe } from '../models/file-envoi.model';
import { Signalement } from '../models/signalement.model';
import { StockageService } from './stockage.service';

const CLE_CACHE = 'app.cacheListe';

/**
 * Dernier instantane connu de la liste.
 *
 * Sert quand la lecture echoue : mieux vaut une liste datee qu'un ecran
 * vide. La date est affichee, sinon l'utilisateur croirait consulter
 * l'etat courant - c'est la difference entre « hors ligne » et « faux ».
 *
 * Seule la premiere page sans filtre est mise en cache : une liste filtree
 * remise en cache ferait croire, au retour, que le reste a disparu.
 */
@Injectable({ providedIn: 'root' })
export class CacheSignalementsService {
  private readonly stockage = inject(StockageService);

  /** Date du cache actuellement servi, ou null si on affiche du frais. */
  readonly dateServie = signal<string | null>(null);

  async enregistrer(signalements: Signalement[], total: number): Promise<void> {
    const cache: CacheListe = {
      signalements,
      total,
      dateCache: new Date().toISOString(),
    };
    await this.stockage.ecrire(CLE_CACHE, cache);
  }

  /** Renvoie le cache, ou null s'il n'y en a pas. */
  async lire(): Promise<{ signalements: Signalement[]; total: number; dateCache: string } | null> {
    const cache = await this.stockage.lire<CacheListe | null>(CLE_CACHE, null);
    if (!cache || !Array.isArray(cache.signalements)) {
      return null;
    }
    return {
      signalements: cache.signalements as Signalement[],
      total: cache.total,
      dateCache: cache.dateCache,
    };
  }

  marquerServi(dateCache: string | null): void {
    this.dateServie.set(dateCache);
  }
}
