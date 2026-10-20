/** Calendar-based age calculation. DOB is input only and must never be persisted or logged. */
export function isAtLeast18(dateOfBirth: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  if (date.getTime() > now.getTime()) return false;
  let age = now.getUTCFullYear() - year;
  const birthdayNotReached = now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (birthdayNotReached) age -= 1;
  return age >= 18;
}
