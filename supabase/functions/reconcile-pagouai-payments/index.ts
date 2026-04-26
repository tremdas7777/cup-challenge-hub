import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, serviceKey);

type OrderRow = {
  id: string;
  external_id: string | null;
  status: string;
  gateway: string;
  amount_cents: number;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  items_description: string | null;
  created_at: string;
  pix_code?: string | null;
  tracking?: Record<string, unknown> | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  client_user_agent?: string | null;
  client_ip?: string | null;
  source_url?: string | null;
};

type ReconcileBody = {
  orderId?: string;
  limit?: number;
};

function normalizeStatus(status?: string | null) {
  const value = (status || '').toLowerCase();
  if (['paid', 'captured'].includes(value)) return 'paid';
  if (['refused'].includes(value)) return 'cancelled';
  if (['canceled', 'cancelled', 'expired'].includes(value)) return value === 'expired' ? 'expired' : 'cancelled';
  return 'pending';
}

async function hashStr(text: string) {
  if (!text) return undefined;
  const msgUint8 = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function notifyUtmifyAndFacebook(order: OrderRow, normalizedStatus: string, providerStatus: string, req: Request) {
  if (normalizedStatus !== 'paid') return;

  const { data: config } = await supabase
    .from('gateway_config')
    .select('utmify_api_token, utmify_api_token_2, facebook_pixel_id, facebook_access_token')
    .limit(1)
    .single();

  const tokens = [config?.utmify_api_token, config?.utmify_api_token_2].filter(Boolean);
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
      products: [{
        id: 'bola-de-futebol',
        name: order.items_description || 'bola de futebol',
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: order.amount_cents,
      }],
      trackingParameters: {
        src: (order.tracking as any)?.src ?? null,
        sck: (order.tracking as any)?.sck ?? null,
        utm_source: order.utm_source ?? null,
        utm_campaign: order.utm_campaign ?? null,
        utm_medium: order.utm_medium ?? null,
        utm_content: order.utm_content ?? null,
        utm_term: order.utm_term ?? null,
      },
      commission: { totalPriceInCents: order.amount_cents, gatewayFeeInCents: 0, userCommissionInCents: order.amount_cents, currency: 'BRL' },
      providerStatus,
    };

    await supabase.functions.invoke('utmify-notify', {
      body: { tokens, payload: utmifyPayload },
    });
  }

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

    const eventData = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
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
      await fetch(`https://graph.facebook.com/v19.0/${fbPixelId}/events?access_token=${fbToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
    } catch (error) {
      console.error('Facebook sync error:', error);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ReconcileBody;
    const limit = Math.min(Math.max(body.limit || 20, 1), 100);

    const { data: config, error: configError } = await supabase
      .from('gateway_config')
      .select('pagouai_secret_key')
      .limit(1)
      .single();

    if (configError || !config?.pagouai_secret_key) {
      return new Response(JSON.stringify({ ok: false, error: 'pagouai_not_configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase
      .from('orders')
      .select('id, external_id, status, gateway, amount_cents, buyer_name, buyer_email, buyer_phone, buyer_document, items_description, created_at, pix_code, tracking, utm_source, utm_campaign, utm_medium, utm_content, utm_term, fbp, fbc, client_user_agent, client_ip, source_url')
      .eq('gateway', 'pagouai')
      .not('external_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (body.orderId) {
      query = query.eq('id', body.orderId);
    } else {
      query = query.in('status', ['pending', 'paid']);
    }

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    const results: Array<Record<string, unknown>> = [];

    for (const order of (orders || []) as OrderRow[]) {
      try {
        const response = await fetch(`https://api.pagou.ai/v2/transactions/${order.external_id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.pagouai_secret_key}`,
            'Content-Type': 'application/json',
          },
        });

        const payload = await response.json().catch(() => null);
        const tx = payload?.data || payload;
        const providerStatus = tx?.status || payload?.status || null;

        if (!response.ok || !providerStatus) {
          results.push({ orderId: order.id, externalId: order.external_id, ok: false, error: payload?.detail || payload?.message || `http_${response.status}` });
          continue;
        }

        const normalizedStatus = normalizeStatus(providerStatus);
        const currentStatus = order.status || 'pending';
        let changed = false;

        if (normalizedStatus !== currentStatus) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: normalizedStatus,
              gateway_response: payload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            results.push({ orderId: order.id, externalId: order.external_id, ok: false, error: updateError.message, providerStatus });
            continue;
          }

          changed = true;
          await notifyUtmifyAndFacebook(order, normalizedStatus, providerStatus, req);
        } else if (normalizedStatus === 'paid' && currentStatus === 'paid') {
          await supabase
            .from('orders')
            .update({ gateway_response: payload, updated_at: new Date().toISOString() })
            .eq('id', order.id);
        }

        results.push({
          orderId: order.id,
          externalId: order.external_id,
          ok: true,
          providerStatus,
          normalizedStatus,
          changed,
        });
      } catch (error) {
        results.push({ orderId: order.id, externalId: order.external_id, ok: false, error: String(error) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('reconcile-pagouai-payments error:', error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});