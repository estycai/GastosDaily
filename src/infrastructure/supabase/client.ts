import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.ts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabasePublishableKey) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  throw new Error(
    '[Supabase] Missing required environment variable(s): ' + missing.join(', ') + '. Please check your .env configuration.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey);
