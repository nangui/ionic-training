import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CriteresRecherche,
  PageSignalements,
  Signalement,
  SignalementCreation,
} from '../models/signalement.model';

/** Erreur metier remontee aux ecrans, deja traduite en francais. */
export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
  ) {
    super(message);
    this.name = 'ErreurApi';
  }
}

/** Traduit une erreur HTTP en message affichable. */
function traduire(erreur: unknown): ErreurApi {
  if (!(erreur instanceof HttpErrorResponse)) {
    return new ErreurApi('Une erreur inattendue est survenue.', 0);
  }
  // Statut 0 : la requete n'est jamais partie (pas de reseau, DNS, CORS).
  if (erreur.status === 0) {
    return new ErreurApi('Le serveur est injoignable.', 0);
  }
  if (erreur.status === 404) {
    return new ErreurApi('Ce signalement n\'existe pas ou plus.', 404);
  }
  // L'API renvoie { erreur: "..." } ; on prefere son message au notre.
  const message =
    typeof erreur.error?.erreur === 'string'
      ? erreur.error.erreur
      : 'Le serveur a refusé la demande.';
  return new ErreurApi(message, erreur.status);
}

/**
 * Acces aux signalements via l'API de formation.
 *
 * Le filtrage, la recherche et la pagination sont delegues au serveur : lui
 * seul connait l'ensemble des donnees, filtrer la page recue cote client
 * donnerait des resultats faux des que la liste depasse une page.
 */
@Injectable({ providedIn: 'root' })
export class SignalementService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/signalements`;

  /** Une page de signalements, filtree et paginee par le serveur. */
  async lister(criteres: CriteresRecherche = {}): Promise<PageSignalements> {
    let parametres = new HttpParams();
    for (const [cle, valeur] of Object.entries(criteres)) {
      if (valeur !== undefined && valeur !== '') {
        parametres = parametres.set(cle, String(valeur));
      }
    }

    try {
      return await firstValueFrom(
        this.http.get<PageSignalements>(this.base, { params: parametres }),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /** Un signalement par son identifiant. */
  async trouver(id: number): Promise<Signalement> {
    try {
      return await firstValueFrom(
        this.http.get<Signalement>(`${this.base}/${id}`),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /** Cree un signalement et renvoie celui que l'API a enregistre. */
  async creer(brouillon: SignalementCreation): Promise<Signalement> {
    try {
      return await firstValueFrom(
        this.http.post<Signalement>(this.base, brouillon),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /** Restaure le jeu de donnees initial du participant. */
  async reinitialiser(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<unknown>(`${environment.apiUrl}/reset`, {}),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }
}
