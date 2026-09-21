import { TestBed } from '@angular/core/testing';

import { SignalementService } from './signalement.service';

describe('SignalementService', () => {
  let service: SignalementService;

  beforeEach(() => {
    service = TestBed.inject(SignalementService);
  });

  it('renvoie les trois signalements de demonstration', () => {
    expect(service.lister().length).toBe(3);
  });

  it('trie du plus recent au plus ancien', () => {
    const dates = service.lister().map((s) => s.dateCreation);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('renvoie des copies, la source reste intacte', () => {
    const premier = service.lister()[0];
    premier.titre = 'titre modifie';
    expect(service.lister()[0].titre).not.toBe('titre modifie');
  });
});
