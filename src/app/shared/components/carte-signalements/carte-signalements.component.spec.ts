import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Signalement } from '../../../core/models/signalement.model';
import { CarteSignalementsComponent, echapper } from './carte-signalements.component';

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

  const creer = (signalements: Signalement[]): void => {
    fixture = TestBed.createComponent(CarteSignalementsComponent);
    fixture.componentRef.setInput('signalements', signalements);
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

describe('echapper', () => {
  it('neutralise le HTML d un titre saisi par l utilisateur', () => {
    // Le contenu de l'infobulle est construit en HTML : un titre non
    // echappe y serait interprete.
    const resultat = echapper('<img src=x onerror=alert(1)>');

    expect(resultat).not.toContain('<img');
    expect(resultat).toContain('&lt;img');
  });

  it('laisse le texte ordinaire intact', () => {
    expect(echapper('Nid-de-poule avenue de la République')).toBe(
      'Nid-de-poule avenue de la République',
    );
  });
});
