import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxdbgnxxlumdfczflytg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4ZGJnbnh4bHVtZGZjemZseXRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNTEwMjQsImV4cCI6MjA5MjcyNzAyNH0.bn0gc4OogLUpvHZ1IYbuPQ_KcPXKG7bEqutPzO3jBgk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);