import { Sequenceur } from './sequenceur';

describe('Sequenceur', () => {
  it('considere la derniere lecture demarree comme la courante', () => {
    const sequence = new Sequenceur();

    const premiere = sequence.demarrer();

    expect(sequence.estCourant(premiere)).toBe(true);
  });

  it('invalide une lecture doublee par une plus recente', () => {
    const sequence = new Sequenceur();

    const lente = sequence.demarrer();
    const rapide = sequence.demarrer();

    // C'est tout l'objet : la reponse lente arrive en dernier mais ne doit
    // pas ecraser le resultat de la plus recente.
    expect(sequence.estCourant(lente)).toBe(false);
    expect(sequence.estCourant(rapide)).toBe(true);
  });

  it('invalide tout apres un arret', () => {
    const sequence = new Sequenceur();
    const lecture = sequence.demarrer();

    sequence.arreter();

    expect(sequence.estCourant(lecture)).toBe(false);
  });

  it('reste arrete pour les lectures suivantes', () => {
    const sequence = new Sequenceur();
    sequence.arreter();

    expect(sequence.estCourant(sequence.demarrer())).toBe(false);
  });
});
