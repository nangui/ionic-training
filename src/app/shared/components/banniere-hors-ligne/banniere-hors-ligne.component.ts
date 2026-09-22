import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOffline, cloudUpload } from 'ionicons/icons';

/**
 * Bandeau d'etat affiche sous l'en-tete.
 *
 * Non masquable : c'est une information d'etat, pas une notification. La
 * masquer laisserait l'utilisateur croire que ses signalements sont partis.
 */
@Component({
  selector: 'app-banniere-hors-ligne',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="banniere" [class.banniere--attente]="!horsLigne()" role="status">
      <ion-icon [name]="horsLigne() ? 'cloud-offline' : 'cloud-upload'" aria-hidden="true"></ion-icon>
      {{ message() }}
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

    .banniere--attente {
      background: var(--app-color-status-nouveau-bg);
      color: var(--app-color-status-nouveau-on-bg);
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
  readonly horsLigne = input.required<boolean>();
  readonly enAttente = input.required<number>();

  readonly message = computed(() => {
    const nombre = this.enAttente();
    const attente =
      nombre === 0
        ? ''
        : ` ${nombre} signalement${nombre > 1 ? 's' : ''} en attente d'envoi.`;

    return this.horsLigne()
      ? `Hors ligne. Vos signalements sont enregistrés et partiront au retour du réseau.${attente}`
      : `Envoi en cours.${attente}`.trim();
  });

  constructor() {
    addIcons({ cloudOffline, cloudUpload });
  }
}
