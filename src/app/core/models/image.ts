/** Largeur maximale conservee pour une photo de signalement. */
export const LARGEUR_MAX_PHOTO = 1280;

/** Qualite JPEG appliquee a la reencodage. */
export const QUALITE_PHOTO = 0.7;

/**
 * Reduit une photo avant envoi et la renvoie en data URI.
 *
 * Une photo de telephone pese 3 a 5 Mo et part en base64 dans le corps du
 * POST, ce qui gonfle encore d'un tiers. Sur un reseau mobile, l'envoi
 * echoue ou expire. On plafonne donc la largeur et la qualite.
 *
 * Si le navigateur ne sait pas decoder l'image, on retombe sur le fichier
 * d'origine : mieux vaut un envoi lourd qu'un envoi perdu.
 */
export async function compresserImage(
  fichier: File,
  largeurMax = LARGEUR_MAX_PHOTO,
  qualite = QUALITE_PHOTO,
): Promise<string> {
  const original = await lireEnDataUri(fichier);

  try {
    const image = await chargerImage(original);
    const ratio = Math.min(1, largeurMax / image.width);
    if (ratio === 1 && fichier.type === 'image/jpeg') {
      return original;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);

    const contexte = canvas.getContext('2d');
    if (!contexte) {
      return original;
    }
    contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', qualite);
  } catch {
    return original;
  }
}

function lireEnDataUri(fichier: File): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resoudre(lecteur.result as string);
    lecteur.onerror = () => rejeter(new Error('Lecture du fichier impossible.'));
    lecteur.readAsDataURL(fichier);
  });
}

function chargerImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const image = new Image();
    image.onload = () => resoudre(image);
    image.onerror = () => rejeter(new Error('Image illisible.'));
    image.src = source;
  });
}
