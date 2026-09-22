import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import {
  SignalementEnAttente,
  identifiantLocal,
} from '../models/file-envoi.model';
import { Signalement, SignalementCreation } from '../models/signalement.model';
import { PreferencesService } from './preferences.service';
import { ReseauService } from './reseau.service';
import { ErreurApi, SignalementService } from './signalement.service';
import { StockageService } from './stockage.service';

const CLE_FILE = 'app.fileEnvoi';

/**
 * Plafond de la file.
 *
 * Chaque entree porte sa photo en base64, soit typiquement 100 a 300 Ko
 * apres compression. Preferences s'appuie sur SharedPreferences et
 * UserDefaults, qui ne sont pas faits pour des dizaines de mega-octets.
 */
export const TAILLE_MAX_FILE = 20;

/**
 * Plafond reel de la file, en octets.
 *
 * C'est la taille qui compte, pas le nombre : SharedPreferences est charge
 * en memoire au demarrage de l'application, et une seule photo non
 * compressee suffirait a rendre un plafond exprime en entrees inoperant.
 */
export const POIDS_MAX_FILE = 5 * 1024 * 1024;

/** Ce qu'il est advenu d'une soumission. */
export type ResultatSoumission = 'envoye' | 'en_file';

/**
 * File d'envoi des signalements crees hors ligne.
 *
 * ## Pourquoi une file plutot qu'un envoi optimiste
 *
 * L'utilisateur est dehors, souvent sans reseau fiable. Lui refuser la
 * creation reviendrait a lui demander de revenir plus tard devant le
 * nid-de-poule. On enregistre donc localement et on envoie plus tard.
 *
 * ## Le probleme des doublons, et comment il est traite
 *
 * `POST /signalements` n'est pas idempotent et l'API n'accepte aucune cle
 * d'idempotence : si la requete atteint le serveur mais que la reponse se
 * perd, un reessai cree un second signalement identique.
 *
 * La politique est donc volontairement prudente :
 *
 * - statut 0 - la requete n'est jamais partie (pas de reseau, DNS, CORS).
 *   Le serveur n'a rien vu, le reessai est sur. On garde l'entree en file.
 * - toute reponse recue, y compris une erreur 4xx ou 5xx. Le serveur a
 *   peut-etre enregistre. On marque l'entree en echec et on laisse
 *   l'utilisateur decider, plutot que de risquer un doublon dans son dos.
 *
 * Le jour ou l'API acceptera une cle d'idempotence, le second cas pourra
 * devenir un reessai automatique.
 */
@Injectable({ providedIn: 'root' })
export class FileEnvoiService {
  private readonly stockage = inject(StockageService);
  private readonly signalementService = inject(SignalementService);
  private readonly reseau = inject(ReseauService);
  private readonly preferences = inject(PreferencesService);

  private readonly entrees = signal<SignalementEnAttente[]>([]);

  /** Tout ce qui attend, echecs compris. */
  readonly enAttente = this.entrees.asReadonly();

  readonly nombreEnAttente = computed(() => this.entrees().length);

  readonly aDesEchecs = computed(() =>
    this.entrees().some((entree) => entree.etat === 'echec'),
  );

  readonly synchronisationEnCours = signal(false);

  /** Resolue quand la file initiale a ete relue du stockage. */
  readonly pret: Promise<void>;

  constructor() {
    this.pret = this.restaurer();

    // Le retour du reseau declenche la synchronisation.
    //
    // La file est lue dans `untracked` : sans ca, l'effet dependrait d'un
    // signal que `synchroniser()` ecrit lui-meme, et chaque ecriture le
    // relancerait. Mesure avant correction : 38 envois en 60 ms pour une
    // seule entree.
    effect(() => {
      const enLigne = this.reseau.enLigne();
      untracked(() => {
        if (enLigne && this.entrees().some((e) => e.etat === 'en_attente')) {
          void this.synchroniser();
        }
      });
    });
  }

  /**
   * Envoie maintenant si c'est possible, met en file sinon.
   *
   * Renvoie ce qui s'est reellement passe, pour que l'ecran puisse le dire
   * a l'utilisateur sans avoir a redeviner la regle.
   */
  async soumettre(brouillon: SignalementCreation): Promise<ResultatSoumission> {
    if (!this.envoiPossible()) {
      await this.empiler(brouillon);
      return 'en_file';
    }

    try {
      await this.signalementService.creer(brouillon);
      return 'envoye';
    } catch (erreur) {
      // Requete jamais partie : la mise en file est sure et l'utilisateur
      // ne perd pas sa saisie.
      if (erreur instanceof ErreurApi && erreur.statut === 0) {
        await this.empiler(brouillon);
        return 'en_file';
      }
      // Le serveur a repondu : il a peut-etre enregistre. On ne met pas en
      // file, on remonte l'erreur telle quelle.
      throw erreur;
    }
  }

  /** Tente d'envoyer tout ce qui attend, dans l'ordre d'arrivee. */
  async synchroniser(): Promise<void> {
    if (this.synchronisationEnCours() || !this.envoiPossible()) {
      return;
    }
    this.synchronisationEnCours.set(true);

    try {
      // Seules les entrees en attente sont tentees. Une entree en echec a
      // recu une reponse du serveur : il a peut-etre enregistre, la
      // reessayer d'office creerait un doublon. C'est a l'utilisateur de
      // decider, via « Reessayer ».
      const aEnvoyer = this.entrees().filter((e) => e.etat === 'en_attente');
      for (const entree of aEnvoyer) {
        const envoye = await this.tenter(entree);
        // Un echec reseau arrete la boucle : inutile d'insister sur les
        // suivantes, et l'ordre de creation est preserve.
        if (!envoye) {
          break;
        }
      }
    } finally {
      this.synchronisationEnCours.set(false);
    }
  }

  /** Remet une entree en echec dans l'etat « en attente ». */
  async reessayer(id: string): Promise<void> {
    this.entrees.update((liste) =>
      liste.map((entree) =>
        entree.id === id
          ? { ...entree, etat: 'en_attente' as const, motifEchec: undefined }
          : entree,
      ),
    );
    await this.persister();
    await this.synchroniser();
  }

  /** Abandonne une entree : l'utilisateur renonce a l'envoyer. */
  async abandonner(id: string): Promise<void> {
    this.entrees.update((liste) => liste.filter((entree) => entree.id !== id));
    await this.persister();
  }

  /**
   * Represente une entree en file comme un signalement affichable.
   * L'identifiant est negatif : il ne peut pas entrer en collision avec un
   * identifiant serveur, et il rend la confusion visible en cas d'erreur.
   */
  enSignalement(entree: SignalementEnAttente, rang: number): Signalement {
    return {
      id: -(rang + 1),
      titre: entree.brouillon.titre,
      categorie: entree.brouillon.categorie,
      description: entree.brouillon.description,
      photo: entree.brouillon.photo ?? null,
      latitude: entree.brouillon.latitude,
      longitude: entree.brouillon.longitude,
      statut: 'nouveau',
      dateCreation: entree.dateCreation,
    };
  }

  private async tenter(entree: SignalementEnAttente): Promise<boolean> {
    try {
      await this.signalementService.creer(entree.brouillon);
      await this.retirer(entree.id);
      return true;
    } catch (erreur) {
      const reseauMuet = erreur instanceof ErreurApi && erreur.statut === 0;
      await this.marquer(
        entree.id,
        reseauMuet ? 'en_attente' : 'echec',
        reseauMuet
          ? undefined
          : erreur instanceof Error
            ? erreur.message
            : "L'envoi a échoué.",
      );
      return false;
    }
  }

  /** Faux quand on est hors ligne, ou hors Wi-Fi si le reglage l'exige. */
  private envoiPossible(): boolean {
    if (!this.reseau.enLigne()) {
      return false;
    }
    if (!this.preferences.envoiWifiSeulement()) {
      return true;
    }
    const type = this.reseau.typeConnexion();
    return type === 'wifi' || type === 'unknown';
  }

  private async empiler(brouillon: SignalementCreation): Promise<void> {
    const nouvelle: SignalementEnAttente = {
      id: identifiantLocal(),
      brouillon,
      dateCreation: new Date().toISOString(),
      etat: 'en_attente',
      tentatives: 0,
    };

    const candidate = [...this.entrees(), nouvelle];
    if (candidate.length > TAILLE_MAX_FILE || this.poids(candidate) > POIDS_MAX_FILE) {
      throw new Error(
        "La réserve hors-ligne est pleine. Connectez-vous pour envoyer ce qui attend avant d'en créer un nouveau.",
      );
    }

    this.entrees.set(candidate);
    await this.persister();
  }

  /** Taille serialisee de la file, photos comprises. */
  private poids(entrees: SignalementEnAttente[]): number {
    try {
      return JSON.stringify(entrees).length;
    } catch {
      return 0;
    }
  }

  private async retirer(id: string): Promise<void> {
    this.entrees.update((liste) => liste.filter((entree) => entree.id !== id));
    await this.persister();
  }

  private async marquer(
    id: string,
    etat: SignalementEnAttente['etat'],
    motifEchec?: string,
  ): Promise<void> {
    this.entrees.update((liste) =>
      liste.map((entree) =>
        entree.id === id
          ? { ...entree, etat, motifEchec, tentatives: entree.tentatives + 1 }
          : entree,
      ),
    );
    await this.persister();
  }

  private async restaurer(): Promise<void> {
    this.entrees.set(
      await this.stockage.lire<SignalementEnAttente[]>(CLE_FILE, []),
    );
  }

  private async persister(): Promise<void> {
    await this.stockage.ecrire(CLE_FILE, this.entrees());
  }
}
