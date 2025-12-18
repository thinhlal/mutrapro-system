// Klang API Base URL
// In development: use relative path (Vite proxy handles it)
// In production: use full API Gateway URL
const getKlangBaseUrl = () => {
  if (import.meta.env.DEV) {
    // Development: use relative path, Vite proxy will handle it
    return '/klang-api';
  } else {
    // Production: use full URL to API Gateway
    const apiBaseUrl =
      import.meta.env.VITE_API_BACK_END_ENDPOINT || 'https://api.mutrapro.top';
    return `${apiBaseUrl}/klang-api`;
  }
};

export const KLANG_BASE_URL = getKlangBaseUrl();

// Lấy từ .env hoặc fallback (demo)
export const KLANG_API_KEY =
  import.meta.env.VITE_KLANG_API_KEY || '0xkl-PASTE-YOUR-KEY-HERE';

// Các model theo bảng Model Selection
export const KLANG_MODELS = [
  { value: 'detect', label: 'Auto detect' },
  { value: 'universal', label: 'Universal (general)' },
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
  { value: 'vocal', label: 'Vocal' },
  { value: 'lead', label: 'Lead melody' },
  { value: 'drums', label: 'Drums' },
  { value: 'wind', label: 'Wind instruments' },
  { value: 'string', label: 'Strings (violin, viola, cello…)' },
  { value: 'piano_arrangement', label: 'Piano arrangement' },
];
