type LocalizedMap = {
  en?: string;
  ar?: string;
  [key: string]: string | undefined;
};

export const getLocalizedField = (
  field: LocalizedMap | null | undefined,
  lang: 'en' | 'ar',
  fallback = ''
): string => {
  if (!field) return fallback;
  return field[lang] ?? field['en'] ?? fallback;
};