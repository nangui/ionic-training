#!/usr/bin/env node
/**
 * Vérifie que la carte reste dans un morceau différé.
 *
 * Pourquoi un script plutôt qu'un test : le `@defer` de l'écran de liste est
 * annulé par la moindre référence statique au composant de carte — un import
 * de type depuis son fichier suffit. Leaflet retombe alors dans le morceau de
 * la page, **sans erreur, sans avertissement et sans test rouge**. Le seul
 * signal est la disparition d'une ligne dans la sortie de build.
 *
 * C'est arrivé une fois : la page de liste est passée de 8 à 49 ko transférés.
 *
 * Usage : node scripts/verifier-report.mjs   (lance le build lui-même)
 */
import { execFileSync } from 'node:child_process';

/** Morceau attendu, et taille maximale de la page qui le diffère. */
const MORCEAU_ATTENDU = 'carte-signalements-component';
const PAGE_SURVEILLEE = 'signalements-page';
const PAGE_MAX_KO = 20;

function construire() {
  try {
    return execFileSync('npx', ['ng', 'build'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (erreur) {
    console.error('Le build a échoué :\n' + (erreur.stdout ?? '') + (erreur.stderr ?? ''));
    process.exit(1);
  }
}

/** Extrait { nom, ko } de chaque ligne de morceau de la sortie de build. */
function morceaux(sortie) {
  const lignes = sortie.split('\n');
  const trouves = [];
  for (const ligne of lignes) {
    // chunk-XXXX.js | nom | 164.97 kB | 41.53 kB
    const colonnes = ligne.split('|').map((c) => c.trim());
    if (colonnes.length < 4 || !colonnes[0].endsWith('.js')) {
      continue;
    }
    const transfere = Number.parseFloat(colonnes[3]);
    if (Number.isNaN(transfere)) {
      continue;
    }
    trouves.push({ nom: colonnes[1], ko: transfere });
  }
  return trouves;
}

const sortie = construire();
const liste = morceaux(sortie);
const echecs = [];

const carte = liste.find((m) => m.nom === MORCEAU_ATTENDU);
if (!carte) {
  echecs.push(
    `Le morceau « ${MORCEAU_ATTENDU} » a disparu de la sortie de build.\n` +
      "  Cause la plus probable : une référence statique au composant de carte depuis\n" +
      "  l'écran de liste — un import de type depuis son fichier suffit. Le @defer est\n" +
      '  annulé et Leaflet repart dans le morceau de la page.\n' +
      '  Importez les types depuis carte-signalements.model.ts, jamais depuis le composant.',
  );
}

const page = liste.find((m) => m.nom === PAGE_SURVEILLEE);
if (page && page.ko > PAGE_MAX_KO) {
  echecs.push(
    `Le morceau « ${PAGE_SURVEILLEE} » pèse ${page.ko} ko transférés, au-delà des ${PAGE_MAX_KO} ko attendus.\n` +
      '  Une bibliothèque lourde y est probablement retombée.',
  );
}

if (echecs.length > 0) {
  console.error('\nVérification du report échouée :\n');
  for (const echec of echecs) {
    console.error('  ✘ ' + echec + '\n');
  }
  process.exit(1);
}

console.log(
  `Report vérifié : « ${MORCEAU_ATTENDU} » est différé (${carte.ko} ko), ` +
    `« ${PAGE_SURVEILLEE} » pèse ${page ? page.ko : '?'} ko.`,
);
