import { SignalementCreation } from './signalement.model';

/** Etat d'un signalement en attente d'envoi. */
export type EtatEnvoi = 'en_attente' | 'echec';

/**
 * Un signalement cree hors ligne, ou dont l'envoi a echoue.
 *
 * L'identifiant est local et prefixe : il ne doit jamais etre confondu avec
 * un identifiant serveur, qui est numerique.
 */
export interface SignalementEnAttente {
  /** Identifiant local, ex. `local-1758...-a3f`. */
  id: string;
  brouillon: SignalementCreation;
  /** Date de mise en file, ISO 8601. */
  dateCreation: string;
  etat: EtatEnvoi;
  /** Message du dernier echec, affiche a l'utilisateur. */
  motifEchec?: string;
  /** Nombre de tentatives d'envoi deja faites. */
  tentatives: number;
}

/** Instantane de la liste, servi quand le reseau manque. */
export interface CacheListe {
  signalements: unknown[];
  total: number;
  /** Date de la mise en cache, ISO 8601. */
  dateCache: string;
}

export function identifiantLocal(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
