/**
 * Klang AI Transcription Configuration
 * Similar to frontend klangConfig
 */

import { KLANG_API_KEY as ENV_KLANG_KEY, FLAT_APP_ID as ENV_FLAT_APP_ID } from '@env';

// Klang API base URL 
// Frontend uses: /klang-api → proxied to https://api.klang.io
// Mobile: call directly to https://api.klang.io (no proxy)
export const KLANG_BASE_URL = 'https://api.klang.io'; 

// Klang API Key - Read from .env file
// Create mobile/.env and add: KLANG_API_KEY=your_key_here
export const KLANG_API_KEY = ENV_KLANG_KEY || '0xkl-8a4f319792c33cb1bd09e298b53e4940';

// Flat.io App ID for sheet music viewer
// Add to mobile/.env: FLAT_APP_ID=59e7684b476cba39490801c2
export const FLAT_APP_ID = ENV_FLAT_APP_ID || 'YOUR_FLAT_APP_ID';

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

