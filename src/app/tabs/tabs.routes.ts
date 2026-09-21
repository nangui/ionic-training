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
