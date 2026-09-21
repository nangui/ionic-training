import { ChangeDetectionStrategy, Component, effect, output, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircle, search } from 'ionicons/icons';

/** Pause apres la derniere frappe avant de declencher la recherche. */
const DELAI_ANTIREBOND_MS = 300;

@Component({
  selector: 'app-barre-recherche',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'barre-recherche.component.html',
  styleUrls: ['barre-recherche.component.scss'],
  imports: [IonIcon],
})
export class BarreRechercheComponent {
  /** Terme recherche, emis apres la pause d'antirebond. */
  readonly recherche = output<string>();

  /** Ce que l'utilisateur voit dans le champ, mis a jour a chaque frappe. */
  readonly saisie = signal('');

  private minuteur?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ search, closeCircle });

    effect((surDestruction) => {
      const valeur = this.saisie();
      clearTimeout(this.minuteur);
      // Antirebond : on n'interroge pas la liste a chaque caractere.
      this.minuteur = setTimeout(
        () => this.recherche.emit(valeur.trim()),
        DELAI_ANTIREBOND_MS,
      );
      surDestruction(() => clearTimeout(this.minuteur));
    });
  }

  surSaisie(evenement: Event): void {
    this.saisie.set((evenement.target as HTMLInputElement).value);
  }

  effacer(): void {
    this.saisie.set('');
  }
}
