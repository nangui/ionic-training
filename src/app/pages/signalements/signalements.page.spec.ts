import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  LATENCE_LECTURE_MS,
  SignalementService,
} from '../../core/services/signalement.service';
import { SignalementsPage } from './signalements.page';

describe('SignalementsPage', () => {
  let component: SignalementsPage;
  let fixture: ComponentFixture<SignalementsPage>;

  /** Attend la fin du chargement initial, qui est asynchrone. */
  const attendreChargement = async (): Promise<void> => {
    creer();
    await TestBed.inject(SignalementService).lister();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /**
   * Cree le composant. Appele depuis le corps du test et non depuis un
   * beforeEach : le lanceur attend entre les hooks, ce qui viderait la file
   * de microtaches et ferait disparaitre l'etat de chargement avant qu'on
   * puisse l'observer.
   */
  const creer = (): void => {
    TestBed.configureTestingModule({
      // Pas de latence decorative dans les tests.
      providers: [provideRouter([]), { provide: LATENCE_LECTURE_MS, useValue: 0 }],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  it('should create', () => {
    creer();

    expect(component).toBeTruthy();
  });

  it('demarre en chargement et affiche trois silhouettes', () => {
    // Aucun await entre la creation et l'assertion : on observe l'etat
    // avant que la lecture ne resolve.
    creer();

    expect(component.chargement()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('app-carte-squelette').length).toBe(3);
  });

  it('charge les signalements dans le signal une fois le chargement fini', async () => {
    await attendreChargement();

    expect(component.chargement()).toBe(false);
    expect(component.signalements().length).toBe(3);
  });

  it('affiche tout tant qu aucun filtre n est actif', async () => {
    await attendreChargement();

    expect(component.filtresActifs()).toBe(false);
    expect(component.signalementsAffiches().length).toBe(3);
  });

  it('filtre par statut, plusieurs statuts a la fois', async () => {
    await attendreChargement();
    component.basculerStatut('nouveau');
    component.basculerStatut('resolu');

    const statuts = component.signalementsAffiches().map((s) => s.statut);
    expect(statuts).toContain('nouveau');
    expect(statuts).toContain('resolu');
    expect(statuts).not.toContain('en_cours');
  });

  it('une famille de filtres vide signifie toutes les valeurs', async () => {
    await attendreChargement();
    component.basculerStatut('nouveau');
    component.basculerStatut('nouveau');

    expect(component.signalementsAffiches().length).toBe(3);
  });

  it('croise categorie et statut', async () => {
    await attendreChargement();
    component.basculerCategorie('voirie');
    component.basculerStatut('resolu');

    expect(component.signalementsAffiches().length).toBe(0);
  });

  it('recherche sans tenir compte des accents ni de la casse', async () => {
    await attendreChargement();
    component.surRecherche('ECLAIRAGE');

    expect(component.signalementsAffiches().length).toBe(0);

    component.surRecherche('lampadaire');
    expect(component.signalementsAffiches().length).toBe(1);

    component.surRecherche('debordant');
    expect(component.signalementsAffiches()[0].id).toBe('sig-002');
  });

  it('reinitialise recherche et filtres d un coup', async () => {
    await attendreChargement();
    component.surRecherche('lampadaire');
    component.basculerCategorie('voirie');

    component.reinitialiserFiltres();

    expect(component.filtresActifs()).toBe(false);
    expect(component.signalementsAffiches().length).toBe(3);
  });

  it('rend une carte par signalement affiche', async () => {
    await attendreChargement();

    const cartes = fixture.nativeElement.querySelectorAll('app-signalement-card');
    expect(cartes.length).toBe(component.signalementsAffiches().length);
  });
});
