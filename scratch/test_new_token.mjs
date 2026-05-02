const token = 'D6b582xN9Vs1RrybmXFUhXHsqjcSuchKyiwf';
const platform = 'ESN Global';

async function test() {
  console.log(`Testing token: ${token} for platform: ${platform}`);
  const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-token': token
    },
    body: JSON.stringify({
      orderId: 'test_sven_' + Date.now(),
      platform: platform,
      paymentMethod: 'credit_card',
      status: 'approved',
      customer: { name: 'Sven Kruger Test', email: 'svenk262323@gmail.com' },
      products: [{ id: 'test', name: 'ESN Guide', priceInCents: 1200, quantity: 1 }],
      commission: { totalPriceInCents: 1200, gatewayFeeInCents: 0, userCommissionInCents: 1200, currency: 'EUR' }
    })
  });
  
  console.log('Status:', r.status);
  const text = await r.text();
  console.log('Response:', text);
}

test();
