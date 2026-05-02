import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwcjpclgmjwsabvomzbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ'
);

async function main() {
  const { data, error } = await supabase
    .from('gateway_config')
    .select('utmify_api_token, utmify_api_token_2')
    .not('utmify_api_token', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching config:', error.message);
    return;
  }

  if (data) {
    const token = data.utmify_api_token || '';
    console.log('Token starts with:', token.substring(0, 10) + '...');
    console.log('Token length:', token.length);
  } else {
    console.log('No token found in gateway_config');
  }
}

main();
