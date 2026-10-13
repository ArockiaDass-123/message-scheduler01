import { format } from 'date-fns';

/**
 * Safely parse a date string from the API into a local Date object.
 * SQLite/FastAPI often returns UTC timestamps without the trailing 'Z'.
 * Appending 'Z' ensures the browser converts from UTC to the user's local timezone (e.g. IST).
 */
export const parseUtcDate = (dateInput: string | Date | undefined | null): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  let s = String(dateInput).trim();
  if (!s) return null;
  if (!s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s = s + 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (
  dateInput: string | Date | undefined | null,
  formatStr: string,
  fallback = 'None'
): string => {
  const d = parseUtcDate(dateInput);
  if (!d) return fallback;
  try {
    return format(d, formatStr);
  } catch {
    return fallback;
  }
};
