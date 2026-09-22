import { TestBed } from '@angular/core/testing';

import { PreferencesService } from './preferences.service';

describe('PreferencesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('propose des valeurs par defaut raisonnables', () => {
    const service = TestBed.inject(PreferencesService);

    // Compression active par defaut : une photo de telephone est trop lourde
    // pour un reseau mobile. Wi-Fi seul desactive : ne pas bloquer d'emblee.
    expect(service.compressionPhoto()).toBe(true);
    expect(service.envoiWifiSeulement()).toBe(false);
  });

  it('retient les choix d une session a l autre', () => {
    const service = TestBed.inject(PreferencesService);

    service.envoiWifiSeulement.set(true);
    TestBed.tick();

    expect(localStorage.getItem('app.envoiWifiSeulement')).toBe('true');
  });

  it('relit ce qui a ete stocke', () => {
    localStorage.setItem('app.compressionPhoto', 'false');

    expect(TestBed.inject(PreferencesService).compressionPhoto()).toBe(false);
  });
});
