import { InjectionToken, Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, ImageOptions } from '@capacitor/camera';

import { LARGEUR_MAX_PHOTO, QUALITE_PHOTO, compresserImage } from '../models/image';
import { PreferencesService } from './preferences.service';

/** Pourquoi une capture n'a pas abouti. */
export type EchecPhoto = 'refus' | 'annulation' | 'erreur';

export class ErreurPhoto extends Error {
  constructor(
    readonly motif: EchecPhoto,
    message: string,
  ) {
    super(message);
    this.name = 'ErreurPhoto';
  }
}

/** La part du plugin dont le service a besoin. */
export interface PluginCamera {
  checkPermissions(): Promise<{ camera: string; photos: string }>;
  requestPermissions(): Promise<{ camera: string; photos: string }>;
  getPhoto(options: ImageOptions): Promise<{ dataUrl?: string }>;
}

/**
 * Le plugin, injecte plutot que reference en dur.
 *
 * Le jeton n'expose pas le proxy Capacitor directement mais un objet qui lui
 * delegue : Angular appelle `ngOnDestroy()` sur les valeurs fournies qui en
 * possedent une, et un proxy repond a n'importe quel nom de propriete.
 */
export const PLUGIN_CAMERA = new InjectionToken<PluginCamera>('plugin camera', {
  providedIn: 'root',
  factory: () => ({
    checkPermissions: () => Camera.checkPermissions(),
    requestPermissions: () => Camera.requestPermissions(),
    getPhoto: (options) => Camera.getPhoto(options),
  }),
});

/** Plateforme courante, isolee pour rester testable. */
export const PLATEFORME = new InjectionToken<() => string>('plateforme', {
  providedIn: 'root',
  factory: () => () => Capacitor.getPlatform(),
});

/**
 * Prise de photo.
 *
 * `CameraSource.Prompt` laisse l'utilisateur choisir entre l'appareil photo
 * et la galerie : c'est le repli demande quand l'acces a la camera est
 * refuse, et il evite d'avoir a le coder nous-memes.
 */
@Injectable({ providedIn: 'root' })
export class PhotoService {
  private readonly camera = inject(PLUGIN_CAMERA);
  private readonly plateforme = inject(PLATEFORME);
  private readonly preferences = inject(PreferencesService);

  /** Renvoie une photo en data URI, ou leve une ErreurPhoto. */
  async capturer(): Promise<string> {
    await this.verifierPermissions();

    const compresser = this.preferences.compressionPhoto();

    let resultat: { dataUrl?: string };
    try {
      resultat = await this.camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        // Redimensionnement natif : bien moins couteux qu'un passage par
        // canvas, et il evite de charger l'image pleine taille en memoire.
        // Desactivable par le reglage « Compresser les photos ».
        ...(compresser
          ? { width: LARGEUR_MAX_PHOTO, quality: Math.round(QUALITE_PHOTO * 100) }
          : { quality: 100 }),
        correctOrientation: true,
        promptLabelHeader: 'Photo du signalement',
        promptLabelPhoto: 'Choisir dans la galerie',
        promptLabelPicture: 'Prendre une photo',
        promptLabelCancel: 'Annuler',
      });
    } catch (erreur) {
      // Le plugin leve aussi quand l'utilisateur ferme la feuille de choix.
      const message = erreur instanceof Error ? erreur.message : '';
      if (/cancel/i.test(message)) {
        throw new ErreurPhoto('annulation', 'Prise de photo annulée.');
      }
      throw new ErreurPhoto('erreur', "La photo n'a pas pu être récupérée.");
    }

    if (!resultat.dataUrl) {
      throw new ErreurPhoto('erreur', "La photo n'a pas pu être lue.");
    }

    // Sur le web, le plugin ne respecte ni width ni quality pour un fichier
    // choisi : on repasse par la compression canvas. Sur mobile c'est deja
    // fait nativement, une seconde passe ne ferait que degrader l'image.
    if (compresser && this.plateforme() === 'web') {
      return compresserImage(await enFichier(resultat.dataUrl));
    }
    return resultat.dataUrl;
  }

  private async verifierPermissions(): Promise<void> {
    let etat = await this.camera.checkPermissions();
    if (etat.camera === 'prompt' || etat.photos === 'prompt') {
      etat = await this.camera.requestPermissions();
    }
    if (etat.camera === 'denied' && etat.photos === 'denied') {
      throw new ErreurPhoto(
        'refus',
        "L'accès à l'appareil photo et à la galerie est refusé. Vous pouvez envoyer le signalement sans photo.",
      );
    }
  }
}

/** Reconstruit un File a partir d'un data URI, pour la compression canvas. */
async function enFichier(dataUri: string): Promise<File> {
  const reponse = await fetch(dataUri);
  const blob = await reponse.blob();
  return new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' });
}
