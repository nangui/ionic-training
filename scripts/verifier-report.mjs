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

/** npx s'appelle npx.cmd sur Windows, et execFileSync ne le devine pas. */
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** Morceau attendu, et taille maximale de la page qui le diffère. */
const MORCEAU_ATTENDU = 'carte-signalements-component';
const PAGE_SURVEILLEE = 'signalements-page';
const PAGE_MAX_KO = 20;

function construire() {
  try {
    return execFileSync(NPX, ['ng', 'build'], {
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

// Sans ce controle, une sortie devenue illisible - couleurs ANSI, changement
// de format d'Angular - donnerait une liste vide, donc un « morceau absent »
// avec un diagnostic faux. Un garde-fou doit savoir dire qu'il n'a pas pu
// verifier.
if (liste.length < 3) {
  console.error(
    "\nVérification du report impossible : la sortie de build n'a pas pu être lue\n" +
      `  (${liste.length} morceau(x) reconnu(s), ce qui est anormalement bas).\n` +
      "  Le format de sortie d'Angular a probablement changé. Ce n'est pas un échec\n" +
      '  du report : adaptez la lecture dans scripts/verifier-report.mjs.\n',
  );
  process.exit(2);
}

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
      "  Soit une bibliothèque lourde y est retombée, soit l'écran a grossi pour une\n" +
      `  bonne raison — dans ce cas, relevez PAGE_MAX_KO en connaissance de cause.`,
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
