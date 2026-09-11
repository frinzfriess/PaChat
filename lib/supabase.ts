import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sxkisqzzehkpticxrlqx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yTO3b9x00RRBPlJ6JEjwsQ_46giMKan'
);