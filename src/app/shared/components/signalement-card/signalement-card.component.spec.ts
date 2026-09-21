import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Signalement } from '../../../core/models/signalement.model';
import { SignalementCardComponent } from './signalement-card.component';

const SIGNALEMENT: Signalement = {
  id: 42,
  titre: 'Banc cassé square Jean Moulin',
  description: 'Deux lattes arrachées.',
  categorie: 'voirie',
  statut: 'en_cours',
  photo: null,
  latitude: 48.87,
  longitude: 2.37,
  dateCreation: '2026-09-18T09:30:00.000Z',
};

describe('SignalementCardComponent', () => {
  let fixture: ComponentFixture<SignalementCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SignalementCardComponent);
    fixture.componentRef.setInput('signalement', SIGNALEMENT);
    fixture.componentRef.setInput('lien', ['/tabs/signalements', SIGNALEMENT.id]);
    fixture.detectChanges();
  });

  it('rend la carte entiere comme un seul lien vers le detail', () => {
    const lien = fixture.nativeElement.querySelector('a.carte');

    expect(lien).toBeTruthy();
    expect(lien.getAttribute('href')).toBe('/tabs/signalements/42');
  });

  it('annonce titre, statut, categorie et date d un seul tenant', () => {
    const libelle = fixture.nativeElement
      .querySelector('a.carte')
      .getAttribute('aria-label');

    expect(libelle).toContain('Banc cassé square Jean Moulin');
    expect(libelle).toContain('En cours');
    expect(libelle).toContain('Voirie');
  });

  it('ecrit le statut en toutes lettres, la couleur ne porte pas seule le sens', () => {
    const chip = fixture.nativeElement.querySelector('.chip');

    expect(chip.textContent.trim()).toBe('En cours');
  });

  it('remplace la photo absente par l icone de la categorie', () => {
    expect(fixture.nativeElement.querySelector('.vignette__image')).toBeNull();
    expect(fixture.nativeElement.querySelector('.vignette__icone')).toBeTruthy();
  });
});
