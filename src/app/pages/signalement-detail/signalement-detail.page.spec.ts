import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SignalementDetailPage } from './signalement-detail.page';

describe('SignalementDetailPage', () => {
  let fixture: ComponentFixture<SignalementDetailPage>;
  let component: SignalementDetailPage;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SignalementDetailPage);
    component = fixture.componentInstance;
  });

  it('resout le signalement correspondant au parametre :id', () => {
    fixture.componentRef.setInput('id', 'sig-001');
    fixture.detectChanges();

    expect(component.signalement()?.titre).toContain('Nid-de-poule');
  });

  it('affiche le titre complet, jamais tronque', () => {
    fixture.componentRef.setInput('id', 'sig-002');
    fixture.detectChanges();

    const titre = fixture.nativeElement.querySelector('.detail__titre');
    expect(titre.textContent.trim()).toBe('Conteneur à verre débordant');
  });

  it('affiche un etat explicite pour un identifiant inconnu', () => {
    fixture.componentRef.setInput('id', 'sig-inexistant');
    fixture.detectChanges();

    expect(component.signalement()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.introuvable')).toBeTruthy();
  });
});
