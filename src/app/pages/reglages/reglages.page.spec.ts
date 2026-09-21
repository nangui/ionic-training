import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReglagesPage } from './reglages.page';

describe('ReglagesPage', () => {
  let component: ReglagesPage;
  let fixture: ComponentFixture<ReglagesPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ReglagesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
