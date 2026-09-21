import { Injectable, computed, effect, signal } from '@angular/core';

/** Ce que l'utilisateur a choisi, et non ce qui est affiche. */
export type PreferenceTheme = 'systeme' | 'clair' | 'sombre';

const CLE_STOCKAGE = 'app.theme';

/** Classe posee sur <html> ; c'est celle que la palette d'Ionic attend. */
const CLASSE_SOMBRE = 'ion-palette-dark';

function preferenceStockee(): PreferenceTheme {
  try {
    const valeur = localStorage.getItem(CLE_STOCKAGE);
    if (valeur === 'clair' || valeur === 'sombre' || valeur === 'systeme') {
      return valeur;
    }
  } catch {
    // Navigation privee ou stockage bloque : on retombe sur le systeme.
  }
  return 'systeme';
}

/**
 * Choix du theme : clair, sombre, ou celui du telephone.
 *
 * La bascule passe par une classe sur <html> plutot que par une media
 * query, parce qu'une media query ne se desactive pas : un utilisateur qui
 * veut du clair alors que son telephone est en sombre doit pouvoir l'obtenir.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly requete = window.matchMedia('(prefers-color-scheme: dark)');

  private readonly systemeSombre = signal(this.requete.matches);

  readonly preference = signal<PreferenceTheme>(preferenceStockee());

  /** Ce qui est reellement affiche, une fois la preference resolue. */
  readonly sombreActif = computed(() => {
    const preference = this.preference();
    return preference === 'sombre' || (preference === 'systeme' && this.systemeSombre());
  });

  constructor() {
    this.requete.addEventListener('change', (evenement) =>
      this.systemeSombre.set(evenement.matches),
    );

    effect(() => {
      const sombre = this.sombreActif();
      document.documentElement.classList.toggle(CLASSE_SOMBRE, sombre);
      // Aligne aussi les controles natifs (select, champs, ascenseurs), que
      // la classe ne touche pas.
      document.documentElement.style.colorScheme = sombre ? 'dark' : 'light';
    });

    effect(() => {
      const preference = this.preference();
      try {
        localStorage.setItem(CLE_STOCKAGE, preference);
      } catch {
        // Stockage indisponible : le choix vaut pour la session en cours.
      }
    });
  }

  definir(preference: PreferenceTheme): void {
    this.preference.set(preference);
  }
}
