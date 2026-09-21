import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/**
 * Etat de la connexion, expose en signal.
 *
 * S'appuie sur `navigator.onLine` et les evenements `online`/`offline` du
 * WebView : aucune dependance, et le meme code fonctionne en web comme dans
 * l'application native.
 */
@Injectable({ providedIn: 'root' })
export class ReseauService {
  private readonly enLigneInterne = signal(navigator.onLine);

  readonly enLigne = this.enLigneInterne.asReadonly();

  constructor() {
    const surChangement = () => this.enLigneInterne.set(navigator.onLine);
    window.addEventListener('online', surChangement);
    window.addEventListener('offline', surChangement);

    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', surChangement);
      window.removeEventListener('offline', surChangement);
    });
  }
}
