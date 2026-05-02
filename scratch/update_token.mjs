import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwcjpclgmjwsabvomzbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ'
);

async function main() {
  const token = 'D6b582xN9Vs1RrybmXFUhXHsqjcSuchKyiwf';
  
  // Update all gateway_config rows with this token
  const { error } = await supabase
    .from('gateway_config')
    .update({ 
      utmify_api_token: token,
      updated_at: new Date().toISOString()
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

  if (error) {
    console.error('Error updating token:', error.message);
    return;
  }

  console.log('Utmify Token updated successfully in database!');
}

main();
