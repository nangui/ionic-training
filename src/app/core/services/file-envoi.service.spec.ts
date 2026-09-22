import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { SignalementCreation } from '../models/signalement.model';
import { FileEnvoiService, POIDS_MAX_FILE, TAILLE_MAX_FILE } from './file-envoi.service';
import { PreferencesService } from './preferences.service';
import { ReseauService } from './reseau.service';
import { ErreurApi, SignalementService } from './signalement.service';
import { PLUGIN_STOCKAGE, PluginStockage } from './stockage.service';

const BROUILLON: SignalementCreation = {
  titre: 'Nid-de-poule sur la VDN',
  categorie: 'voirie',
  description: 'Un trou sur la voie de droite.',
  latitude: 14.71,
  longitude: -17.47,
  photo: null,
};

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

describe('FileEnvoiService', () => {
  let enLigne: ReturnType<typeof signal<boolean>>;
  let envois: SignalementCreation[];
  let reponse: () => Promise<unknown>;

  const creer = (options: { enLigne?: boolean; wifiSeul?: boolean } = {}): FileEnvoiService => {
    enLigne = signal(options.enLigne ?? true);
    envois = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: PLUGIN_STOCKAGE, useValue: stockageFactice() },
        {
          provide: ReseauService,
          useValue: { enLigne, typeConnexion: () => 'cellular' },
        },
        {
          provide: PreferencesService,
          useValue: { envoiWifiSeulement: signal(options.wifiSeul ?? false) },
        },
        {
          provide: SignalementService,
          useValue: {
            creer: (brouillon: SignalementCreation) => {
              envois.push(brouillon);
              return reponse();
            },
          },
        },
      ],
    });
    return TestBed.inject(FileEnvoiService);
  };

  const vider = async (): Promise<void> => {
    await new Promise((resoudre) => setTimeout(resoudre, 0));
  };

  beforeEach(() => {
    reponse = () => Promise.resolve({ id: 1 });
  });

  it('envoie immediatement quand le reseau est la', async () => {
    const service = creer();
    await service.pret;

    await expect(service.soumettre(BROUILLON)).resolves.toBe('envoye');
    expect(envois.length).toBe(1);
    expect(service.nombreEnAttente()).toBe(0);
  });

  it('met en file sans tenter l envoi quand on est hors ligne', async () => {
    const service = creer({ enLigne: false });
    await service.pret;

    await expect(service.soumettre(BROUILLON)).resolves.toBe('en_file');
    // Aucune requete inutile : on sait deja qu'elle echouerait.
    expect(envois.length).toBe(0);
    expect(service.nombreEnAttente()).toBe(1);
  });

  it('met en file hors Wi-Fi quand le reglage l exige', async () => {
    const service = creer({ wifiSeul: true });
    await service.pret;

    await expect(service.soumettre(BROUILLON)).resolves.toBe('en_file');
    expect(envois.length).toBe(0);
  });

  it('met en file quand la requete n a jamais atteint le serveur', async () => {
    const service = creer();
    await service.pret;
    reponse = () => Promise.reject(new ErreurApi('Le serveur est injoignable.', 0));

    await expect(service.soumettre(BROUILLON)).resolves.toBe('en_file');
    expect(service.nombreEnAttente()).toBe(1);
  });

  it('ne met PAS en file quand le serveur a repondu, meme en erreur', async () => {
    const service = creer();
    await service.pret;
    reponse = () => Promise.reject(new ErreurApi('Le titre est obligatoire.', 422));

    // Regle centrale : POST n'est pas idempotent et l'API n'accepte aucune
    // cle d'idempotence. Une reponse recue signifie que le serveur a peut-
    // etre enregistre ; reessayer creerait un doublon dans le dos de
    // l'utilisateur.
    await expect(service.soumettre(BROUILLON)).rejects.toThrow('Le titre est obligatoire.');
    expect(service.nombreEnAttente()).toBe(0);
  });

  it('vide la file au retour du reseau', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);
    await service.soumettre({ ...BROUILLON, titre: 'Second' });
    expect(service.nombreEnAttente()).toBe(2);

    enLigne.set(true);
    await vider();
    await vider();

    expect(envois.length).toBe(2);
    expect(service.nombreEnAttente()).toBe(0);
  });

  it('marque en echec sans jamais reessayer quand le serveur refuse', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);

    reponse = () => Promise.reject(new ErreurApi('Données invalides.', 422));
    enLigne.set(true);
    // On laisse tourner largement : la version precedente enchainait 38
    // envois en 60 ms, parce que l'effet dependait d'un signal que la
    // synchronisation ecrivait elle-meme.
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resoudre) => setTimeout(resoudre, 5));
    }

    expect(envois.length).toBe(1);
    expect(service.nombreEnAttente()).toBe(1);
    expect(service.enAttente()[0].etat).toBe('echec');
    expect(service.enAttente()[0].motifEchec).toBe('Données invalides.');
    expect(service.aDesEchecs()).toBe(true);
  });

  it('ne reprend pas une entree en echec lors d une synchronisation suivante', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);
    reponse = () => Promise.reject(new ErreurApi('Données invalides.', 422));
    enLigne.set(true);
    await vider();
    await vider();
    expect(envois.length).toBe(1);

    // Une nouvelle occasion de synchroniser ne doit pas la reprendre :
    // le serveur a repondu, il a peut-etre enregistre.
    reponse = () => Promise.resolve({ id: 1 });
    await service.synchroniser();
    await vider();

    expect(envois.length).toBe(1);
    expect(service.enAttente()[0].etat).toBe('echec');
  });

  it('reprend l entree seulement quand l utilisateur le demande', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);
    reponse = () => Promise.reject(new ErreurApi('Données invalides.', 422));
    enLigne.set(true);
    await vider();
    await vider();

    reponse = () => Promise.resolve({ id: 1 });
    await service.reessayer(service.enAttente()[0].id);
    await vider();

    expect(envois.length).toBe(2);
    expect(service.nombreEnAttente()).toBe(0);
  });

  it('garde l entree en attente quand le reseau retombe pendant la synchro', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);

    reponse = () => Promise.reject(new ErreurApi('Le serveur est injoignable.', 0));
    enLigne.set(true);
    await vider();
    await vider();

    expect(service.enAttente()[0].etat).toBe('en_attente');
  });

  it('ne tourne pas en boucle quand le reseau echoue de facon repetee', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);

    // Statut 0 : l'entree reste « en attente », donc elle reste eligible.
    // Sans `untracked` dans l'effet, chaque tentative ecrirait `tentatives`,
    // ce qui relancerait l'effet, qui retenterait, sans fin.
    reponse = () => Promise.reject(new ErreurApi('Le serveur est injoignable.', 0));
    enLigne.set(true);
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resoudre) => setTimeout(resoudre, 5));
    }

    expect(envois.length).toBe(1);
    expect(service.enAttente()[0].etat).toBe('en_attente');
  });

  it('permet d abandonner une entree', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);

    await service.abandonner(service.enAttente()[0].id);

    expect(service.nombreEnAttente()).toBe(0);
  });

  it('plafonne la file en nombre d entrees', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    for (let i = 0; i < TAILLE_MAX_FILE; i += 1) {
      await service.soumettre({ ...BROUILLON, titre: `Signalement ${i}` });
    }

    await expect(service.soumettre(BROUILLON)).rejects.toThrow(/pleine/);
  });

  it('plafonne aussi en octets : une seule photo suffit a saturer', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    // Une photo volumineuse, comme en produirait un appareil sans
    // compression : le plafond en nombre d'entrees serait inoperant.
    const enorme = { ...BROUILLON, photo: 'data:image/jpeg;base64,' + 'A'.repeat(POIDS_MAX_FILE) };

    await expect(service.soumettre(enorme)).rejects.toThrow(/pleine/);
    expect(service.nombreEnAttente()).toBe(0);
  });

  it('represente une entree en attente avec un identifiant negatif', async () => {
    const service = creer({ enLigne: false });
    await service.pret;
    await service.soumettre(BROUILLON);

    const carte = service.enSignalement(service.enAttente()[0], 0);

    // Negatif : impossible de le confondre avec un identifiant serveur.
    expect(carte.id).toBeLessThan(0);
    expect(carte.titre).toBe(BROUILLON.titre);
  });
});
