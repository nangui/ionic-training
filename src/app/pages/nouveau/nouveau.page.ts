import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, ToastController } from '@ionic/angular';

import { SignalementService } from '../../core/services/signalement.service';
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
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly signalementService = inject(SignalementService);

  private readonly formulaire = viewChild(FormulaireSignalementComponent);

  async enregistrer(brouillon: BrouillonSignalement): Promise<void> {
    try {
      const cree = await this.signalementService.creer(brouillon);
      this.formulaire()?.terminerEnvoi();
      const toast = await this.toastController.create({
        message: `« ${cree.titre} » a été envoyé.`,
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
      await this.router.navigate(['/tabs/signalements']);
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
    await this.router.navigate(['/tabs/signalements']);
  }
}
