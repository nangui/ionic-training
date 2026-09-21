export const environment = {
  production: false,

  /** Base de l'API de formation. */
  apiUrl: 'https://setal-api-formation-production.up.railway.app',

  /**
   * Prenom envoye dans l'en-tete X-Trainee.
   *
   * Il determine le jeu de donnees manipule : chacun ne voit que ses propres
   * signalements. Sans en-tete, on travaille sur le jeu commun « demo ».
   * Ce mecanisme separe les donnees, il ne les protege pas.
   */
  trainee: 'Adonai',
};
