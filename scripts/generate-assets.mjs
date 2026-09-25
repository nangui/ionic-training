// Genere les images sources lues par `npx capacitor-assets generate`.
//
// Motif : une epingle de carte (le signalement) marquee d'une coche
// (le probleme resolu), aux couleurs de src/theme/variables.scss.
//
// Usage : node scripts/generate-assets.mjs

import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const COULEURS = {
  clair: { fond: '#f5f5f1', primaire: '#0f766e', contraste: '#ffffff' },
  sombre: { fond: '#111714', primaire: '#2da192', contraste: '#06201d' },
};

// Epingle dessinee dans un carre de 1024, centree en x = 512.
const epingle = (corps, coche) => `
  <path fill="${corps}"
    d="M512,820 C430,700 302,590 302,430 A210,210 0 1,1 722,430 C722,590 594,700 512,820 Z"/>
  <polyline points="428,432 488,492 598,376" fill="none" stroke="${coche}"
    stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>`;

// Icone : fond plein, sans transparence ni coins arrondis (le systeme
// applique son propre masque). L'epingle tient dans les 66 % centraux,
// la zone que les icones adaptatives Android ne rognent jamais.
const icone = () => `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="1024" height="1024" fill="${COULEURS.clair.primaire}"/>
    ${epingle(COULEURS.clair.contraste, COULEURS.clair.primaire)}
  </svg>`;

// Splash : epingle seule, centree, sur le fond de l'application. Elle
// occupe ~22 % de la hauteur pour survivre au recadrage des ecrans.
const splash = ({ fond, primaire, contraste }) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
    <rect width="2732" height="2732" fill="${fond}"/>
    <g transform="translate(1366,1366) translate(-512,-520)">
      ${epingle(primaire, fond === COULEURS.clair.fond ? contraste : fond)}
    </g>
  </svg>`;

const ecrire = (svg, fichier) =>
  sharp(Buffer.from(svg)).flatten().png().toFile(fichier);

await mkdir('assets', { recursive: true });
await ecrire(icone(), 'assets/icon.png');
await ecrire(splash(COULEURS.clair), 'assets/splash.png');
await ecrire(splash(COULEURS.sombre), 'assets/splash-dark.png');
console.log('assets/icon.png, assets/splash.png, assets/splash-dark.png generes');
