import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarreRechercheComponent } from './barre-recherche.component';

describe('BarreRechercheComponent', () => {
  let fixture: ComponentFixture<BarreRechercheComponent>;
  let component: BarreRechercheComponent;
  let emis: string[];

  const saisir = (valeur: string): void => {
    const champ: HTMLInputElement = fixture.nativeElement.querySelector('#recherche');
    champ.value = valeur;
    champ.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(BarreRechercheComponent);
    component = fixture.componentInstance;
    emis = [];
    component.recherche.subscribe((terme) => emis.push(terme));
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('n emet rien avant la pause de 300 ms', () => {
    saisir('lampadaire');
    vi.advanceTimersByTime(299);

    expect(emis).toEqual([]);
  });

  it('emet une seule fois apres la pause, pas a chaque frappe', () => {
    saisir('lam');
    vi.advanceTimersByTime(100);
    saisir('lampa');
    vi.advanceTimersByTime(100);
    saisir('lampadaire');
    vi.advanceTimersByTime(300);

    expect(emis).toEqual(['lampadaire']);
  });

  it('affiche le bouton d effacement uniquement quand il y a du texte', () => {
    expect(fixture.nativeElement.querySelector('.barre__effacer')).toBeNull();

    saisir('eau');
    expect(fixture.nativeElement.querySelector('.barre__effacer')).toBeTruthy();
  });

  it('efface le champ et emet un terme vide', () => {
    saisir('eau');
    vi.advanceTimersByTime(300);
    emis = [];

    fixture.nativeElement.querySelector('.barre__effacer').click();
    fixture.detectChanges();
    vi.advanceTimersByTime(300);

    expect(component.saisie()).toBe('');
    expect(emis).toEqual(['']);
  });
});
