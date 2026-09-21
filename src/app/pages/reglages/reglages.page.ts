import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';

import { version } from '../../../../package.json';
import { informationCircle, moon, notifications, wifi } from 'ionicons/icons';

@Component({
  selector: 'app-reglages',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'reglages.page.html',
  styleUrls: ['reglages.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonToggle,
    IonIcon,
  ],
})
export class ReglagesPage {
  // Reglages statiques : l'etat vit en memoire, rien n'est encore persiste.
  readonly notificationsActives = signal(true);
  readonly envoiWifiSeulement = signal(false);
  readonly compressionPhoto = signal(true);

  /** Source unique : la version declaree dans package.json. */
  readonly version = version;

  constructor() {
    addIcons({ notifications, wifi, moon, informationCircle });
  }
}
