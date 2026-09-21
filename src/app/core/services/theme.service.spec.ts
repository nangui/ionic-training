import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { CLASSE_SOMBRE, CLE_STOCKAGE, ThemeService } from './theme.service';

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

/**
 * Le script anti-flash d'index.html applique le theme avant qu'Angular ne
 * demarre. Il duplique donc forcement la cle de stockage et le nom de
 * classe. Ce test transforme une derive silencieuse - un flash blanc que
 * personne ne relierait a un renommage - en echec de suite.
 */
describe("contrat avec le script d'index.html", () => {
  // Chemin depuis la racine du projet : import.meta.url n'est pas une URL
  // de fichier dans l'environnement de test.
  const chemin = resolve(process.cwd(), 'src/index.html');
  if (!existsSync(chemin)) {
    throw new Error(
      `index.html introuvable a ${chemin}. Ce test doit etre lance depuis la racine du projet.`,
    );
  }
  const html = readFileSync(chemin, 'utf8');

  /** Tolere apostrophes ou guillemets : le style de citation n'est pas le sujet. */
  const cite = (valeur: string): RegExp =>
    new RegExp(`['"\`]${valeur.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}['"\`]`);

  it('utilise la meme cle de stockage que le service', () => {
    expect(html).toMatch(cite(CLE_STOCKAGE));
  });

  it('pose la meme classe que le service', () => {
    expect(html).toMatch(cite(CLASSE_SOMBRE));
  });
});
