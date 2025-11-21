import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_BASE_URL || 'https://kh2b392k.us-east.insforge.app',
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY || '',
});

