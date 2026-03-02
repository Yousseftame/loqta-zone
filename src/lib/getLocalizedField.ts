/**
 * Gets the correct language field from a Firestore multilingual map
 * @param {object} field - e.g. { en: "Hello", ar: "مرحبا" }
 * @param {string} lang - current language 'en' | 'ar'
 * @param {string} fallback - fallback if field missing
 */
export const getLocalizedField = (field :any, lang :any, fallback = '') => {
  if (!field) return fallback;
  return field[lang] || field['en'] || fallback;
};