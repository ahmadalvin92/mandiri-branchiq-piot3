/**
 * Central Category Themes for Bank Mandiri BranchIQ Dashboard
 * Ensures DPK, Kredit, Livin, Kopra, Acquiring, GMM, and Ekosistem
 * each have distinct, vibrant, recognizable color themes for badges, tags, and banners.
 */

export const CATEGORY_THEMES = {
  DPK: {
    name: 'DPK',
    badge: 'bg-blue-100 text-[#003D79] border-blue-300 font-bold',
    tag: 'bg-blue-100/90 text-[#003D79] border border-blue-200 font-extrabold',
    banner: 'bg-blue-100/80 text-[#003D79] border-blue-200',
    borderLeft: 'border-l-blue-600',
    accentHex: '#003D79',
    bgLight: 'bg-blue-50/50',
    cardBorder: 'border-blue-300',
    label: 'Biru Mandiri'
  },
  Kredit: {
    name: 'Kredit',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    tag: 'bg-emerald-100/90 text-emerald-900 border border-emerald-200 font-extrabold',
    banner: 'bg-emerald-100/80 text-emerald-950 border-emerald-200',
    borderLeft: 'border-l-emerald-600',
    accentHex: '#059669',
    bgLight: 'bg-emerald-50/50',
    cardBorder: 'border-emerald-300',
    label: 'Hijau Zamrud'
  },
  Livin: {
    name: 'Livin',
    badge: 'bg-amber-100 text-amber-950 border-amber-400 font-black',
    tag: 'bg-amber-100 text-amber-950 border border-amber-300 font-black',
    banner: 'bg-amber-100/90 text-amber-950 border-amber-300',
    borderLeft: 'border-l-amber-500',
    accentHex: '#D97706',
    bgLight: 'bg-amber-50/50',
    cardBorder: 'border-amber-300',
    label: 'Kuning Emas Mandiri Livin'
  },
  Kopra: {
    name: 'Kopra',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold',
    tag: 'bg-indigo-100/90 text-indigo-900 border border-indigo-200 font-extrabold',
    banner: 'bg-indigo-100/80 text-indigo-950 border-indigo-200',
    borderLeft: 'border-l-indigo-600',
    accentHex: '#4F46E5',
    bgLight: 'bg-indigo-50/50',
    cardBorder: 'border-indigo-300',
    label: 'Ungu Indigo Kopra'
  },
  Acquiring: {
    name: 'Acquiring',
    badge: 'bg-purple-100 text-purple-900 border-purple-300 font-bold',
    tag: 'bg-purple-100/90 text-purple-900 border border-purple-200 font-extrabold',
    banner: 'bg-purple-100/80 text-purple-950 border-purple-200',
    borderLeft: 'border-l-purple-600',
    accentHex: '#9333EA',
    bgLight: 'bg-purple-50/50',
    cardBorder: 'border-purple-300',
    label: 'Magenta / Ungu Violet'
  },
  GMM: {
    name: 'GMM',
    badge: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    tag: 'bg-rose-100/90 text-rose-900 border border-rose-200 font-extrabold',
    banner: 'bg-rose-100/80 text-rose-950 border-rose-200',
    borderLeft: 'border-l-rose-600',
    accentHex: '#E11D48',
    bgLight: 'bg-rose-50/50',
    cardBorder: 'border-rose-300',
    label: 'Ruby Rose / Coral'
  },
  Ekosistem: {
    name: 'Ekosistem',
    badge: 'bg-teal-100 text-teal-900 border-teal-300 font-bold',
    tag: 'bg-teal-100/90 text-teal-900 border border-teal-200 font-extrabold',
    banner: 'bg-teal-100/80 text-teal-950 border-teal-200',
    borderLeft: 'border-l-teal-600',
    accentHex: '#0D9488',
    bgLight: 'bg-teal-50/50',
    cardBorder: 'border-teal-300',
    label: 'Hijau Toska / Teal'
  }
};

export function getCategoryTheme(category) {
  return (
    CATEGORY_THEMES[category] || {
      name: category,
      badge: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
      tag: 'bg-slate-100 text-slate-700 border border-slate-200 font-bold',
      banner: 'bg-slate-100 text-[#003D79] border-slate-200',
      borderLeft: 'border-l-slate-400',
      accentHex: '#64748B',
      bgLight: 'bg-slate-50',
      cardBorder: 'border-slate-200',
      label: category
    }
  );
}
