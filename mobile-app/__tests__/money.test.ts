import { formatMinor, parseAmountToMinor } from '../src/utils/money';

describe('formatMinor', () => {
  it.each([
    [0, '£0.00'],
    [1, '£0.01'],
    [420, '£4.20'],
    [250_000, '£2,500.00'],
    [-420, '-£4.20'],
  ])('formats %p pence as %p', (minor, expected) => {
    expect(formatMinor(minor)).toBe(expected);
  });
});

describe('parseAmountToMinor', () => {
  it.each([
    ['10', 1000],
    ['10.5', 1050],
    ['10.50', 1050],
    ['0.01', 1],
    ['1,000.00', 100_000],
    ['£12', 1200],
    ['  7.25 ', 725],
    ['0', 0],
    ['.50', 50], // BUG-003 regression test
  ])('parses %p as %p pence', (input, expected) => {
    expect(parseAmountToMinor(input)).toBe(expected);
  });

  // Floating point trap: 0.1 + 0.2 !== 0.3, and 19.99 * 100 === 1998.9999999999998.
  it('converts 19.99 to exactly 1999 pence (no float rounding error)', () => {
    expect(parseAmountToMinor('19.99')).toBe(1999);
  });

  it.each(['', ' ', 'abc', '-5', '1.005', '1..0', '.', '10.', '1e3', '£'])('rejects %p', (input) => {
    expect(parseAmountToMinor(input)).toBeNull();
  });

  // Known limitation (see docs/bug-reports.md, BUG-004): a European-style decimal comma
  // is read as a thousands separator. This test documents current behaviour.
  it('treats "12,34" as £1,234.00 (known limitation)', () => {
    expect(parseAmountToMinor('12,34')).toBe(123_400);
  });
});
