import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SignalementsPage } from './signalements.page';

describe('SignalementsPage', () => {
  let component: SignalementsPage;
  let fixture: ComponentFixture<SignalementsPage>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('charge les signalements dans le signal des la construction', () => {
    expect(component.signalements().length).toBe(3);
  });

  it('affiche tout tant que le filtre est inactif', () => {
    expect(component.signalementsAffiches().length).toBe(3);
  });

  it('masque les resolus quand le filtre est actif', () => {
    component.basculerFiltre();

    expect(component.masquerResolus()).toBe(true);
    expect(
      component.signalementsAffiches().every((s) => s.statut !== 'resolu'),
    ).toBe(true);
  });

  it('rend une carte par signalement affiche', () => {
    const cartes = fixture.nativeElement.querySelectorAll('.carte');

    expect(cartes.length).toBe(component.signalementsAffiches().length);
  });
});
