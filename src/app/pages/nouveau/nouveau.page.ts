import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  NavController,
  ToastController,
} from '@ionic/angular';

import { FileEnvoiService } from '../../core/services/file-envoi.service';
import {
  BrouillonSignalement,
  FormulaireSignalementComponent,
} from '../../shared/components/formulaire-signalement/formulaire-signalement.component';

@Component({
  selector: 'app-nouveau',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'nouveau.page.html',
  styleUrls: ['nouveau.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, FormulaireSignalementComponent],
})
export class NouveauPage {
  // NavController plutot que Router : lui seul anime la transition. Avec
  // Router, le retour a la liste se fait par un saut sec.
  private readonly navController = inject(NavController);
  private readonly toastController = inject(ToastController);
  private readonly fileEnvoi = inject(FileEnvoiService);

  private readonly formulaire = viewChild(FormulaireSignalementComponent);

  async enregistrer(brouillon: BrouillonSignalement): Promise<void> {
    try {
      const resultat = await this.fileEnvoi.soumettre(brouillon);
      this.formulaire()?.terminerEnvoi();
      const toast = await this.toastController.create({
        message:
          resultat === 'envoye'
            ? `« ${brouillon.titre} » a été envoyé.`
            : `« ${brouillon.titre} » est enregistré et partira dès le retour du réseau.`,
        duration: 3000,
        position: 'bottom',
        color: resultat === 'envoye' ? 'success' : 'warning',
      });
      await toast.present();
      await this.navController.navigateBack('/tabs/signalements');
    } catch (erreur) {
      // On reste sur le formulaire, saisie intacte.
      this.formulaire()?.terminerEnvoi();
      const toast = await this.toastController.create({
        message: erreur instanceof Error ? erreur.message : "L'envoi a échoué.",
        duration: 5000,
        position: 'bottom',
        color: 'danger',
        buttons: [
          { text: 'Réessayer', handler: () => void this.enregistrer(brouillon) },
        ],
      });
      await toast.present();
    }
  }

  async annuler(): Promise<void> {
    await this.navController.navigateBack('/tabs/signalements');
  }
}
