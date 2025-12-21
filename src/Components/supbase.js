import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tglslbsruyzkqpxczdzn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbHNsYnNydXl6a3FweGN6ZHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTY4NDUsImV4cCI6MjA4MTc3Mjg0NX0.js6jcOAQC5d6kKcZX7mUYll_rHgzlxajFXQak3b-yMQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);