import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Signalement } from '../../../core/models/signalement.model';
import { CarteSignalementsComponent } from './carte-signalements.component';
import { PointCarte } from './carte-signalements.model';

const point = (id: number, ouvrable = true): PointCarte => ({
  signalement: signalement(id),
  ouvrable,
});

const signalement = (id: number): Signalement => ({
  id,
  titre: `Signalement ${id}`,
  categorie: 'voirie',
  description: '',
  photo: null,
  latitude: 14.71 + id / 1000,
  longitude: -17.47,
  statut: 'nouveau',
  dateCreation: '2026-09-20T08:00:00.000Z',
});

/**
 * Le rendu des marqueurs n'est pas couvert : il passe par `preferCanvas`,
 * et jsdom n'implemente pas HTMLCanvasElement.getContext. Installer le
 * paquet `canvas` ferait entrer une dependance native dans le projet pour
 * un gain de couverture limite. Ce qui suit teste ce qui reste observable.
 */
describe('CarteSignalementsComponent', () => {
  let fixture: ComponentFixture<CarteSignalementsComponent>;

  const creer = (points: PointCarte[]): void => {
    fixture = TestBed.createComponent(CarteSignalementsComponent);
    fixture.componentRef.setInput('points', points);
    fixture.detectChanges();
  };

  it('initialise la carte dans son conteneur', () => {
    creer([]);

    const conteneur = fixture.nativeElement.querySelector('.carte-zone__toile');
    expect(conteneur.classList.contains('leaflet-container')).toBe(true);
  });

  it('affiche l attribution OpenStreetMap, obligatoire', () => {
    creer([]);

    const attribution = fixture.nativeElement.querySelector('.leaflet-control-attribution');
    expect(attribution.textContent).toContain('OpenStreetMap');
  });

  it('libere la carte a la destruction', () => {
    creer([]);
    const composant = fixture.componentInstance as unknown as { carte?: unknown };
    expect(composant.carte).toBeTruthy();

    fixture.destroy();

    // Sans remove(), Leaflet laisse ses ecouteurs sur window a chaque
    // aller-retour vers la carte.
    expect(composant.carte).toBeUndefined();
  });
});

describe('CarteSignalementsComponent : resume accessible', () => {
  /**
   * Lu sur le signal et non dans le DOM : afficher des marqueurs exige un
   * canvas, que jsdom n'implemente pas. On evite donc la detection de
   * changements, qui declencherait le dessin.
   */
  const resume = (points: PointCarte[]): string => {
    const fixture = TestBed.createComponent(CarteSignalementsComponent);
    fixture.componentRef.setInput('points', points);
    return fixture.componentInstance.resumeAccessible();
  };

  it('annonce le nombre de points et renvoie vers la vue liste', () => {
    // Les marqueurs sont dans un canvas : invisibles aux lecteurs d'ecran.
    // Ce resume est leur seule porte d'entree.
    const texte = resume([point(1), point(2)]);

    expect(texte).toContain('2 signalements');
    expect(texte).toContain('vue liste');
  });

  it('le dit quand il n y a rien a afficher', () => {
    expect(resume([])).toContain('sans signalement');
  });
});
