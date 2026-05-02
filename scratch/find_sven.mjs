import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwcjpclgmjwsabvomzbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ'
);

async function main() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .ilike('buyer_name', '%Sven Kruger%');

  if (error) {
    console.error('Error fetching orders:', error.message);
    return;
  }

  console.log('Orders for Sven Kruger:');
  console.log(JSON.stringify(data, null, 2));
}

main();
