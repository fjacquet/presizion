import 'react-i18next';
import type { DEFAULT_NS } from './config';
import type { resources } from './index';

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NS;
    resources: (typeof resources)['en'];
  }
}
