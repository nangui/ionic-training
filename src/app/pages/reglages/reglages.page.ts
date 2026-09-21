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

  readonly version = '0.0.1';

  constructor() {
    addIcons({ notifications, wifi, moon, informationCircle });
  }
}
