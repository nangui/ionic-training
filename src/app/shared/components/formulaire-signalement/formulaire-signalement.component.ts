import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, close, locate, refresh } from 'ionicons/icons';

import { compresserImage } from '../../../core/models/image';
import { formaterCoordonnees } from '../../../core/models/signalement.format';
import {
  CATEGORIES_SIGNALEMENT,
  LIBELLES_CATEGORIE,
  SignalementCreation,
} from '../../../core/models/signalement.model';

/** Etat du bloc position. */
export type EtatPosition = 'vide' | 'chargement' | 'rempli' | 'refuse';

/** Ce que le formulaire remonte une fois valide : le contrat de l'API. */
export type BrouillonSignalement = SignalementCreation;

@Component({
  selector: 'app-formulaire-signalement',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'formulaire-signalement.component.html',
  styleUrls: ['formulaire-signalement.component.scss'],
  imports: [ReactiveFormsModule, IonIcon, IonSpinner],
})
export class FormulaireSignalementComponent {
  private readonly fb = inject(FormBuilder);

  readonly envoye = output<BrouillonSignalement>();
  readonly annule = output<void>();

  readonly categories = CATEGORIES_SIGNALEMENT;
  readonly libellesCategorie = LIBELLES_CATEGORIE;

  readonly formulaire = this.fb.nonNullable.group({
    titre: ['', [Validators.required, Validators.maxLength(120)]],
    categorie: ['voirie', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    latitude: [0],
    longitude: [0],
  });

  readonly photo = signal<string | undefined>(undefined);
  readonly etatPosition = signal<EtatPosition>('vide');
  readonly envoiEnCours = signal(false);

  /**
   * Coordonnees relevees, telles qu'affichees dans le bloc position.
   * Un `computed` sur le FormGroup ne conviendrait pas : un formulaire
   * reactif n'est pas un signal, la valeur ne serait jamais recalculee.
   */
  readonly coordonnees = signal('');

  constructor() {
    addIcons({ camera, close, locate, refresh });
  }

  /** Vrai si le champ doit afficher son erreur : invalide ET deja quitte. */
  enErreur(nom: 'titre' | 'categorie' | 'description'): boolean {
    const champ = this.formulaire.controls[nom];
    return champ.invalid && champ.touched;
  }

  messageErreur(nom: 'titre' | 'description'): string {
    const erreurs = this.formulaire.controls[nom].errors;
    if (erreurs?.['required']) {
      return nom === 'titre'
        ? 'Donnez un titre court au problème, par exemple « Nid-de-poule rue Victor Hugo ».'
        : 'Décrivez le problème pour que les services techniques puissent intervenir.';
    }
    if (erreurs?.['minlength']) {
      return 'Ajoutez quelques mots de plus : au moins 10 caractères.';
    }
    if (erreurs?.['maxlength']) {
      return 'Le titre ne doit pas dépasser 120 caractères.';
    }
    return '';
  }

  /** Lit le fichier choisi, le compresse, et le stocke en data URI base64. */
  async choisirPhoto(evenement: Event): Promise<void> {
    const fichier = (evenement.target as HTMLInputElement).files?.[0];
    if (!fichier) {
      return;
    }
    this.photo.set(await compresserImage(fichier));
  }

  retirerPhoto(): void {
    this.photo.set(undefined);
  }

  /**
   * Geolocalisation de l'appareil. Un refus n'est jamais bloquant : la saisie
   * manuelle des coordonnees reste possible.
   */
  localiser(): void {
    if (!navigator.geolocation) {
      this.etatPosition.set('refuse');
      return;
    }
    this.etatPosition.set('chargement');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.formulaire.patchValue({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        this.coordonnees.set(
          formaterCoordonnees(position.coords.latitude, position.coords.longitude),
        );
        this.etatPosition.set('rempli');
      },
      () => this.etatPosition.set('refuse'),
      { timeout: 10_000 },
    );
  }

  soumettre(): void {
    if (this.formulaire.invalid) {
      // Rend visibles les erreurs des champs jamais touches.
      this.formulaire.markAllAsTouched();
      return;
    }
    this.envoiEnCours.set(true);
    const valeurs = this.formulaire.getRawValue();
    this.envoye.emit({
      titre: valeurs.titre,
      description: valeurs.description,
      categorie: valeurs.categorie as BrouillonSignalement['categorie'],
      // L'API attend null et non undefined pour « pas de photo ».
      photo: this.photo() ?? null,
      latitude: valeurs.latitude,
      longitude: valeurs.longitude,
    });
  }

  /** Rend la main au formulaire apres un envoi (reussi ou non). */
  terminerEnvoi(): void {
    this.envoiEnCours.set(false);
  }
}
