// Stripe - Cria PaymentIntent para checkout próprio (Stripe Elements)
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
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerDocument?: string;
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
    if (!body.buyerEmail) throw new Error('buyerEmail ausente');

    const stripe = new Stripe(body.secretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const amountCents = Math.round(body.amount * 100);
    const productName = body.itemsDescription || 'ESN Bundle';

    const safeMetadata: Record<string, string> = {};
    if (body.metadata) {
      Object.entries(body.metadata).forEach(([key, value]) => {
        safeMetadata[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      });
    }

    // Cria PaymentIntent com automatic_payment_methods para habilitar
    // todos os métodos do Stripe (cartão, Apple Pay, Google Pay, Klarna, SEPA etc.)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: body.buyerEmail,
      description: productName,
      metadata: {
        buyerName: body.buyerName,
        buyerEmail: body.buyerEmail,
        buyerPhone: body.buyerPhone || '',
        buyerDocument: body.buyerDocument || '',
        ...safeMetadata,
      },
    });

    // Persist order in DB as pending
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const meta = body.metadata || {};
    const attribution = (() => { try { return typeof meta.attribution === 'string' ? JSON.parse(meta.attribution) : (meta.attribution || {}); } catch { return {}; } })();
    const trackingParams = (() => { try { return typeof meta.trackingParameters === 'string' ? JSON.parse(meta.trackingParameters) : meta.trackingParameters; } catch { return null; } })();

    const { data: orderRow, error: insErr } = await supabase
      .from('orders')
      .insert({
        external_id: paymentIntent.id,
        gateway: 'stripe',
        gateway_response: paymentIntent,
        status: 'pending',
        amount_cents: amountCents,
        shipping_method: meta.shippingMethod || null,
        shipping_cost_cents: meta.shippingCostCents ? Number(meta.shippingCostCents) : null,
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
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        order_id: orderRow?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('criar-payment-intent error:', err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
