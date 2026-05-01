import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwcjpclgmjwsabvomzbr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: existing } = await supabase.from('gateway_config').select('id').single();
  console.log('Existing ID:', existing?.id);
  if (existing?.id) {
    const { data, error } = await supabase
      .from('gateway_config')
      .update({ external_checkout_enabled: false })
      .eq('id', existing.id)
      .select();
    console.log('Update Data:', data);
    console.log('Update Error:', error);
  }
}
test();
