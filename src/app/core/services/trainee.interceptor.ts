import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '../../../environments/environment';

/**
 * Ajoute l'en-tete `X-Trainee` a toutes les requetes vers l'API.
 *
 * C'est lui qui determine le jeu de donnees manipule : sans lui, on ecrit
 * dans le jeu commun « demo », partage par toute la promotion.
 *
 * Pose en intercepteur plutot que dans chaque appel : un oubli passerait
 * inapercu jusqu'au moment ou l'on modifierait les donnees d'un autre.
 */
export const traineeInterceptor: HttpInterceptorFn = (requete, suivant) => {
  if (!requete.url.startsWith(environment.apiUrl)) {
    return suivant(requete);
  }

  return suivant(
    requete.clone({ setHeaders: { 'X-Trainee': environment.trainee } }),
  );
};
