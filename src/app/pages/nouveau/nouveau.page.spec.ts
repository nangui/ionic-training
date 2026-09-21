import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NouveauPage } from './nouveau.page';

describe('NouveauPage', () => {
  let component: NouveauPage;
  let fixture: ComponentFixture<NouveauPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(NouveauPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
