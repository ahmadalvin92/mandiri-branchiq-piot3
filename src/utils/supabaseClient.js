import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.NEXT_PUBLIC_SUPABASE_URL || 'https://pxcqpginolimyaxxyvao.supabase.co';
const supabaseKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_q8DEalEC14zk2q8uv5WK_g_UParEM4z';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
