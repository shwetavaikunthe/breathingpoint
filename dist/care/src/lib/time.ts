/** "06:00:00" -> "06:00" */
export const hhmm = (t: string): string => t.slice(0, 5);

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Adds minutes to "HH:MM". Returns '' if the result would pass midnight. */
export const addMinutes = (t: string, add: number): string => {
  if (!t) return '';
  const total = toMinutes(t) + add;
  if (total >= 24 * 60) return '';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const formatDateTime = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
