import { TestBed } from '@angular/core/testing';

import { PLUGIN_RESEAU, PluginReseau, ReseauService } from './reseau.service';

describe('ReseauService', () => {
  let ecouteur: ((statut: { connected: boolean }) => void) | undefined;
  let retire: boolean;

  const pluginFactice = (connecteAuDemarrage: boolean): PluginReseau => ({
    getStatus: () => Promise.resolve({ connected: connecteAuDemarrage }),
    addListener: (_evenement, fonction) => {
      ecouteur = fonction;
      return Promise.resolve({
        remove: () => {
          retire = true;
          return Promise.resolve();
        },
      });
    },
  });

  const creer = (connecteAuDemarrage = true): ReseauService => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLUGIN_RESEAU, useValue: pluginFactice(connecteAuDemarrage) },
      ],
    });
    return TestBed.inject(ReseauService);
  };

  beforeEach(() => {
    ecouteur = undefined;
    retire = false;
  });

  it('prend l etat du plugin au demarrage, pas seulement navigator.onLine', async () => {
    const service = creer(false);
    await Promise.resolve();

    expect(service.enLigne()).toBe(false);
  });

  it('repercute une perte de connexion signalee par le plugin', async () => {
    const service = creer();
    await Promise.resolve();

    ecouteur?.({ connected: false });

    expect(service.enLigne()).toBe(false);
  });

  it('repercute le retour de la connexion', async () => {
    const service = creer();
    await Promise.resolve();

    ecouteur?.({ connected: false });
    ecouteur?.({ connected: true });

    expect(service.enLigne()).toBe(true);
  });

  it('retire son ecouteur a la destruction', async () => {
    creer();
    await Promise.resolve();

    TestBed.resetTestingModule();
    await Promise.resolve();

    expect(retire).toBe(true);
  });
});
