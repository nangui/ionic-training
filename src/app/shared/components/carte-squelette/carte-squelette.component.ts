import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Silhouette d'une carte pendant le chargement initial.
 *
 * Preferee a une roue centrale : elle occupe la place que le contenu va
 * prendre, donc la liste ne sursaute pas a l'arrivee des donnees.
 */
@Component({
  selector: 'app-carte-squelette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="squelette" aria-hidden="true">
      <div class="squelette__vignette"></div>
      <div class="squelette__corps">
        <div class="squelette__ligne squelette__ligne--courte"></div>
        <div class="squelette__ligne"></div>
        <div class="squelette__ligne squelette__ligne--moyenne"></div>
      </div>
    </div>
  `,
  styles: `
    .squelette {
      display: flex;
      align-items: flex-start;
      gap: var(--app-space-3);
      min-height: var(--app-card-min-height);
      padding: var(--app-space-4);
      border: 1px solid var(--app-color-border);
      border-radius: var(--app-radius-card);
      background: var(--app-color-surface);
    }

    .squelette__vignette,
    .squelette__ligne {
      background: var(--app-color-border);
      /* Pulsation douce : la seule animation en boucle de l'application. */
      animation: pulsation 1200ms ease-in-out infinite;
    }

    .squelette__vignette {
      flex: 0 0 auto;
      width: 56px;
      height: 56px;
      border-radius: var(--app-radius-input);
    }

    .squelette__corps {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: var(--app-space-2);
    }

    .squelette__ligne {
      height: 14px;
      border-radius: var(--app-radius-input);
    }

    .squelette__ligne--courte {
      width: 35%;
    }

    .squelette__ligne--moyenne {
      width: 60%;
    }

    @keyframes pulsation {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }
  `,
})
export class CarteSqueletteComponent {}
