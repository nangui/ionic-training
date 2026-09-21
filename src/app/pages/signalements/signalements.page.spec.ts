import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignalementsPage } from './signalements.page';

describe('SignalementsPage', () => {
  let component: SignalementsPage;
  let fixture: ComponentFixture<SignalementsPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(SignalementsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
