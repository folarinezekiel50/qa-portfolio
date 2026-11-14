/**
 * Money helpers. The app never stores money as a floating point number:
 * everything is an integer number of pence ("minor units"), exactly like the API.
 */

const formatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

/** 250000 -> "£2,500.00", -420 -> "-£4.20" */
export function formatMinor(minor: number): string {
  return formatter.format(minor / 100);
}

/**
 * Parses what the user typed into pence.
 * Accepts "10", "10.5", "10.50", ".50", "1,000.00", "£12". Returns null for anything else
 * (empty, negative, letters, more than 2 decimal places, multiple dots).
 * BUG-003 regression: ".50" used to be rejected; it is now accepted as 50p.
 */
export function parseAmountToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/^£/, '').replace(/,/g, '');
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(cleaned)) return null;
  const [pounds, pence = ''] = cleaned.split('.');
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}
