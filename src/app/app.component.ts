import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Instancie des le demarrage : c'est lui qui applique la classe de theme
  // sur <html> avant le premier rendu des ecrans.
  private readonly theme = inject(ThemeService);
}
