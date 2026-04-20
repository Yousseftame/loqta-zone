import i18n from './i18n';

type LocalizedMap = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

export const getLocalizedField = (
  field: LocalizedMap | null | undefined,
  lang?: 'en' | 'ar',
  fallback = ''
): string => {
  if (!field) return fallback;
  const currentLang = lang || ((i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar');
  return field[currentLang] ?? field['en'] ?? fallback;
};