import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('gateway_config')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching gateway_config:', error);
  } else {
    console.log('Columns found:', Object.keys(data[0] || {}));
  }
}

checkSchema();
