import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function hashStr(text: string) {
  if (!text) return undefined;
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Pagou Webhook Payload:", JSON.stringify(payload, null, 2));

    const eventData = payload.data;
    if (!eventData || !eventData.id) {
      return new Response(JSON.stringify({ error: "missing_event_id" }), { status: 400 });
    }

    const txId = eventData.id;
    const status = eventData.status || payload.data?.object?.status;
    const isPaid = status === 'paid' || payload.event_type === 'transaction.paid' || payload.type === 'transaction.paid';

    if (isPaid) {
      // 1. Update orders table — busca todos os campos de atribuição também
      const { data: order, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('external_id', txId)
        .select('*')
        .single();

      if (error || !order) {
        console.error("Order not found or update error:", error);
        return new Response(JSON.stringify({ received: true, note: "order_not_found" }), { status: 200, headers: corsHeaders });
      }

      console.log(`Order ${order.id} marked as paid successfully — utm_campaign=${order.utm_campaign} fbp=${order.fbp ? 'present' : 'absent'} fbc=${order.fbc ? 'present' : 'absent'}`);

      // 2. Fetch gateway_config for Utmify tokens
      const { data: config } = await supabase
        .from('gateway_config')
        .select('utmify_api_token, utmify_api_token_2, facebook_pixel_id, facebook_access_token')
        .limit(1)
        .single();

      const tokens = [config?.utmify_api_token, config?.utmify_api_token_2].filter(Boolean);

      // 3. Send to Utmify with REAL UTM data so the campaign is identified
      if (tokens.length > 0) {
        const nowSql = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
        const utmifyPayload = {
          orderId: order.id,
          platform: 'quiz-copa-2026',
          paymentMethod: order.pix_code ? 'pix' : 'credit_card',
          status: 'paid',
          createdAt: new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19),
          approvedDate: nowSql(),
          refundedAt: null,
          customer: {
            name: order.buyer_name || 'Cliente',
            email: order.buyer_email || 'cliente@example.com',
            phone: order.buyer_phone || null,
            document: order.buyer_document || null,
          },
          products: [
            {
              id: 'bola-de-futebol',
              name: order.items_description || 'bola de futebol',
              planId: null,
              planName: null,
              quantity: 1,
              priceInCents: order.amount_cents,
            },
          ],
          trackingParameters: {
            src: order.tracking?.src ?? null,
            sck: order.tracking?.sck ?? null,
            utm_source: order.utm_source ?? null,
            utm_campaign: order.utm_campaign ?? null,
            utm_medium: order.utm_medium ?? null,
            utm_content: order.utm_content ?? null,
            utm_term: order.utm_term ?? null,
          },
          commission: { totalPriceInCents: order.amount_cents, gatewayFeeInCents: 0, userCommissionInCents: order.amount_cents, currency: 'BRL' },
        };

        await supabase.functions.invoke('utmify-notify', {
          body: { tokens, payload: utmifyPayload }
        });
        console.log("Utmify sale notification sent with utm_campaign=", order.utm_campaign);
      }

      // 4. Send to Facebook CAPI with FBP/FBC + UTMs so the Ad Manager links the conversion to the campaign
      const fbPixelId = config?.facebook_pixel_id || '1499521114852387';
      const fbToken = config?.facebook_access_token || 'EAAT9vRp5JWABRRvxII8ygqCvsZCHZALtN1OTtUnKUk2aAIn2sBibamoZAP0GJqFF0YqRoZAAcWkpayACp3RCO83uQVuKTWOaYPAXBzLDST2EHoEDph4WdHGWJeZAzYzRrUVv6NpU0QSSaT3OWYU8V17Uraf7saQ4zhdy1vBmwRtHny7AVOOTOfMhIAqz7XAZDZD';

      if (fbPixelId && fbToken) {
        const userData: Record<string, unknown> = {
          em: order.buyer_email ? [await hashStr(order.buyer_email)] : undefined,
          ph: order.buyer_phone ? [await hashStr(order.buyer_phone.replace(/\D/g, ''))] : undefined,
          client_ip_address: order.client_ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '0.0.0.0',
          client_user_agent: order.client_user_agent || req.headers.get('user-agent') || undefined,
        };
        if (order.fbp) userData.fbp = order.fbp;
        if (order.fbc) userData.fbc = order.fbc;

        const fbEvent = {
          data: [{
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: order.id, // dedup com pixel client
            action_source: 'website',
            event_source_url: order.source_url || undefined,
            user_data: userData,
            custom_data: {
              value: order.amount_cents / 100,
              currency: 'BRL',
              content_name: order.items_description || 'bola de futebol',
              content_ids: [order.id],
              utm_source: order.utm_source || undefined,
              utm_campaign: order.utm_campaign || undefined,
              utm_medium: order.utm_medium || undefined,
              utm_content: order.utm_content || undefined,
              utm_term: order.utm_term || undefined,
            },
          }],
        };

        try {
          const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbEvent),
          });
          const fbResult = await fbRes.json();
          console.log("Facebook CAPI Result:", JSON.stringify(fbResult).slice(0, 400));
        } catch (fbErr) {
          console.error("Facebook CAPI Error:", fbErr);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
