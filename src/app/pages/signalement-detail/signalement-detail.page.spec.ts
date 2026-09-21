import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Signalement } from '../../core/models/signalement.model';
import { ErreurApi, SignalementService } from '../../core/services/signalement.service';
import { SignalementDetailPage } from './signalement-detail.page';

const SIGNALEMENT: Signalement = {
  id: 31,
  titre: 'Nid-de-poule profond sur la VDN',
  categorie: 'voirie',
  description: 'Un trou sur la voie de droite, juste avant la sortie.',
  photo: null,
  latitude: 14.7191,
  longitude: -17.4712,
  statut: 'nouveau',
  dateCreation: '2026-09-21T20:48:57.380Z',
};

describe('SignalementDetailPage', () => {
  let fixture: ComponentFixture<SignalementDetailPage>;
  let component: SignalementDetailPage;
  let idsDemandes: number[];

  const creer = (reponse: () => Promise<Signalement>, id = '31'): void => {
    idsDemandes = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SignalementService,
          useValue: {
            trouver: (valeur: number) => {
              idsDemandes.push(valeur);
              return reponse();
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(SignalementDetailPage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };

  const attendre = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('convertit le parametre de route en identifiant numerique', async () => {
    creer(() => Promise.resolve(SIGNALEMENT));
    await attendre();

    // La route porte une chaine, l'API attend un entier.
    expect(idsDemandes).toEqual([31]);
  });

  it('affiche le titre complet, jamais tronque', async () => {
    creer(() => Promise.resolve(SIGNALEMENT));
    await attendre();

    const titre = fixture.nativeElement.querySelector('.detail__titre');
    expect(titre.textContent.trim()).toBe('Nid-de-poule profond sur la VDN');
  });

  it('montre un indicateur pendant le chargement', () => {
    creer(() => new Promise(() => undefined));

    expect(component.chargement()).toBe(true);
    expect(fixture.nativeElement.querySelector('ion-spinner')).toBeTruthy();
  });

  it('affiche le message de l API quand le signalement n existe pas', async () => {
    creer(() => Promise.reject(new ErreurApi("Ce signalement n'existe pas ou plus.", 404)));
    await attendre();

    expect(component.signalement()).toBeUndefined();
    expect(component.erreur()).toBe("Ce signalement n'existe pas ou plus.");
    expect(fixture.nativeElement.textContent).toContain("n'existe pas ou plus");
  });

  it('permet de reessayer apres un echec', async () => {
    let echoue = true;
    creer(() =>
      echoue
        ? Promise.reject(new ErreurApi('Le serveur est injoignable.', 0))
        : Promise.resolve(SIGNALEMENT),
    );
    await attendre();
    expect(component.erreur()).toBeTruthy();

    echoue = false;
    component.reessayer();
    await attendre();

    expect(component.erreur()).toBeNull();
    expect(component.signalement()?.id).toBe(31);
  });
});
