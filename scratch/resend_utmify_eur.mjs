import { createClient } from '@supabase/supabase-js';

const API_URL = 'https://api.utmify.com.br/api-credentials/orders';
const TOKEN = 'JlR79ZOWlNQQFNIHWpfvu826sih2KpBqZro1';

const supabase = createClient(
  "https://kwcjpclgmjwsabvomzbr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3Y2pwY2xnbWp3c2Fidm9temJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjcwNjEsImV4cCI6MjA5Mjc0MzA2MX0.bCCqjV2NSdH-TYQwPtkMAwf_SW8HHOZs1un9zVqL0rQ"
);

const nowSql = (dateStr) => new Date(dateStr).toISOString().replace('T', ' ').substring(0, 19);

async function resend() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'paid');
    
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log(`Found ${orders.length} paid orders to resend.`);

  for (const order of orders) {
    const isUpsell = order.items_description?.includes('VIP') || order.amount_cents === 600;
    const priceCents = isUpsell ? 600 : 1200;
    const productName = isUpsell ? 'Upsell VIP 6 Euros' : 'nutrition supplements guide eBook';
    
    const payload = {
      orderId: `recovery_${order.id}`,
      platform: 'quiz-copa-2026',
      paymentMethod: 'credit_card',
      status: 'paid',
      createdAt: nowSql(order.created_at),
      approvedDate: nowSql(order.created_at),
      refundedAt: null,
      customer: {
        name: order.buyer_name || 'Cliente',
        email: order.buyer_email || 'sem-email@cliente.com',
        phone: order.buyer_phone || null,
        document: order.buyer_document || null,
      },
      products: [
        {
          id: isUpsell ? 'upsell-vip' : 'esn-product',
          name: productName,
          planId: null,
          planName: null,
          quantity: 1,
          priceInCents: priceCents,
        },
      ],
      trackingParameters: {
        src: null, sck: null, utm_source: null, utm_campaign: null,
        utm_medium: null, utm_content: null, utm_term: null,
      },
      commission: {
        totalPriceInCents: priceCents,
        gatewayFeeInCents: 0,
        userCommissionInCents: priceCents,
        currency: 'EUR',
      },
    };

    console.log(`Sending order ${order.id} with ${priceCents} cents...`);
    
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
        console.log(`Success! Sent ${order.id}.`);
      } else {
        console.error(`Failed ${order.id}:`, response.status, await response.text());
      }
    } catch (err) {
      console.error(`Error ${order.id}:`, err);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
}

resend();
