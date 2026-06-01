import { describe, expect, it } from 'vitest';
import { NAMESPACES, SUPPORTED_LANGUAGES } from '../config';
import { resources } from '../index';

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v)
      ? flatKeys(v as Record<string, unknown>, key)
      : [key];
  });
}

describe('i18n key parity', () => {
  for (const ns of NAMESPACES) {
    const enKeys = flatKeys(resources.en[ns]).sort();
    for (const lng of SUPPORTED_LANGUAGES) {
      if (lng === 'en') continue;
      it(`${lng}/${ns} has the same keys as en/${ns}`, () => {
        const lngKeys = flatKeys(resources[lng][ns]).sort();
        expect(lngKeys).toEqual(enKeys);
      });
    }
  }
});
