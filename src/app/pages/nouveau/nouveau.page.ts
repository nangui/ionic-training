import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, ToastController } from '@ionic/angular';

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

  private readonly formulaire = viewChild(FormulaireSignalementComponent);

  async enregistrer(brouillon: BrouillonSignalement): Promise<void> {
    // Donnees statiques : rien n'est persiste a ce stade, on confirme et on
    // revient a la liste. Le branchement sur un service d'ecriture viendra
    // avec la persistance.
    const toast = await this.toastController.create({
      message: `« ${brouillon.titre} » a été envoyé.`,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
    this.formulaire()?.terminerEnvoi();
    await this.router.navigate(['/tabs/signalements']);
  }

  async annuler(): Promise<void> {
    await this.router.navigate(['/tabs/signalements']);
  }
}
