import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { contrast, informationCircle, notifications, wifi } from 'ionicons/icons';

import { PreferenceTheme, ThemeService } from '../../core/services/theme.service';
import { version } from '../../../../package.json';

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
    IonSegment,
    IonSegmentButton,
  ],
})
export class ReglagesPage {
  private readonly themeService = inject(ThemeService);

  // Reglages statiques : l'etat vit en memoire, rien n'est encore persiste.
  readonly notificationsActives = signal(true);
  readonly envoiWifiSeulement = signal(false);
  readonly compressionPhoto = signal(true);

  /** Le theme, lui, est bien persiste. */
  readonly preferenceTheme = this.themeService.preference;
  readonly sombreActif = this.themeService.sombreActif;

  /** Source unique : la version declaree dans package.json. */
  readonly version = version;

  constructor() {
    addIcons({ notifications, wifi, contrast, informationCircle });
  }

  changerTheme(preference: string | undefined): void {
    if (preference === 'systeme' || preference === 'clair' || preference === 'sombre') {
      this.themeService.definir(preference satisfies PreferenceTheme);
    }
  }
}
