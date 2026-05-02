import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kwcjpclgmjwsabvomzbr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ'
);

async function main() {
  const { data: cfg, error } = await supabase
    .from('gateway_config')
    .select('utmify_api_token, utmify_api_token_2')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching config:', error.message);
    return;
  }

  console.log('Utmify Config:');
  console.log('Token 1 present:', !!cfg?.utmify_api_token);
  console.log('Token 2 present:', !!cfg?.utmify_api_token_2);
  
  if (cfg?.utmify_api_token) {
    console.log('Testing Token 1...');
    const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': cfg.utmify_api_token
      },
      body: JSON.stringify({
        orderId: 'test_' + Date.now(),
        platform: 'esn-supplements-germany',
        paymentMethod: 'credit_card',
        status: 'approved',
        customer: { name: 'Test', email: 'test@test.com' },
        products: [{ id: 'test', name: 'Test Product', priceInCents: 100 }],
        commission: { totalPriceInCents: 100, gatewayFeeInCents: 0, userCommissionInCents: 100, currency: 'EUR' }
      })
    });
    console.log('Token 1 Status:', r.status);
    const text = await r.text();
    console.log('Token 1 Response:', text);
  }
}

main();
