import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PreferencesService } from './preferences.service';
import { ReseauService } from './reseau.service';
import {
  CriteresRecherche,
  PageSignalements,
  Signalement,
  SignalementCreation,
  SignalementModification,
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
  private readonly preferences = inject(PreferencesService);
  private readonly reseau = inject(ReseauService);
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
    // Verifie ici et non dans chaque ecran : c'est le point d'ecriture
    // unique, et les deux appelants affichent deja le message d'erreur.
    this.verifierPolitiqueEnvoi();

    try {
      return await firstValueFrom(
        this.http.post<Signalement>(this.base, brouillon),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /**
   * Modifie un signalement existant.
   *
   * PATCH et non PUT : on envoie les seuls champs qui changent, ce qui evite
   * d'ecraser avec des valeurs perimees ce qu'un autre aurait modifie
   * entre-temps.
   */
  async modifier(
    id: number,
    modifications: SignalementModification,
  ): Promise<Signalement> {
    try {
      return await firstValueFrom(
        this.http.patch<Signalement>(`${this.base}/${id}`, modifications),
      );
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /** Supprime un signalement. */
  async supprimer(id: number): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<unknown>(`${this.base}/${id}`));
    } catch (erreur) {
      throw traduire(erreur);
    }
  }

  /**
   * Refuse l'envoi si l'utilisateur a demande le Wi-Fi seul et qu'on est
   * sur autre chose. Le reglage sert a epargner un forfait de donnees : le
   * respecter silencieusement serait pire que de le dire.
   */
  private verifierPolitiqueEnvoi(): void {
    if (!this.preferences.envoiWifiSeulement()) {
      return;
    }
    const type = this.reseau.typeConnexion();
    if (type === 'wifi' || type === 'unknown') {
      return;
    }
    throw new ErreurApi(
      'Envoi en Wi-Fi uniquement : connectez-vous à un réseau Wi-Fi, ou désactivez ce réglage.',
      0,
    );
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
