/**
 * TEMPORARY CONFIG - For testing API key
 * Replace with actual key from frontend .env
 */

// KLANG API base URL 
export const KLANG_BASE_URL = 'https://api.klang.io'; 

// HARDCODED API KEY - TEMPORARY TEST
// TODO: Get key from frontend/.env and paste here
export const KLANG_API_KEY = '0xkl-PASTE-YOUR-ACTUAL-KEY-HERE';

// Polling interval for job status (milliseconds)
export const POLL_INTERVAL_MS = 4000;

// Available AI models for transcription
export const KLANG_MODELS = [
  { value: 'detect', label: 'Auto Detect' },
  { value: 'universal', label: 'Universal (General)' },
  { value: 'piano', label: 'Piano' },
  { value: 'guitar', label: 'Guitar' },
  { value: 'bass', label: 'Bass' },
  { value: 'vocal', label: 'Vocal' },
  { value: 'lead', label: 'Lead Melody' },
  { value: 'drums', label: 'Drums' },
  { value: 'wind', label: 'Wind Instruments' },
  { value: 'string', label: 'Strings (Violin, Viola, Cello)' },
  { value: 'piano_arrangement', label: 'Piano Arrangement' },
];

// Job status constants
export const JOB_STATUS = {
  CREATING: 'CREATING',
  IN_QUEUE: 'IN_QUEUE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

// Free plan limitations
export const FREE_PLAN_LIMITS = {
  MAX_DURATION_SECONDS: 15,
  MAX_FILE_SIZE_MB: 10,
};

