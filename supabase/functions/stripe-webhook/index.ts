// Stripe Webhook - Marca pedidos como pagos quando Stripe confirma o pagamento.
// Suporta tanto checkout interno (criar-checkout-stripe) quanto Payment Links externos
// (buy.stripe.com). No caso de Payment Link, cria a order automaticamente.
// Dispara Facebook CAPI (Purchase) e Utmify (via trigger notify_utmify_on_paid).
//
// IMPORTANTE: Função pública (sem JWT). Validação via STRIPE_WEBHOOK_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import Stripe from 'https://esm.sh/stripe@13.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function hashStr(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: config } = await supabase
      .from('gateway_config')
      .select('stripe_secret_key, facebook_pixel_id, facebook_access_token')
      .order('updated_at', { ascending: false, nullsFirst: false })
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
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente - pulando validação de assinatura');
      event = JSON.parse(rawBody) as Stripe.Event;
    }

    console.log('[stripe-webhook] event:', event.type);

    // Marca order existente como paga (ou cria nova se vier de Payment Link externo)
    const upsertPaidOrder = async (
      externalId: string,
      session: Stripe.Checkout.Session | null,
      gatewayResponse: any,
      amountCents: number,
      currency: string,
    ) => {
      // Tenta achar order existente
      const { data: existing } = await supabase
        .from('orders')
        .select('id, status, buyer_email, buyer_name, buyer_phone, amount_cents, items_description, source_url, fbp, fbc, client_ip, client_user_agent, utm_source, utm_campaign, utm_medium, utm_content, utm_term')
        .eq('external_id', externalId)
        .maybeSingle();

      let orderRow = existing;

      if (!orderRow) {
        // Payment Link externo → cria order
        const customerEmail =
          session?.customer_details?.email || session?.customer_email || null;
        const customerName = session?.customer_details?.name || null;
        const customerPhone = session?.customer_details?.phone || null;

        const { data: inserted, error: insErr } = await supabase
          .from('orders')
          .insert({
            external_id: externalId,
            gateway: 'stripe',
            gateway_response: gatewayResponse,
            status: 'paid',
            amount_cents: amountCents,
            items_description: 'ESN Bundle (Payment Link)',
            buyer_name: customerName,
            buyer_email: customerEmail,
            buyer_phone: customerPhone,
          })
          .select('id, buyer_email, buyer_name, buyer_phone, amount_cents, items_description, source_url, fbp, fbc, client_ip, client_user_agent, utm_source, utm_campaign, utm_medium, utm_content, utm_term')
          .single();

        if (insErr) {
          console.error('[stripe-webhook] erro inserindo order:', insErr);
          return null;
        }
        orderRow = inserted as any;
        console.log('[stripe-webhook] order criada (payment link):', orderRow?.id);
      } else if (orderRow.status !== 'paid') {
        const { error: updErr } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            gateway_response: gatewayResponse,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (orderRow as any).id);
        if (updErr) console.error('[stripe-webhook] erro update order:', updErr);
        else console.log('[stripe-webhook] order marcada paid:', (orderRow as any).id);
      } else {
        console.log('[stripe-webhook] order já estava paga:', (orderRow as any).id);
        return orderRow;
      }

      // Dispara Facebook CAPI (Purchase)
      const fbPixelId = config?.facebook_pixel_id;
      const fbToken = config?.facebook_access_token;

      if (fbPixelId && fbToken && orderRow) {
        try {
          const o: any = orderRow;
          const userData: Record<string, unknown> = {
            client_ip_address: o.client_ip || req.headers.get('x-forwarded-for') || '0.0.0.0',
            client_user_agent: o.client_user_agent || req.headers.get('user-agent') || undefined,
          };
          if (o.buyer_email) userData.em = [await hashStr(o.buyer_email)];
          if (o.buyer_phone) userData.ph = [await hashStr(String(o.buyer_phone).replace(/\D/g, ''))];
          if (o.fbp) userData.fbp = o.fbp;
          if (o.fbc) userData.fbc = o.fbc;

          const fbEvent = {
            data: [{
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              event_id: o.id,
              action_source: 'website',
              event_source_url: o.source_url || undefined,
              user_data: userData,
              custom_data: {
                value: (o.amount_cents || amountCents) / 100,
                currency: (currency || 'EUR').toUpperCase(),
                content_name: o.items_description || 'ESN Bundle',
                content_ids: [o.id],
                utm_source: o.utm_source || undefined,
                utm_campaign: o.utm_campaign || undefined,
                utm_medium: o.utm_medium || undefined,
                utm_content: o.utm_content || undefined,
                utm_term: o.utm_term || undefined,
              },
            }],
          };

          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbEvent),
          });
          const fbJson = await fbRes.json();
          console.log('[stripe-webhook] Facebook CAPI:', JSON.stringify(fbJson).slice(0, 400));
        } catch (fbErr) {
          console.error('[stripe-webhook] CAPI error:', fbErr);
        }
      } else {
        console.log('[stripe-webhook] Facebook CAPI pulado (pixel/token não configurados)');
      }

      return orderRow;
    };

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === 'paid') {
          await upsertPaidOrder(
            session.id,
            session,
            session,
            session.amount_total || 0,
            session.currency || 'eur',
          );
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Se já existe order pelo PI direto, marca paga
        const { data: byPi } = await supabase
          .from('orders')
          .select('id')
          .eq('external_id', pi.id)
          .maybeSingle();

        if (byPi) {
          await upsertPaidOrder(pi.id, null, pi, pi.amount || 0, pi.currency || 'eur');
        } else {
          // Procura sessão de checkout que originou esse PI
          try {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
            const sess = sessions.data[0];
            if (sess) {
              await upsertPaidOrder(
                sess.id,
                sess,
                { payment_intent: pi, session: sess },
                sess.amount_total || pi.amount || 0,
                sess.currency || pi.currency || 'eur',
              );
            } else {
              // PI sem sessão (ex: criado direto). Cria order pelo PI.
              await upsertPaidOrder(pi.id, null, pi, pi.amount || 0, pi.currency || 'eur');
            }
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
