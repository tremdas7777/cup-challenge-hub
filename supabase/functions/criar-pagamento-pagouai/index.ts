// Pagou.ai - Cria pagamento PIX ou Cartão de Crédito (v2)
// Docs: https://developer.pagou.ai/pt
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface RequestBody {
  secretKey: string;
  method: 'pix' | 'credit_card';
  amount: number; // em reais
  buyerName: string;
  buyerEmail: string;
  buyerDocument: string;
  buyerPhone?: string;
  ipAddress?: string;
  itemsDescription?: string;
  // apenas cartão:
  cardToken?: string;
  installments?: number;
  // metadata extra
  metadata?: Record<string, any>;
}

const PAGOUAI_BASE = 'https://api.pagou.ai';

function sanitizeIp(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutPort = trimmed.replace(/^\[|\]$/g, '').replace(/:\d+$/, '');
  return /^[0-9a-fA-F:.]+$/.test(withoutPort) ? withoutPort : null;
}

function getClientIp(req: Request, body: RequestBody): string | null {
  const explicitIp = sanitizeIp(
    body.ipAddress ||
    body.metadata?.ipAddress ||
    body.metadata?.clientIp ||
    body.metadata?.ip_address ||
    null,
  );
  if (explicitIp) return explicitIp;

  const forwardedFor = req.headers.get('x-forwarded-for') || req.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0];
    const parsed = sanitizeIp(firstIp);
    if (parsed) return parsed;
  }

  return sanitizeIp(
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('fly-client-ip') ||
    null,
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;

    if (!body.secretKey) throw new Error('secretKey ausente');
    if (!body.method || (body.method !== 'pix' && body.method !== 'credit_card')) {
      throw new Error('method inválido (use "pix" ou "credit_card")');
    }
    if (!body.amount || body.amount <= 0) throw new Error('amount inválido');
    if (body.method === 'credit_card' && !body.cardToken) {
      throw new Error('cardToken obrigatório para cartão de crédito');
    }

    const amountCents = Math.round(body.amount * 100);
    const docDigits = (body.buyerDocument || '').replace(/\D/g, '');
    const phoneDigits = (body.buyerPhone || '').replace(/\D/g, '');
    const externalRef = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const productName = body.itemsDescription || 'bola de futebol';
    const clientIp = getClientIp(req, body);

    if (body.method === 'credit_card' && !clientIp) {
      throw new Error('IP address is required for credit card payments and could not be determined');
    }

    const payload: Record<string, any> = {
      external_ref: externalRef,
      amount: amountCents,
      currency: 'BRL',
      method: body.method,
      buyer: {
        name: body.buyerName || 'Cliente',
        email: body.buyerEmail || 'cliente@example.com',
        document: {
          type: docDigits.length === 14 ? 'CNPJ' : 'CPF',
          number: docDigits,
        },
        ...(phoneDigits ? { phone: phoneDigits } : {}),
        address: {
          street: body.metadata?.address || 'Rua Principal',
          city: body.metadata?.city || 'São Paulo',
          number: body.metadata?.addressNumber || 'S/N',
          complement: body.metadata?.complement || '',
          neighborhood: body.metadata?.neighborhood || 'Centro',
          state: body.metadata?.state || 'SP',
          zipCode: body.metadata?.cep || '01001000',
          country: 'BR',
        },
      },
      products: [
        { name: productName, price: amountCents, quantity: 1 },
      ],
    };

    if (body.method === 'credit_card') {
      payload.token = body.cardToken;
      payload.installments = body.installments && body.installments > 0 ? body.installments : 1;
      payload.ip_address = clientIp;
    }

    const pgRes = await fetch(`${PAGOUAI_BASE}/v2/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${body.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const pgJson = await pgRes.json().catch(() => ({}));
    console.log('Pagou.ai response status:', pgRes.status, JSON.stringify(pgJson).slice(0, 800));

    if (!pgRes.ok || pgJson?.success === false) {
      const validationErrors = Array.isArray(pgJson?.validation_errors)
        ? pgJson.validation_errors
            .map((item: Record<string, unknown>) => {
              const field = typeof item.field === 'string' ? item.field : 'campo';
              const message = typeof item.message === 'string' ? item.message : JSON.stringify(item);
              return `${field}: ${message}`;
            })
            .join('; ')
        : '';
      const detail = validationErrors || [pgJson?.title, pgJson?.detail].filter(Boolean).join(' - ') || JSON.stringify(pgJson?.errors || pgJson);
      throw new Error(`Pagou.ai HTTP ${pgRes.status}: ${detail}`);
    }

    const tx = pgJson?.data || pgJson;
    const txId = tx?.id || tx?.transaction_id || null;
    const status = tx?.status || 'pending';
    const pixCode = tx?.pix?.qr_code || tx?.pix?.payload || '';
    const pixQrBase64 = tx?.pix?.qr_code_base64 || '';
    const nextAction = tx?.next_action || null;
    console.log('Pagou.ai normalized transaction:', JSON.stringify({ id: txId, status, method: tx?.method, has_next_action: !!nextAction }).slice(0, 400));

    // Persist order in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const meta = body.metadata || {};
    const attribution = meta.attribution || {};
    const trackingParams = meta.trackingParameters || null;
    const trackingPayload = {
      ...(trackingParams || {}),
      ...attribution,
    };

    const { data: orderRow, error: insErr } = await supabase
      .from('orders')
      .insert({
        external_id: txId,
        gateway: 'pagouai',
        gateway_response: pgJson,
        status: status === 'paid' ? 'paid' : 'pending',
        amount_cents: amountCents,
        shipping_method: meta.shippingMethod || null,
        shipping_cost_cents: meta.shippingCostCents ?? null,
        items_description: productName,
        buyer_name: body.buyerName,
        buyer_email: body.buyerEmail,
        buyer_document: docDigits,
        buyer_phone: phoneDigits || null,
        buyer_cep: meta.cep || null,
        buyer_address: meta.address || null,
        buyer_address_number: meta.addressNumber || null,
        buyer_complement: meta.complement || null,
        buyer_neighborhood: meta.neighborhood || null,
        buyer_city: meta.city || null,
        buyer_state: meta.state || null,
        pix_code: pixCode || null,
        pix_qr_code_base64: pixQrBase64 || null,
        // ===== Atribuição de marketing =====
        tracking: trackingPayload,
        utm_source: attribution.utm_source || trackingParams?.utm_source || null,
        utm_campaign: attribution.utm_campaign || trackingParams?.utm_campaign || null,
        utm_medium: attribution.utm_medium || trackingParams?.utm_medium || null,
        utm_content: attribution.utm_content || trackingParams?.utm_content || null,
        utm_term: attribution.utm_term || trackingParams?.utm_term || null,
        fbp: attribution.fbp || null,
        fbc: attribution.fbc || null,
        fbclid: attribution.fbclid || null,
        client_user_agent: attribution.client_user_agent || null,
        client_ip: clientIp || null,
        source_url: attribution.source_url || null,
      })
      .select('id')
      .single();

    if (insErr) console.error('DB insert error:', insErr);

    // === Utmify notification (server-side, guarantees delivery) ===
    try {
      const { data: gwCfg } = await supabase
        .from('gateway_config')
        .select('utmify_api_token, utmify_api_token_2')
        .limit(1)
        .single();
      const tokens = [gwCfg?.utmify_api_token, gwCfg?.utmify_api_token_2]
        .filter((t: any) => typeof t === 'string' && t.trim()) as string[];
      if (tokens.length > 0) {
        const nowSql = () => new Date().toISOString().replace('T', ' ').substring(0, 19);
        const utmifyStatus = status === 'paid' ? 'paid' : 'waiting_payment';
        const utmifyPayload = {
          orderId: orderRow?.id || txId || externalRef,
          platform: 'quiz-copa-2026',
          paymentMethod: body.method === 'credit_card' ? 'credit_card' : 'pix',
          status: utmifyStatus,
          createdAt: nowSql(),
          approvedDate: utmifyStatus === 'paid' ? nowSql() : null,
          refundedAt: null,
          customer: {
            name: body.buyerName || 'Cliente',
            email: body.buyerEmail || 'cliente@example.com',
            phone: phoneDigits || null,
            document: docDigits || null,
          },
          products: [{
            id: 'copa-2026-kit',
            name: productName,
            planId: null,
            planName: null,
            quantity: 1,
            priceInCents: amountCents,
          }],
          trackingParameters: meta.trackingParameters || {
            src: null, sck: null,
            utm_source: null, utm_campaign: null, utm_medium: null,
            utm_content: null, utm_term: null,
          },
          commission: {
            totalPriceInCents: amountCents,
            gatewayFeeInCents: 0,
            userCommissionInCents: amountCents,
            currency: 'BRL',
          },
        };
        const results = await Promise.all(tokens.map(async (token) => {
          try {
            const r = await fetch('https://api.utmify.com.br/api-credentials/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-token': token },
              body: JSON.stringify(utmifyPayload),
            });
            const txt = await r.text().catch(() => '');
            console.log(`[Utmify] token=${token.slice(0,6)}… status=${r.status} body=${txt.slice(0,200)}`);
            return r.ok;
          } catch (e) {
            console.error('[Utmify] fetch error:', e);
            return false;
          }
        }));
        console.log(`[Utmify] notified=${results.filter(Boolean).length}/${tokens.length}`);
      } else {
        console.warn('[Utmify] No tokens configured in gateway_config — skipping notification');
      }
    } catch (utmErr) {
      console.error('[Utmify] notification block error:', utmErr);
    }

    return new Response(
      JSON.stringify({
        ...tx,
        success: true,
        order_id: orderRow?.id,
        id: txId,
        transaction_id: txId,
        status,
        method: tx?.method || body.method,
        pix_code: pixCode,
        pix_qr_code_base64: pixQrBase64,
        next_action: nextAction,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('criar-pagamento-pagouai error:', err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
