// Pure helpers and types — safe to import from client or server.

export interface Language {
  code: string;        // BCP-47-ish code (Whisper-compatible)
  label: string;       // Native-language label (so seniors recognize their own language)
  englishLabel: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English',        englishLabel: 'English' },
  { code: 'zh', label: '中文',           englishLabel: 'Chinese (Mandarin)' },
  { code: 'es', label: 'Español',        englishLabel: 'Spanish' },
  { code: 'pt', label: 'Português',      englishLabel: 'Portuguese' },
  { code: 'fr', label: 'Français',       englishLabel: 'French' },
  { code: 'de', label: 'Deutsch',        englishLabel: 'German' },
  { code: 'it', label: 'Italiano',       englishLabel: 'Italian' },
  { code: 'ja', label: '日本語',         englishLabel: 'Japanese' },
  { code: 'ko', label: '한국어',         englishLabel: 'Korean' },
  { code: 'ar', label: 'العربية',        englishLabel: 'Arabic' },
  { code: 'hi', label: 'हिन्दी',          englishLabel: 'Hindi' },
  { code: 'vi', label: 'Tiếng Việt',     englishLabel: 'Vietnamese' },
];

export const LANGUAGE_COOKIE = 'legacy_lang';
export const DEFAULT_LANGUAGE = 'en';

const VALID_CODES = new Set(LANGUAGES.map((l) => l.code));

export function isValidLanguage(code: string): boolean {
  return VALID_CODES.has(code);
}

export function resolveLanguage(value: string | undefined): string {
  if (!value) return DEFAULT_LANGUAGE;
  return isValidLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
