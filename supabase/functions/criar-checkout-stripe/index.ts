
// Stripe - Cria sessão de Checkout
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@13.10.0';

interface RequestBody {
  secretKey: string;
  amount: number; // em reais/euros
  buyerName: string;
  buyerEmail: string;
  buyerDocument?: string;
  buyerPhone?: string;
  itemsDescription?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body.secretKey) throw new Error('secretKey ausente');
    if (!body.amount || body.amount <= 0) throw new Error('amount inválido');

    const stripe = new Stripe(body.secretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const amountCents = Math.round(body.amount * 100);
    const productName = body.itemsDescription || 'ESN Bundle';
    
    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur', // Or brl depending on config
            product_data: {
              name: productName,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/obrigado?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/checkout`,
      customer_email: body.buyerEmail,
      metadata: {
        buyerName: body.buyerName,
        buyerDocument: body.buyerDocument || '',
        buyerPhone: body.buyerPhone || '',
        ...body.metadata,
      },
    });

    // Persist order in DB as pending
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const meta = body.metadata || {};
    const attribution = meta.attribution || {};
    const trackingParams = meta.trackingParameters || null;

    const { data: orderRow, error: insErr } = await supabase
      .from('orders')
      .insert({
        external_id: session.id,
        gateway: 'stripe',
        gateway_response: session,
        status: 'pending',
        amount_cents: amountCents,
        shipping_method: meta.shippingMethod || null,
        shipping_cost_cents: meta.shippingCostCents ?? null,
        items_description: productName,
        buyer_name: body.buyerName,
        buyer_email: body.buyerEmail,
        buyer_document: (body.buyerDocument || '').replace(/\D/g, ''),
        buyer_phone: body.buyerPhone || null,
        buyer_cep: meta.cep || null,
        buyer_address: meta.address || null,
        buyer_address_number: meta.addressNumber || null,
        buyer_complement: meta.complement || null,
        buyer_neighborhood: meta.neighborhood || null,
        buyer_city: meta.city || null,
        buyer_state: meta.state || null,
        tracking: { ...(trackingParams || {}), ...attribution },
      })
      .select('id')
      .single();

    if (insErr) console.error('DB insert error:', insErr);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url,
        order_id: orderRow?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('criar-checkout-stripe error:', err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
