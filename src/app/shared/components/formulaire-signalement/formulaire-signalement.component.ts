import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, close, locate, refresh } from 'ionicons/icons';

import { formaterCoordonnees } from '../../../core/models/signalement.format';
import { ErreurPhoto, PhotoService } from '../../../core/services/photo.service';
import { PositionService } from '../../../core/services/position.service';
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
  private readonly photoService = inject(PhotoService);
  private readonly positionService = inject(PositionService);

  /** Valeurs de depart : renseignees en edition, vides en creation. */
  readonly valeursInitiales = input<BrouillonSignalement | undefined>(undefined);

  /** Libelle du bouton principal, qui differe selon le contexte. */
  readonly libelleEnvoi = input('Envoyer le signalement');

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

  /** Message affiche quand la position ou la photo a echoue. */
  readonly messagePosition = signal('');
  readonly messagePhoto = signal('');
  readonly envoiEnCours = signal(false);

  /**
   * Coordonnees relevees, telles qu'affichees dans le bloc position.
   * Un `computed` sur le FormGroup ne conviendrait pas : un formulaire
   * reactif n'est pas un signal, la valeur ne serait jamais recalculee.
   */
  readonly coordonnees = signal('');

  constructor() {
    addIcons({ camera, close, locate, refresh });

    effect(() => {
      const valeurs = this.valeursInitiales();
      if (!valeurs) {
        return;
      }
      this.formulaire.patchValue({
        titre: valeurs.titre,
        categorie: valeurs.categorie,
        description: valeurs.description,
        latitude: valeurs.latitude,
        longitude: valeurs.longitude,
      });
      this.photo.set(valeurs.photo ?? undefined);
      if (valeurs.latitude !== 0 || valeurs.longitude !== 0) {
        this.coordonnees.set(
          formaterCoordonnees(valeurs.latitude, valeurs.longitude),
        );
        this.etatPosition.set('rempli');
      }
    });
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

  /**
   * Appareil photo ou galerie, au choix de l'utilisateur.
   * Un refus n'empeche jamais l'envoi : la photo est facultative.
   */
  async choisirPhoto(): Promise<void> {
    this.messagePhoto.set('');
    try {
      this.photo.set(await this.photoService.capturer());
    } catch (erreur) {
      if (erreur instanceof ErreurPhoto && erreur.motif === 'annulation') {
        return;
      }
      this.messagePhoto.set(
        erreur instanceof Error ? erreur.message : "La photo n'a pas pu être ajoutée.",
      );
    }
  }

  retirerPhoto(): void {
    this.photo.set(undefined);
  }

  /**
   * Geolocalisation de l'appareil. Un refus n'est jamais bloquant : la
   * saisie sans position reste possible.
   */
  async localiser(): Promise<void> {
    this.etatPosition.set('chargement');
    this.messagePosition.set('');
    try {
      const { latitude, longitude } = await this.positionService.obtenir();
      this.formulaire.patchValue({ latitude, longitude });
      this.coordonnees.set(formaterCoordonnees(latitude, longitude));
      this.etatPosition.set('rempli');
    } catch (erreur) {
      this.messagePosition.set(
        erreur instanceof Error
          ? erreur.message
          : "La position n'a pas pu être déterminée.",
      );
      this.etatPosition.set('refuse');
    }
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
