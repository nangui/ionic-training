import { TestBed } from '@angular/core/testing';

import {
  ErreurPosition,
  PLUGIN_POSITION,
  PluginPosition,
  PositionService,
} from './position.service';

const plugin = (etat: string, position?: { latitude: number; longitude: number }): PluginPosition => ({
  checkPermissions: () => Promise.resolve({ location: etat }),
  requestPermissions: () => Promise.resolve({ location: etat === 'prompt' ? 'granted' : etat }),
  getCurrentPosition: () =>
    position
      ? Promise.resolve({ coords: position })
      : Promise.reject(new Error('indisponible')),
});

const creer = (faux: PluginPosition): PositionService => {
  TestBed.configureTestingModule({
    providers: [{ provide: PLUGIN_POSITION, useValue: faux }],
  });
  return TestBed.inject(PositionService);
};

describe('PositionService', () => {
  it('renvoie les coordonnees quand la permission est accordee', async () => {
    const service = creer(plugin('granted', { latitude: 14.71, longitude: -17.47 }));

    await expect(service.obtenir()).resolves.toEqual({
      latitude: 14.71,
      longitude: -17.47,
    });
  });

  it('demande la permission quand elle n a pas encore ete posee', async () => {
    let demandes = 0;
    const faux = plugin('prompt', { latitude: 1, longitude: 2 });
    const service = creer({
      ...faux,
      requestPermissions: () => {
        demandes += 1;
        return Promise.resolve({ location: 'granted' });
      },
    });

    await service.obtenir();

    expect(demandes).toBe(1);
  });

  it('explique le refus sans bloquer : l envoi sans position reste possible', async () => {
    const service = creer(plugin('denied'));

    await expect(service.obtenir()).rejects.toThrowError(ErreurPosition);
    await expect(service.obtenir()).rejects.toThrow(/sans position/);
  });

  it('distingue une position indisponible d un refus', async () => {
    const service = creer(plugin('granted'));

    try {
      await service.obtenir();
      expect.unreachable();
    } catch (erreur) {
      expect((erreur as ErreurPosition).motif).toBe('indisponible');
    }
  });
});
