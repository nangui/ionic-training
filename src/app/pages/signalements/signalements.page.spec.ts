import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CarteSignalementsComponent } from '../../shared/components/carte-signalements/carte-signalements.component';
import { PointCarte } from '../../shared/components/carte-signalements/carte-signalements.model';

import {
  CriteresRecherche,
  PageSignalements,
  Signalement,
} from '../../core/models/signalement.model';
import { PLUGIN_STOCKAGE, PluginStockage } from '../../core/services/stockage.service';
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

/** Construit une page d'un seul element, pour les scenarios de concurrence. */
const page = (titre: string): PageSignalements => ({
  total: 1,
  limit: 20,
  offset: 0,
  data: [{ ...SIGNALEMENTS[0], titre }],
});

/**
 * Doublure de la carte.
 *
 * Le composant reel dessine ses marqueurs dans un canvas, que jsdom
 * n'implemente pas. On teste ici la logique de l'ecran - ce qu'il charge et
 * ce qu'il transmet - pas le rendu Leaflet, couvert a part.
 */
@Component({
  selector: 'app-carte-signalements',
  template: '',
})
class CarteFactice {
  readonly points = input.required<PointCarte[]>();
  readonly ouvrir = output<unknown>();
}

/**
 * Remplace la carte reelle dans l'ecran teste.
 * `compileComponents` est requis : surcharger les imports invalide les
 * metadonnees du composant, qu'il faut recompiler avant de l'instancier.
 */
const sansCarteReelle = async (): Promise<void> => {
  TestBed.overrideComponent(SignalementsPage, {
    remove: { imports: [CarteSignalementsComponent] },
    add: { imports: [CarteFactice] },
  });
  await TestBed.compileComponents();
};

/**
 * Stockage en memoire : sans lui, les tests partagent le stockage reel et
 * un cache ecrit par un test ferait passer le suivant pour la mauvaise
 * raison.
 */
const stockageFactice = (): PluginStockage => {
  const memoire = new Map<string, string>();
  return {
    get: ({ key }) => Promise.resolve({ value: memoire.get(key) ?? null }),
    set: ({ key, value }) => {
      memoire.set(key, value);
      return Promise.resolve();
    },
    remove: ({ key }) => {
      memoire.delete(key);
      return Promise.resolve();
    },
  };
};

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

  async listerTout(): Promise<{ signalements: Signalement[]; total: number }> {
    return { signalements: SIGNALEMENTS, total: SIGNALEMENTS.length };
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
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: service },
        { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
      ],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Ce qu'Ionic fait a chaque entree dans la vue, et que TestBed ne fait
    // pas : c'est la que part la premiere lecture.
    component.ionViewWillEnter();
    fixture.detectChanges();
  };

  const attendreChargement = async (): Promise<void> => {
    // Une macrotache vide la file des microtaches : la lecture, puis le
    // cache lu ou ecrit derriere elle, chacun ajoutant son propre maillon.
    await new Promise((resoudre) => setTimeout(resoudre, 0));
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

  it('ne lit qu une fois a la premiere ouverture', async () => {
    creer();
    await attendreChargement();

    // Le constructeur pose l'effet, ionViewWillEnter declenche la lecture :
    // sans garde, les deux tireraient et la page ferait deux requetes.
    expect(service.criteres.length).toBe(1);
  });

  it('relit a chaque retour sur la vue', async () => {
    creer();
    await attendreChargement();

    // C'est le scenario du bug : un signalement cree depuis l'onglet
    // « Nouveau » n'apparaissait qu'apres avoir touche un filtre, parce
    // qu'Ionic garde la page montee et ne rejoue pas ngOnInit.
    component.ionViewWillEnter();
    await attendreChargement();

    expect(service.criteres.length).toBe(2);
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
    const dernier = service.criteres.at(-1);
    expect(dernier?.q).toBeUndefined();
    expect(dernier?.categorie).toBeUndefined();
    expect(dernier?.statut).toBeUndefined();
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

  it('sert le dernier instantane connu quand la lecture echoue', async () => {
    // Un stockage partage entre les deux constructions : le premier passage
    // met en cache, le second echoue et doit retomber dessus.
    const stockage = stockageFactice();
    const reussi = new ServiceFactice();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: reussi },
        { provide: PLUGIN_STOCKAGE, useValue: stockage },
      ],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.ionViewWillEnter();
    await attendreChargement();
    expect(component.signalements().length).toBe(2);

    TestBed.resetTestingModule();
    const casse = new ServiceFactice();
    casse.echoue = true;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: casse },
        { provide: PLUGIN_STOCKAGE, useValue: stockage },
      ],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.ionViewWillEnter();
    await attendreChargement();

    // Une liste datee vaut mieux qu'un ecran vide, a condition de dire
    // qu'elle est datee.
    expect(component.signalements().length).toBe(2);
    expect(component.erreurBloquante()).toBe(false);
    expect(component.mentionCache()).toContain('Liste du');
  });

  it('ne sert pas le cache en reponse a un filtre : le resultat serait faux', async () => {
    const stockage = stockageFactice();
    const reussi = new ServiceFactice();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: reussi },
        { provide: PLUGIN_STOCKAGE, useValue: stockage },
      ],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.ionViewWillEnter();
    await attendreChargement();

    reussi.echoue = true;
    component.basculerCategorie('voirie');
    await attendreChargement();

    // Le cache contient la liste complete : la servir en reponse a un
    // filtre ferait croire que tout y correspond. On signale l'erreur, et
    // surtout on n'affiche aucune mention de cache.
    expect(component.erreur()).toBe(true);
    expect(component.mentionCache()).toBe('');
  });

  it('rend la main au refresher meme si la lecture echoue', async () => {
    creer(true);
    let complete = 0;

    await component.rafraichir({
      detail: { complete: () => (complete += 1) },
    } as unknown as Parameters<SignalementsPage['rafraichir']>[0]);

    expect(complete).toBe(1);
  });

  it('ignore une reponse lente rendue obsolete par une lecture plus recente', async () => {
    let appel = 0;
    service = new ServiceFactice();
    service.lister = (criteres: CriteresRecherche = {}) => {
      appel += 1;
      service.criteres.push(criteres);
      const titre = appel === 1 ? 'ANCIEN' : 'RECENT';
      // La premiere lecture, correspondant au filtre abandonne, est la plus
      // lente : sans garde de sequence elle ecraserait la seconde.
      return appel === 1
        ? new Promise((r) => setTimeout(() => r({ ...page(titre) }), 40))
        : Promise.resolve({ ...page(titre) });
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: service },
        { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
      ],
    });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.ionViewWillEnter();

    component.surRecherche('nouveau terme');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 120));

    expect(component.signalements()[0].titre).toBe('RECENT');
  });

  it('demande la page suivante et l ajoute a la suite', async () => {
    creer();
    await attendreChargement();

    let complete = 0;
    await component.chargerSuite({
      target: { complete: async () => void (complete += 1) },
    } as unknown as Parameters<SignalementsPage['chargerSuite']>[0]);

    // Le serveur est interroge a partir de ce qui est deja affiche.
    expect(service.criteres.at(-1)?.offset).toBe(2);
    expect(complete).toBe(1);
  });

  it('cesse de demander des pages une fois la liste complete', async () => {
    creer();
    await attendreChargement();

    // Le service factice renvoie total = 2 et deux elements.
    expect(component.toutCharge()).toBe(true);
  });

  it('ignore une reponse de carte rendue obsolete par une lecture plus recente', async () => {
    let appel = 0;
    service = new ServiceFactice();
    service.listerTout = () => {
      appel += 1;
      const titre = appel === 1 ? 'ANCIEN' : 'RECENT';
      const donnees = { signalements: [{ ...SIGNALEMENTS[0], titre }], total: 1 };
      // La premiere lecture, correspondant au filtre abandonne, est la plus
      // lente. Sans garde de sequence elle ecraserait la seconde - le meme
      // defaut que sur la liste, reintroduit dans le chargeur de carte.
      return appel === 1
        ? new Promise((r) => setTimeout(() => r(donnees), 40))
        : Promise.resolve(donnees);
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: service },
        { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
      ],
    });
    await sansCarteReelle();
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.basculerMode();
    fixture.detectChanges();
    component.surRecherche('autre terme');
    fixture.detectChanges();
    await new Promise((resoudre) => setTimeout(resoudre, 120));

    expect(component.pointsCarte()[0].signalement.titre).toBe('RECENT');
  });

  it('signale une carte plafonnee plutot que de la tronquer en silence', async () => {
    service = new ServiceFactice();
    // Le serveur en annonce plus que ce que le plafond ramene.
    service.listerTout = () =>
      Promise.resolve({ signalements: [SIGNALEMENTS[0]], total: 900 });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SignalementService, useValue: service },
        { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
      ],
    });
    await sansCarteReelle();
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.basculerMode();
    await attendreChargement();

    expect(component.carteTronquee()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('plafonnée');
  });

  it('previent au-dela de dix secondes que la connexion semble lente', async () => {
    vi.useFakeTimers();
    try {
      service = new ServiceFactice();
      // Une lecture qui n'aboutit pas dans la fenetre observee.
      service.lister = () => new Promise(() => undefined);
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: SignalementService, useValue: service },
          { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
        ],
      });
      fixture = TestBed.createComponent(SignalementsPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component.ionViewWillEnter();

      expect(component.connexionLente()).toBe(false);

      vi.advanceTimersByTime(SEUIL_CONNEXION_LENTE_MS);

      expect(component.connexionLente()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
