/**
 * Garde contre les reponses obsoletes.
 *
 * Quand deux lectures asynchrones se chevauchent, c'est la derniere a
 * *repondre* qui gagne, pas la derniere *demandee*. Une reponse lente
 * correspondant a un filtre abandonne peut donc ecraser une reponse recente.
 *
 * Extrait en objet nomme plutot que recopie : le defaut avait ete corrige
 * dans un chargeur, puis reintroduit tel quel dans le suivant, quinze lignes
 * plus bas dans le meme fichier. Un correctif local ne se propage pas seul.
 *
 * ```ts
 * const jeton = this.sequence.demarrer();
 * const donnees = await lireQuelquePart();
 * if (this.sequence.estCourant(jeton)) {
 *   this.donnees.set(donnees);
 * }
 * ```
 */
export class Sequenceur {
  private dernier = 0;
  private arrete = false;

  /** Ouvre une lecture et renvoie son jeton. */
  demarrer(): number {
    return ++this.dernier;
  }

  /** Faux si une lecture plus recente a commence, ou si tout est arrete. */
  estCourant(jeton: number): boolean {
    return !this.arrete && jeton === this.dernier;
  }

  /** Invalide toutes les lectures en cours, par exemple a la destruction. */
  arreter(): void {
    this.arrete = true;
  }
}
