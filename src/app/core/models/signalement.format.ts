/**
 * Mise en forme des dates de signalement.
 *
 * Centralise ici pour que la liste, le detail et la carte affichent la meme
 * chose. L'heure est rendue dans le fuseau de l'appareil, ce qui est le
 * comportement attendu pour un signalement local.
 */
const FORMAT_COURT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const FORMAT_LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Date ISO -> "19 sept., 08:42" (fuseau de l'appareil). */
export function formaterDateCourte(dateIso: string): string {
  return FORMAT_COURT.format(new Date(dateIso));
}

/** Date ISO -> "samedi 19 septembre 2026, 08:42" (fuseau de l'appareil). */
export function formaterDateLongue(dateIso: string): string {
  return FORMAT_LONG.format(new Date(dateIso));
}

/** Coordonnees abregees a quatre decimales (~11 m de precision). */
export function formaterCoordonnees(
  latitude: number,
  longitude: number,
): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
