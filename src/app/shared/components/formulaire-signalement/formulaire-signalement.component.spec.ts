import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormulaireSignalementComponent } from './formulaire-signalement.component';

describe('FormulaireSignalementComponent', () => {
  let fixture: ComponentFixture<FormulaireSignalementComponent>;
  let component: FormulaireSignalementComponent;

  const element = (selecteur: string): HTMLElement =>
    fixture.nativeElement.querySelector(selecteur);

  beforeEach(() => {
    fixture = TestBed.createComponent(FormulaireSignalementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marque les champs obligatoires pour les technologies d assistance', () => {
    expect(element('#titre').hasAttribute('required')).toBe(true);
    expect(element('#description').hasAttribute('required')).toBe(true);
  });

  it('n affiche aucune erreur sur un formulaire vierge', () => {
    expect(element('#titre-erreur')).toBeNull();
  });

  it('affiche l erreur seulement une fois le champ quitte', () => {
    component.formulaire.controls.titre.markAsTouched();
    fixture.detectChanges();

    expect(element('#titre-erreur')).toBeTruthy();
  });

  it('conserve le texte d aide sous l erreur', () => {
    component.formulaire.controls.titre.markAsTouched();
    fixture.detectChanges();

    expect(element('#titre-aide')).toBeTruthy();
    expect(element('#titre').getAttribute('aria-describedby')).toBe(
      'titre-aide titre-erreur',
    );
  });

  it('refuse de soumettre un formulaire invalide et revele les erreurs', () => {
    let emis = 0;
    component.envoye.subscribe(() => (emis += 1));

    component.soumettre();

    expect(emis).toBe(0);
    expect(component.formulaire.controls.description.touched).toBe(true);
  });

  it('emet le brouillon quand le formulaire est valide', () => {
    let titreEmis = '';
    component.envoye.subscribe((brouillon) => (titreEmis = brouillon.titre));

    component.formulaire.setValue({
      titre: 'Banc cassé square Jean Moulin',
      categorie: 'voirie',
      description: 'Deux lattes arrachées, le banc est inutilisable.',
      latitude: 48.87,
      longitude: 2.37,
    });
    component.soumettre();

    expect(titreEmis).toBe('Banc cassé square Jean Moulin');
    expect(component.envoiEnCours()).toBe(true);
  });
});
