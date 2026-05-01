import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwcjpclgmjwsabvomzbr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Deleting duplicate row...');
  const { data, error } = await supabase
    .from('gateway_config')
    .delete()
    .eq('id', '62070456-8116-4b45-b332-21cfb88b33ee')
    .select();
  
  console.log('Deleted Data:', JSON.stringify(data, null, 2));
  console.log('Delete Error:', error);
}
test();
