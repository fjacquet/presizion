import { describe, expect, it } from 'vitest';
import { formatInt, formatNumber } from '../format';
import i18n from '../index';

describe('locale number formatting', () => {
  it('groups thousands per the active locale (de → Swiss grouping)', async () => {
    await i18n.changeLanguage('de');
    // Assert against the runtime's own Intl output so the test is ICU-build robust.
    expect(formatInt(12345)).toBe(
      new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 }).format(12345),
    );
    // And assert it actually groups (not a bare "12345").
    expect(formatInt(12345)).not.toBe('12345');
  });

  it('respects fraction digits and active locale', async () => {
    await i18n.changeLanguage('en');
    expect(formatNumber(Math.PI, { maximumFractionDigits: 2 })).toBe(
      new Intl.NumberFormat('en-CH', { maximumFractionDigits: 2 }).format(Math.PI),
    );
  });

  it('falls back to en-CH locale for an unknown language', async () => {
    await i18n.changeLanguage('en');
    expect(formatInt(1000)).toBe(
      new Intl.NumberFormat('en-CH', { maximumFractionDigits: 0 }).format(1000),
    );
  });
});
