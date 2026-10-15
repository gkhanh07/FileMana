/** Lower-case without diacritics, so "thiet ke" finds "Thiết kế" (FR-SEARCH-02). */
export const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
