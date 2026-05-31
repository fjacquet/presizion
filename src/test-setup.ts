import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
// Initialize i18next globally so components using useTranslation() resolve
// against the `en` resources during tests (tests don't import main.tsx).
import i18n from '@/i18n';

// Recharts ResponsiveContainer requires ResizeObserver which jsdom lacks
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Force English before each test for deterministic, locale-independent assertions.
beforeEach(() => {
  if (i18n.language !== 'en') void i18n.changeLanguage('en');
});
