import { VanillaTheme } from '../components/vanilla/type'
import { getRandomLocalFont } from '../util/faker/font'
import { randInt } from '../util/random'

export const useRandomTheme = (): VanillaTheme => {
  const {
    background,
    text,
    button,
    buttonText
  } = THEMES[randInt(0, THEMES.length - 1)]
  return {
    palette: {
      backgroundColor: background,
      primary: button,
      secondary: '#FFF7F0',
      typography: {
        primary: text,
        button: buttonText,
      },
    },
    font: {
      fontFamily: {
        primary: getRandomLocalFont(),
        secondary: getRandomLocalFont(),
      },
    },
  }
}

const THEMES = [
  // --- LIGHT NEUTRALS ---
  {
    background: '#FFFFFF',
    text: '#111827',
    button: '#2563EB',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F9FAFB',
    text: '#1F2937',
    button: '#10B981',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F3F4F6',
    text: '#111827',
    button: '#4F46E5',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFFDF8',
    text: '#1C1917',
    button: '#EA580C',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FAFAF9',
    text: '#1E293B',
    button: '#3B82F6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FEFEFE',
    text: '#0F172A',
    button: '#6366F1',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F5F5F5',
    text: '#171717',
    button: '#22C55E',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F9F9F9',
    text: '#111111',
    button: '#0EA5E9',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FCFCFC',
    text: '#0A0A0A',
    button: '#7C3AED',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F7F7F7',
    text: '#0F172A',
    button: '#059669',
    buttonText: '#FFFFFF',
  },

  // --- LIGHT WARM ---
  {
    background: '#FEFCE8',
    text: '#713F12',
    button: '#D97706',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFF7ED',
    text: '#78350F',
    button: '#F97316',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFF1F2',
    text: '#831843',
    button: '#DB2777',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFF7F0',
    text: '#7C2D12',
    button: '#EA580C',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FDF2F8',
    text: '#831843',
    button: '#BE185D',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FEF9C3',
    text: '#78350F',
    button: '#CA8A04',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFFDEA',
    text: '#713F12',
    button: '#EAB308',
    buttonText: '#000000',
  },
  {
    background: '#FEF3C7',
    text: '#451A03',
    button: '#F59E0B',
    buttonText: '#000000',
  },
  {
    background: '#FFF7E1',
    text: '#431407',
    button: '#F97316',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFFBEB',
    text: '#451A03',
    button: '#FBBF24',
    buttonText: '#000000',
  },

  // --- LIGHT COOL ---
  {
    background: '#ECFDF5',
    text: '#064E3B',
    button: '#10B981',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F0F9FF',
    text: '#0C4A6E',
    button: '#0284C7',
    buttonText: '#FFFFFF',
  },
  {
    background: '#EEF2FF',
    text: '#312E81',
    button: '#6366F1',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F5F3FF',
    text: '#3730A3',
    button: '#8B5CF6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#E0F2FE',
    text: '#075985',
    button: '#0EA5E9',
    buttonText: '#FFFFFF',
  },
  {
    background: '#E0F7FA',
    text: '#004D40',
    button: '#00BCD4',
    buttonText: '#FFFFFF',
  },
  {
    background: '#EFF6FF',
    text: '#1E3A8A',
    button: '#2563EB',
    buttonText: '#FFFFFF',
  },
  {
    background: '#F1F5F9',
    text: '#0F172A',
    button: '#3B82F6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#ECFEFF',
    text: '#134E4A',
    button: '#06B6D4',
    buttonText: '#FFFFFF',
  },
  {
    background: '#E0F2FE',
    text: '#082F49',
    button: '#38BDF8',
    buttonText: '#000000',
  },

  // --- LIGHT PASTELS / CREATIVE ---
  {
    background: '#FDF2F8',
    text: '#831843',
    button: '#EC4899',
    buttonText: '#FFFFFF',
  },
  {
    background: '#E0F7FA',
    text: '#004D40',
    button: '#26C6DA',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFF0F5',
    text: '#831843',
    button: '#E879F9',
    buttonText: '#000000',
  },
  {
    background: '#FFF8E1',
    text: '#5D4037',
    button: '#FFB300',
    buttonText: '#000000',
  },
  {
    background: '#F3E8FF',
    text: '#4A044E',
    button: '#A855F7',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FDF4FF',
    text: '#581C87',
    button: '#C084FC',
    buttonText: '#000000',
  },
  {
    background: '#F0FDF4',
    text: '#14532D',
    button: '#22C55E',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FEF2F2',
    text: '#7F1D1D',
    button: '#DC2626',
    buttonText: '#FFFFFF',
  },
  {
    background: '#FFF7F0',
    text: '#78350F',
    button: '#F97316',
    buttonText: '#FFFFFF',
  },
  {
    background: '#ECFCCB',
    text: '#365314',
    button: '#84CC16',
    buttonText: '#000000',
  },

  // --- DARK NEUTRALS ---
  {
    background: '#111827',
    text: '#F9FAFB',
    button: '#2563EB',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E1E1E',
    text: '#E5E5E5',
    button: '#BB86FC',
    buttonText: '#000000',
  },
  {
    background: '#0F172A',
    text: '#E2E8F0',
    button: '#38BDF8',
    buttonText: '#0F172A',
  },
  {
    background: '#1A1A1A',
    text: '#F5F5F5',
    button: '#22C55E',
    buttonText: '#000000',
  },
  {
    background: '#18181B',
    text: '#FAFAFA',
    button: '#EAB308',
    buttonText: '#000000',
  },
  {
    background: '#0B1120',
    text: '#E2E8F0',
    button: '#3B82F6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E293B',
    text: '#F1F5F9',
    button: '#E11D48',
    buttonText: '#FFFFFF',
  },
  {
    background: '#0F172A',
    text: '#F8FAFC',
    button: '#6366F1',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1C1917',
    text: '#E7E5E4',
    button: '#F97316',
    buttonText: '#000000',
  },
  {
    background: '#111827',
    text: '#E5E7EB',
    button: '#84CC16',
    buttonText: '#000000',
  },

  // --- DARK BLUE / CYAN ---
  {
    background: '#0F172A',
    text: '#E2E8F0',
    button: '#06B6D4',
    buttonText: '#0F172A',
  },
  {
    background: '#1E293B',
    text: '#CBD5E1',
    button: '#3B82F6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#0B1120',
    text: '#F1F5F9',
    button: '#2563EB',
    buttonText: '#FFFFFF',
  },
  {
    background: '#111827',
    text: '#E2E8F0',
    button: '#0EA5E9',
    buttonText: '#0F172A',
  },
  {
    background: '#0A1128',
    text: '#E0E7FF',
    button: '#2563EB',
    buttonText: '#FFFFFF',
  },
  {
    background: '#0D1117',
    text: '#C9D1D9',
    button: '#58A6FF',
    buttonText: '#0D1117',
  },
  {
    background: '#172554',
    text: '#E2E8F0',
    button: '#3B82F6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E3A8A',
    text: '#F8FAFC',
    button: '#60A5FA',
    buttonText: '#000000',
  },
  {
    background: '#0F172A',
    text: '#E5E7EB',
    button: '#1D4ED8',
    buttonText: '#FFFFFF',
  },
  {
    background: '#0B1120',
    text: '#E2E8F0',
    button: '#0284C7',
    buttonText: '#FFFFFF',
  },

  // --- DARK PURPLE / INDIGO ---
  {
    background: '#1E1B4B',
    text: '#E0E7FF',
    button: '#6366F1',
    buttonText: '#FFFFFF',
  },
  {
    background: '#312E81',
    text: '#EEF2FF',
    button: '#8B5CF6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#4C1D95',
    text: '#FAF5FF',
    button: '#A855F7',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E1B4B',
    text: '#E0E7FF',
    button: '#7C3AED',
    buttonText: '#FFFFFF',
  },
  {
    background: '#3730A3',
    text: '#EDE9FE',
    button: '#8B5CF6',
    buttonText: '#FFFFFF',
  },
  {
    background: '#312E81',
    text: '#E0E7FF',
    button: '#A78BFA',
    buttonText: '#000000',
  },
  {
    background: '#1E1B4B',
    text: '#EDE9FE',
    button: '#818CF8',
    buttonText: '#000000',
  },
  {
    background: '#2E1065',
    text: '#EDE9FE',
    button: '#7C3AED',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E1B4B',
    text: '#F5F3FF',
    button: '#A78BFA',
    buttonText: '#000000',
  },
  {
    background: '#2E1065',
    text: '#DDD6FE',
    button: '#9333EA',
    buttonText: '#FFFFFF',
  },

  // --- DARK RED / AMBER ---
  {
    background: '#1C1917',
    text: '#E7E5E4',
    button: '#F97316',
    buttonText: '#000000',
  },
  {
    background: '#18181B',
    text: '#E4E4E7',
    button: '#F43F5E',
    buttonText: '#FFFFFF',
  },
  {
    background: '#171717',
    text: '#FAFAFA',
    button: '#DC2626',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1C1917',
    text: '#F4F4F5',
    button: '#FACC15',
    buttonText: '#000000',
  },
  {
    background: '#0F172A',
    text: '#E2E8F0',
    button: '#FB923C',
    buttonText: '#000000',
  },
  {
    background: '#18181B',
    text: '#FAFAFA',
    button: '#E11D48',
    buttonText: '#FFFFFF',
  },
  {
    background: '#1E1E1E',
    text: '#F5F5F5',
    button: '#F59E0B',
    buttonText: '#000000',
  },
  {
    background: '#1A1A1A',
    text: '#E4E4E7',
    button: '#F87171',
    buttonText: '#000000',
  },
  {
    background: '#121212',
    text: '#EAEAEA',
    button: '#D97706',
    buttonText: '#000000',
  },
  {
    background: '#18181B',
    text: '#E5E7EB',
    button: '#EF4444',
    buttonText: '#FFFFFF',
  },
]
