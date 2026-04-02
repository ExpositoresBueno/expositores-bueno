import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://oojtdudhkulervhxzthe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vanRkdWRoa3VsZXJ2aHh6dGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMzU4OTcsImV4cCI6MjA5MDcxMTg5N30.KGnGDvY2wrWYXn4bCymG9Col1V44ciWw55e1T-ichYE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
