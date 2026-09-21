import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOffline } from 'ionicons/icons';

/**
 * Bandeau affiche sous l'en-tete quand l'appareil n'a plus de reseau.
 *
 * Non masquable : c'est une information d'etat, pas une notification. La
 * masquer laisserait l'utilisateur croire que son signalement part.
 */
@Component({
  selector: 'app-banniere-hors-ligne',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="banniere" role="status">
      <ion-icon name="cloud-offline" aria-hidden="true"></ion-icon>
      Hors ligne. La création de signalement est indisponible.
    </p>
  `,
  styles: `
    .banniere {
      display: flex;
      align-items: center;
      gap: var(--app-space-2);
      margin: 0;
      padding: var(--app-space-3) var(--app-space-4);
      background: var(--app-color-status-encours-bg);
      color: var(--app-color-status-encours-on-bg);
      font-size: var(--app-font-meta);
      line-height: 1.4;
    }

    ion-icon {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
    }
  `,
  imports: [IonIcon],
})
export class BanniereHorsLigneComponent {
  constructor() {
    addIcons({ cloudOffline });
  }
}
