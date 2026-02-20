import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://uvzgcspijwmxzgvoyxmg.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2emdjc3BpandteHpndm95eG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDUzODksImV4cCI6MjA4NzA4MTM4OX0.Vl-UAnF21GJz8JEC_Ea8pp1KQx59nPc13sLTvXXLjsg";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
