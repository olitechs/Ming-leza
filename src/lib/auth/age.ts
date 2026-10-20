/** Calendar-based age calculation. DOB is input only and must never be persisted or logged. */
export function isAtLeast18(dateOfBirth: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const parts = dateOfBirth.split("-");
  if (parts.length !== 3) return false;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  if (date.getTime() > now.getTime()) return false;
  let age = now.getUTCFullYear() - year;
  const birthdayNotReached =
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (birthdayNotReached) age -= 1;
  return age >= 18;
}
