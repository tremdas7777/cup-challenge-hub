
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
  const { data, error } = await supabase
    .from('gateway_config')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current Gateway Config:', {
      active_gateway: data.active_gateway,
      product_ticket_cents: data.product_ticket_cents,
      stripe_public_key: data.stripe_public_key ? 'Present (matches ' + data.stripe_public_key.substring(0, 10) + '...)' : 'MISSING',
      stripe_secret_key: data.stripe_secret_key ? 'Present' : 'MISSING',
      utmify_api_token: data.utmify_api_token ? 'Present' : 'MISSING',
    });
  }
}

checkConfig();
