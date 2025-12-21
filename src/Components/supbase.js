import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://tglslbsruyzkqpxczdzn.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbHNsYnNydXl6a3FweGN6ZHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTY4NDUsImV4cCI6MjA4MTc3Mjg0NX0.js6jcOAQC5d6kKcZX7mUYll_rHgzlxajFXQak3b-yMQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);