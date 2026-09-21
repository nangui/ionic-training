import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  const classeSombrePosee = (): boolean =>
    document.documentElement.classList.contains('ion-palette-dark');

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
    service = TestBed.inject(ThemeService);
    TestBed.tick();
  });

  it('suit le telephone par defaut', () => {
    expect(service.preference()).toBe('systeme');
  });

  it('force le sombre quel que soit le reglage du telephone', () => {
    service.definir('sombre');
    TestBed.tick();

    expect(service.sombreActif()).toBe(true);
    expect(classeSombrePosee()).toBe(true);
  });

  it('force le clair quel que soit le reglage du telephone', () => {
    service.definir('sombre');
    TestBed.tick();
    service.definir('clair');
    TestBed.tick();

    expect(service.sombreActif()).toBe(false);
    expect(classeSombrePosee()).toBe(false);
  });

  it('aligne aussi les controles natifs via color-scheme', () => {
    service.definir('sombre');
    TestBed.tick();

    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('retient le choix d une session a l autre', () => {
    service.definir('clair');
    TestBed.tick();

    expect(localStorage.getItem('app.theme')).toBe('clair');
  });
});
