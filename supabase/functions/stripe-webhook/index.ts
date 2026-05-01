// Stripe Webhook - Marca pedidos como pagos quando Stripe confirma o pagamento.
// Quando o status vira 'paid', o hook Realtime no front (useUtmifyAutoNotify)
// dispara automaticamente a notificação de venda aprovada para a Utmify.
//
// IMPORTANTE: Esta função NÃO valida JWT (precisa ser pública para o Stripe).
// A validação é feita via assinatura do webhook (STRIPE_WEBHOOK_SECRET).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@13.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // Carrega chave secreta do Stripe a partir do gateway_config
    const { data: config } = await supabase
      .from('gateway_config')
      .select('stripe_secret_key')
      .limit(1)
      .maybeSingle();

    const stripeSecret = config?.stripe_secret_key;
    if (!stripeSecret) {
      console.error('[stripe-webhook] stripe_secret_key não configurada');
      return new Response(JSON.stringify({ error: 'stripe key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      } catch (err: any) {
        console.error('[stripe-webhook] Assinatura inválida:', err?.message);
        return new Response(JSON.stringify({ error: 'invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Sem secret configurado, parseia sem validar (não recomendado em produção)
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente - pulando validação de assinatura');
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    console.log('[stripe-webhook] event:', event.type);

    const markPaid = async (externalId: string, gatewayResponse: any) => {
      const { data: order, error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          gateway_response: gatewayResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('external_id', externalId)
        .select('id, status')
        .maybeSingle();

      if (error) {
        console.error('[stripe-webhook] Erro update order:', error);
      } else {
        console.log('[stripe-webhook] Order marcada como paid:', order?.id);
      }
    };

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          await markPaid(session.id, session);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Tenta achar pela payment_intent direto, senão pela checkout session vinculada
        const { data: byPi } = await supabase
          .from('orders')
          .select('id, external_id')
          .eq('external_id', pi.id)
          .maybeSingle();

        if (byPi) {
          await markPaid(pi.id, pi);
        } else {
          // Procura sessão de checkout que originou esse payment_intent
          try {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
            const sess = sessions.data[0];
            if (sess) await markPaid(sess.id, { payment_intent: pi, session: sess });
          } catch (e) {
            console.error('[stripe-webhook] erro buscando sessão por PI:', e);
          }
        }
        break;
      }
      default:
        console.log('[stripe-webhook] evento ignorado:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[stripe-webhook] erro:', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
