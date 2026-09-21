import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'signalements',
        loadComponent: () =>
          import('../pages/signalements/signalements.page').then((m) => m.SignalementsPage),
      },
      {
        // Detail hierarchique : la barre d'onglets reste visible et le retour
        // ramene a la liste.
        path: 'signalements/:id',
        loadComponent: () =>
          import('../pages/signalement-detail/signalement-detail.page').then(
            (m) => m.SignalementDetailPage,
          ),
      },
      {
        path: 'nouveau',
        loadComponent: () =>
          import('../pages/nouveau/nouveau.page').then((m) => m.NouveauPage),
      },
      {
        path: 'reglages',
        loadComponent: () =>
          import('../pages/reglages/reglages.page').then((m) => m.ReglagesPage),
      },
      {
        path: '',
        redirectTo: '/tabs/signalements',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/signalements',
    pathMatch: 'full',
  },
];
