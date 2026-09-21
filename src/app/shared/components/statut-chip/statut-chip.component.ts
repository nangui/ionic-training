import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  LIBELLES_STATUT,
  StatutSignalement,
} from '../../../core/models/signalement.model';

/**
 * Etiquette de statut.
 *
 * Le libelle est toujours ecrit en toutes lettres : la couleur seule ne
 * porte jamais l'information (daltonismes, lecture en plein soleil).
 */
@Component({
  selector: 'app-statut-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip" [class]="classe()">{{ libelle() }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: var(--app-space-1) var(--app-space-3);
      border-radius: var(--app-radius-chip);
      font-size: var(--app-font-chip);
      font-weight: var(--app-font-chip-weight);
      line-height: 1.4;
      white-space: nowrap;
    }

    .chip--nouveau {
      background: var(--app-color-status-nouveau-bg);
      color: var(--app-color-status-nouveau-on-bg);
    }

    .chip--encours {
      background: var(--app-color-status-encours-bg);
      color: var(--app-color-status-encours-on-bg);
    }

    .chip--resolu {
      background: var(--app-color-status-resolu-bg);
      color: var(--app-color-status-resolu-on-bg);
    }
  `,
})
export class StatutChipComponent {
  readonly statut = input.required<StatutSignalement>();

  readonly libelle = computed(() => LIBELLES_STATUT[this.statut()]);

  readonly classe = computed(
    () =>
      ({
        nouveau: 'chip--nouveau',
        en_cours: 'chip--encours',
        resolu: 'chip--resolu',
      })[this.statut()],
  );
}
