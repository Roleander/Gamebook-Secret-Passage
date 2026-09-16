import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'fr', 'de', 'it', 'pt', 'pl', 'sv', 'cs', 'hi', 'ja'],
  defaultLocale: 'es'
});
