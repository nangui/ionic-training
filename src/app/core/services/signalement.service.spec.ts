import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Signalement } from '../models/signalement.model';
import { ErreurApi, SignalementService } from './signalement.service';
import { traineeInterceptor } from './trainee.interceptor';

const BASE = `${environment.apiUrl}/signalements`;

const SIGNALEMENT: Signalement = {
  id: 31,
  titre: 'Nid-de-poule profond sur la VDN',
  categorie: 'voirie',
  description: 'Un trou sur la voie de droite.',
  photo: null,
  latitude: 14.7191,
  longitude: -17.4712,
  statut: 'nouveau',
  dateCreation: '2026-09-21T20:48:57.380Z',
};

describe('SignalementService', () => {
  let service: SignalementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([traineeInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(SignalementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('identifie le participant sur chaque appel a l API', async () => {
    const promesse = service.lister();
    const requete = http.expectOne((r) => r.url === BASE);

    // Sans cet en-tete, on ecrirait dans le jeu commun de la promotion.
    expect(requete.request.headers.get('X-Trainee')).toBe(environment.trainee);

    requete.flush({ total: 0, limit: 20, offset: 0, data: [] });
    await promesse;
  });

  it('delegue recherche et filtres au serveur', async () => {
    const promesse = service.lister({ q: 'lampadaire', categorie: 'eclairage', statut: 'nouveau' });
    const requete = http.expectOne((r) => r.url === BASE);

    expect(requete.request.params.get('q')).toBe('lampadaire');
    expect(requete.request.params.get('categorie')).toBe('eclairage');
    expect(requete.request.params.get('statut')).toBe('nouveau');

    requete.flush({ total: 1, limit: 20, offset: 0, data: [SIGNALEMENT] });
    const page = await promesse;
    expect(page.data[0].id).toBe(31);
  });

  it('n envoie pas les criteres absents ou vides', async () => {
    const promesse = service.lister({ q: '', categorie: undefined });
    const requete = http.expectOne((r) => r.url === BASE);

    expect(requete.request.params.keys()).toEqual([]);

    requete.flush({ total: 0, limit: 20, offset: 0, data: [] });
    await promesse;
  });

  it('lit un signalement par son identifiant', async () => {
    const promesse = service.trouver(31);
    http.expectOne(`${BASE}/31`).flush(SIGNALEMENT);

    expect((await promesse).titre).toContain('Nid-de-poule');
  });

  it('cree un signalement et renvoie celui que l API a enregistre', async () => {
    const promesse = service.creer({
      titre: 'Fuite avenue Bourguiba',
      categorie: 'eau',
      description: "L'eau coule en continu depuis deux jours.",
      latitude: 14.7,
      longitude: -17.45,
      photo: null,
    });
    const requete = http.expectOne(BASE);

    expect(requete.request.method).toBe('POST');
    expect(requete.request.body.categorie).toBe('eau');

    requete.flush({ ...SIGNALEMENT, id: 99, titre: 'Fuite avenue Bourguiba' });
    expect((await promesse).id).toBe(99);
  });

  it('modifie en n envoyant que les champs concernes', async () => {
    const promesse = service.modifier(31, { statut: 'resolu' });
    const requete = http.expectOne(`${BASE}/31`);

    // PATCH et non PUT : on n'ecrase pas le reste avec des valeurs perimees.
    expect(requete.request.method).toBe('PATCH');
    expect(requete.request.body).toEqual({ statut: 'resolu' });

    requete.flush({ ...SIGNALEMENT, statut: 'resolu' });
    expect((await promesse).statut).toBe('resolu');
  });

  it('supprime un signalement', async () => {
    const promesse = service.supprimer(31);
    const requete = http.expectOne(`${BASE}/31`);

    expect(requete.request.method).toBe('DELETE');

    requete.flush(null);
    await promesse;
  });

  it('traduit un 404 en message lisible', async () => {
    const promesse = service.trouver(404);
    http
      .expectOne(`${BASE}/404`)
      .flush({ erreur: 'Signalement introuvable.' }, { status: 404, statusText: 'Not Found' });

    await expect(promesse).rejects.toThrowError(ErreurApi);
    await expect(promesse).rejects.toThrow("Ce signalement n'existe pas ou plus.");
  });

  it('distingue l absence de reseau d un refus du serveur', async () => {
    const promesse = service.lister();
    // Statut 0 : la requete n'est jamais partie.
    http.expectOne(BASE).error(new ProgressEvent('error'), { status: 0, statusText: '' });

    await expect(promesse).rejects.toThrow('Le serveur est injoignable.');
  });

  it('reprend le message d erreur de l API quand il y en a un', async () => {
    const promesse = service.creer({
      titre: '',
      categorie: 'autre',
      description: '',
      latitude: 0,
      longitude: 0,
    });
    http
      .expectOne(BASE)
      .flush({ erreur: 'Le titre est obligatoire.' }, { status: 422, statusText: 'Unprocessable' });

    await expect(promesse).rejects.toThrow('Le titre est obligatoire.');
  });

  it('ne pose pas l en-tete d isolation sur les requetes hors API', () => {
    // Une requete vers un autre domaine ne doit pas emporter le prenom du
    // participant. La version precedente de ce test n'emettait aucune
    // requete hors API : elle etait verte pour la mauvaise raison.
    const client = TestBed.inject(HttpClient);
    client.get('https://exemple.test/autre').subscribe({ error: () => undefined });

    const requete = http.expectOne('https://exemple.test/autre');
    expect(requete.request.headers.has('X-Trainee')).toBe(false);
    requete.flush({});
  });
});
