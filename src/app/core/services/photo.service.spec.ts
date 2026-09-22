import { TestBed } from '@angular/core/testing';

import {
  ErreurPhoto,
  PLATEFORME,
  PLUGIN_CAMERA,
  PhotoService,
  PluginCamera,
} from './photo.service';

const DATA_URI = 'data:image/jpeg;base64,AAAA';

const creer = (
  plugin: Partial<PluginCamera>,
  plateforme = 'android',
): PhotoService => {
  const complet: PluginCamera = {
    checkPermissions: () => Promise.resolve({ camera: 'granted', photos: 'granted' }),
    requestPermissions: () => Promise.resolve({ camera: 'granted', photos: 'granted' }),
    getPhoto: () => Promise.resolve({ dataUrl: DATA_URI }),
    ...plugin,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: PLUGIN_CAMERA, useValue: complet },
      { provide: PLATEFORME, useValue: () => plateforme },
    ],
  });
  return TestBed.inject(PhotoService);
};

describe('PhotoService', () => {
  it('renvoie la photo telle quelle sur mobile, deja redimensionnee nativement', async () => {
    const service = creer({});

    await expect(service.capturer()).resolves.toBe(DATA_URI);
  });

  it('demande le redimensionnement au plugin plutot que de le faire apres coup', async () => {
    let options: Record<string, unknown> = {};
    const service = creer({
      getPhoto: (valeurs) => {
        options = valeurs as unknown as Record<string, unknown>;
        return Promise.resolve({ dataUrl: DATA_URI });
      },
    });

    await service.capturer();

    expect(options['width']).toBe(1280);
    expect(options['quality']).toBe(70);
    // Prompt : l'utilisateur choisit camera ou galerie, ce qui sert de repli
    // quand l'acces a la camera est refuse.
    expect(options['source']).toBe('PROMPT');
  });

  it('demande les permissions quand elles n ont pas encore ete posees', async () => {
    let demandes = 0;
    const service = creer({
      checkPermissions: () => Promise.resolve({ camera: 'prompt', photos: 'prompt' }),
      requestPermissions: () => {
        demandes += 1;
        return Promise.resolve({ camera: 'granted', photos: 'granted' });
      },
    });

    await service.capturer();

    expect(demandes).toBe(1);
  });

  it('n echoue que si camera ET galerie sont refusees', async () => {
    const service = creer({
      checkPermissions: () => Promise.resolve({ camera: 'denied', photos: 'granted' }),
    });

    await expect(service.capturer()).resolves.toBe(DATA_URI);
  });

  it('explique le refus total sans bloquer l envoi', async () => {
    const service = creer({
      checkPermissions: () => Promise.resolve({ camera: 'denied', photos: 'denied' }),
    });

    await expect(service.capturer()).rejects.toThrow(/sans photo/);
  });

  it('distingue une annulation d une erreur', async () => {
    const service = creer({
      getPhoto: () => Promise.reject(new Error('User cancelled photos app')),
    });

    try {
      await service.capturer();
      expect.unreachable();
    } catch (erreur) {
      expect((erreur as ErreurPhoto).motif).toBe('annulation');
    }
  });
});
