// La zona horaria del negocio: las fechas "de hoy" y los rangos de
// reportes se calculan en hora chilena, igual que las funciones SQL.
const TIMEZONE = "America/Santiago";

/** Fecha de hoy en formato YYYY-MM-DD, en hora de Chile. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

/** Primer día del mes actual en formato YYYY-MM-DD, en hora de Chile. */
export function monthStartLocal(): string {
  return todayLocal().slice(0, 7) + "-01";
}

/** Resta días a una fecha YYYY-MM-DD (aritmética UTC, sin sorpresas de DST). */
export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
