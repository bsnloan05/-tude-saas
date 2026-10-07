// Le serveur (Vercel) tourne en UTC, mais "aujourd'hui" ou "ce mois-ci"
// doivent correspondre au jour/mois en heure de Paris, pas en UTC (qui ne
// change pas à minuit heure française) — sinon un compteur ou un quota basé
// sur "depuis le début du mois/jour" est décalé de quelques heures autour
// des changements de jour/mois.
function parisOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const paris = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return (paris.getTime() - utc.getTime()) / 60000;
}

export function startOfDayParis(daysAgo = 0): string {
  const now = new Date();
  const offsetMin = parisOffsetMinutes(now);
  const shifted = new Date(now.getTime() + offsetMin * 60000);
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMin * 60000).toISOString();
}

export function startOfMonthParis(): string {
  const now = new Date();
  const offsetMin = parisOffsetMinutes(now);
  const shifted = new Date(now.getTime() + offsetMin * 60000);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMin * 60000).toISOString();
}
