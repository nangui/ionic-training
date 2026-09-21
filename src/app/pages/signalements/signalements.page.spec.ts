import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import {
  CriteresRecherche,
  PageSignalements,
  Signalement,
} from '../../core/models/signalement.model';
import { SignalementService } from '../../core/services/signalement.service';
import { SEUIL_CONNEXION_LENTE_MS, SignalementsPage } from './signalements.page';

const SIGNALEMENTS: Signalement[] = [
  {
    id: 1,
    titre: 'Nid-de-poule sur la VDN',
    categorie: 'voirie',
    description: 'Un trou sur la voie de droite.',
    photo: null,
    latitude: 14.71,
    longitude: -17.47,
    statut: 'nouveau',
    dateCreation: '2026-09-20T08:00:00.000Z',
  },
  {
    id: 2,
    titre: 'Conteneur débordant',
    categorie: 'dechets',
    description: 'Plein depuis des jours.',
    photo: null,
    latitude: 14.72,
    longitude: -17.46,
    statut: 'en_cours',
    dateCreation: '2026-09-19T08:00:00.000Z',
  },
];

/** Service factice : enregistre les criteres recus et renvoie une page. */
class ServiceFactice {
  criteres: CriteresRecherche[] = [];
  echoue = false;
  creations = 0;

  async lister(criteres: CriteresRecherche = {}): Promise<PageSignalements> {
    this.criteres.push(criteres);
    if (this.echoue) {
      throw new Error('Le serveur est injoignable.');
    }
    return { total: SIGNALEMENTS.length, limit: 20, offset: 0, data: SIGNALEMENTS };
  }

  async creer(): Promise<Signalement> {
    this.creations += 1;
    return SIGNALEMENTS[0];
  }
}

describe('SignalementsPage', () => {
  let component: SignalementsPage;
  let fixture: ComponentFixture<SignalementsPage>;
  let service: ServiceFactice;

  const creer = (echoue = false): void => {
    service = new ServiceFactice();
    service.echoue = echoue;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SignalementService, useValue: service }],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const attendreChargement = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('demarre en chargement et affiche trois silhouettes', () => {
    // Aucun await : on observe l'etat avant que la lecture ne resolve.
    creer();

    expect(component.chargement()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('app-carte-squelette').length).toBe(3);
  });

  it('affiche ce que le serveur renvoie', async () => {
    creer();
    await attendreChargement();

    expect(component.chargement()).toBe(false);
    expect(component.signalements().length).toBe(2);
    expect(component.total()).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-signalement-card').length).toBe(2);
  });

  it('delegue la recherche au serveur plutot que de filtrer la page recue', async () => {
    creer();
    await attendreChargement();

    component.surRecherche('lampadaire');
    await attendreChargement();

    expect(service.criteres.at(-1)?.q).toBe('lampadaire');
  });

  it('delegue le filtre de statut au serveur', async () => {
    creer();
    await attendreChargement();

    component.basculerStatut('nouveau');
    await attendreChargement();

    expect(service.criteres.at(-1)?.statut).toBe('nouveau');
  });

  it('un second appui sur l etiquette active retire le filtre', async () => {
    creer();
    await attendreChargement();

    component.basculerCategorie('voirie');
    await attendreChargement();
    expect(service.criteres.at(-1)?.categorie).toBe('voirie');

    component.basculerCategorie('voirie');
    await attendreChargement();
    expect(service.criteres.at(-1)?.categorie).toBeUndefined();
  });

  it('reinitialise recherche et filtres d un coup', async () => {
    creer();
    await attendreChargement();
    component.surRecherche('lampadaire');
    component.basculerCategorie('voirie');
    await attendreChargement();

    component.reinitialiserFiltres();
    await attendreChargement();

    expect(component.filtresActifs()).toBe(false);
    expect(service.criteres.at(-1)).toEqual({
      q: undefined,
      categorie: undefined,
      statut: undefined,
    });
  });

  it('ne remplace pas une liste deja affichee par des silhouettes', async () => {
    creer();
    await attendreChargement();

    const rechargement = component.charger();
    fixture.detectChanges();

    expect(component.chargement()).toBe(true);
    expect(component.chargementInitial()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('app-carte-squelette').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('app-signalement-card').length).toBe(2);

    await rechargement;
  });

  it('affiche un etat d erreur plutot qu une liste vide quand la lecture echoue', async () => {
    creer(true);
    await attendreChargement();

    expect(component.erreurBloquante()).toBe(true);
    expect(component.chargement()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Chargement impossible');
  });

  it('rend la main au refresher meme si la lecture echoue', async () => {
    creer(true);
    let complete = 0;

    await component.rafraichir({
      detail: { complete: () => (complete += 1) },
    } as unknown as Parameters<SignalementsPage['rafraichir']>[0]);

    expect(complete).toBe(1);
  });

  it('previent au-dela de dix secondes que la connexion semble lente', async () => {
    vi.useFakeTimers();
    try {
      service = new ServiceFactice();
      // Une lecture qui n'aboutit pas dans la fenetre observee.
      service.lister = () => new Promise(() => undefined);
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: SignalementService, useValue: service }],
      });
      fixture = TestBed.createComponent(SignalementsPage);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.connexionLente()).toBe(false);

      vi.advanceTimersByTime(SEUIL_CONNEXION_LENTE_MS);

      expect(component.connexionLente()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
