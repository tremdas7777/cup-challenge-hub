const API_URL = 'https://api.utmify.com.br/api-credentials/orders';
const TOKEN = 'JlR79ZOWlNQQFNIHWpfvu826sih2KpBqZro1';

const nowSql = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

const payload = {
  orderId: `manual_${Date.now()}`,
  platform: 'quiz-copa-2026',
  paymentMethod: 'credit_card',
  status: 'paid',
  createdAt: nowSql(),
  approvedDate: nowSql(),
  refundedAt: null,
  customer: {
    name: 'Cliente Recuperado',
    email: 'recuperado@email.com',
    phone: null,
    document: null,
  },
  products: [
    {
      id: 'bola-de-futebol',
      name: 'nutrition supplements guide eBook',
      planId: null,
      planName: null,
      quantity: 1,
      priceInCents: 1200,
    },
  ],
  trackingParameters: {
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  },
  commission: {
    totalPriceInCents: 1200,
    gatewayFeeInCents: 0,
    userCommissionInCents: 1200,
    currency: 'EUR',
  },
};

async function send() {
  console.log('Sending payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': TOKEN,
      },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      console.log('Success! Sale sent to Utmify.');
    } else {
      console.error('Failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

send();
