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
import { AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { contrast, informationCircle, image, refresh, wifi } from 'ionicons/icons';

import { PreferencesService } from '../../core/services/preferences.service';
import { ReseauService } from '../../core/services/reseau.service';
import { SignalementService } from '../../core/services/signalement.service';

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
  private readonly signalementService = inject(SignalementService);
  private readonly preferences = inject(PreferencesService);
  private readonly reseau = inject(ReseauService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  readonly reinitialisationEnCours = signal(false);

  // Reglages reellement appliques, et persistes d'une session a l'autre.
  readonly envoiWifiSeulement = this.preferences.envoiWifiSeulement;
  readonly compressionPhoto = this.preferences.compressionPhoto;

  /** Sert a dire a l'utilisateur ce que le reglage Wi-Fi implique ici. */
  readonly typeConnexion = this.reseau.typeConnexion;

  /** Le theme, lui, est bien persiste. */
  readonly preferenceTheme = this.themeService.preference;
  readonly sombreActif = this.themeService.sombreActif;

  /** Source unique : la version declaree dans package.json. */
  readonly version = version;

  constructor() {
    addIcons({ wifi, image, contrast, informationCircle, refresh });
  }

  /** Restaure le jeu de donnees initial du participant, apres confirmation. */
  async reinitialiser(): Promise<void> {
    const alerte = await this.alertController.create({
      header: 'Restaurer le jeu initial ?',
      message:
        'Vos signalements seront remplacés par le jeu de départ. Cette action est irréversible.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Restaurer', role: 'destructive', handler: () => void this.lancerReinitialisation() },
      ],
    });
    await alerte.present();
  }

  private async lancerReinitialisation(): Promise<void> {
    this.reinitialisationEnCours.set(true);
    try {
      await this.signalementService.reinitialiser();
      await this.annoncer('Jeu de données restauré.', 'success');
    } catch (erreur) {
      await this.annoncer(
        erreur instanceof Error ? erreur.message : 'La restauration a échoué.',
        'danger',
      );
    } finally {
      this.reinitialisationEnCours.set(false);
    }
  }

  private async annoncer(message: string, couleur: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: couleur,
    });
    await toast.present();
  }

  changerTheme(preference: string | undefined): void {
    if (preference === 'systeme' || preference === 'clair' || preference === 'sombre') {
      this.themeService.definir(preference satisfies PreferenceTheme);
    }
  }
}
