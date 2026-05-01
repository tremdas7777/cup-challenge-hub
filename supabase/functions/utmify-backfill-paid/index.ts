// Envia para Utmify TODAS as vendas com status 'paid' que ainda não foram notificadas.
// Marca cada order em `tracking.utmify_paid_sent_at` para evitar duplicidade.
// Pode ser invocada manualmente (backfill) ou por trigger ao marcar como paid.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UTMIFY_URL = "https://api.utmify.com.br/api-credentials/orders";

const nowSql = () => new Date().toISOString().replace("T", " ").substring(0, 19);
const toSql = (iso: string) =>
  new Date(iso).toISOString().replace("T", " ").substring(0, 19);

interface OrderRow {
  id: string;
  status: string;
  amount_cents: number | null;
  shipping_cost_cents: number | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  items_description: string | null;
  created_at: string;
  updated_at: string;
  tracking: Record<string, any> | null;
}

function buildPaidPayload(o: OrderRow) {
  const t = (o.tracking || {}) as Record<string, any>;
  const total =
    (o.amount_cents || 0) + (o.shipping_cost_cents || 0) ||
    o.amount_cents ||
    0;
  return {
    orderId: o.id,
    platform: "quiz-copa-2026",
    paymentMethod: "pix",
    status: "paid",
    createdAt: toSql(o.created_at),
    approvedDate: toSql(o.updated_at || new Date().toISOString()),
    refundedAt: null,
    customer: {
      name: o.buyer_name || "Cliente",
      email: o.buyer_email || "sem-email@cliente.com",
      phone: o.buyer_phone ?? null,
      document: o.buyer_document ?? null,
    },
    products: [
      {
        id: "bola-de-futebol",
        name: o.items_description || "nutrition supplements guide eBook",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: o.amount_cents || 0,
      },
    ],
    trackingParameters: {
      src: t.src ?? null,
      sck: t.sck ?? null,
      utm_source: t.utm_source ?? null,
      utm_campaign: t.utm_campaign ?? null,
      utm_medium: t.utm_medium ?? null,
      utm_content: t.utm_content ?? null,
      utm_term: t.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: total,
      gatewayFeeInCents: 0,
      userCommissionInCents: total,
      currency: "BRL",
    },
  };
}

async function sendToUtmify(token: string, payload: Record<string, unknown>) {
  const r = await fetch(UTMIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": token,
    },
    body: JSON.stringify(payload),
  });
  const text = await r.text().catch(() => "");
  return { ok: r.ok, status: r.status, body: text.slice(0, 400) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Tokens
    const { data: cfg } = await supabase
      .from("gateway_config")
      .select("utmify_api_token, utmify_api_token_2")
      .limit(1)
      .maybeSingle();

    const tokens = [cfg?.utmify_api_token, cfg?.utmify_api_token_2].filter(
      (t): t is string => !!t && typeof t === "string" && t.trim().length > 0,
    );
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Nenhum token Utmify configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Body opcional: { orderId?: string, force?: boolean }
    let bodyJson: any = {};
    try {
      bodyJson = await req.json();
    } catch {}
    const orderId: string | undefined = bodyJson?.orderId;
    const force: boolean = !!bodyJson?.force;

    // Busca pedidos pagos ainda não enviados
    let query = supabase
      .from("orders")
      .select(
        "id,status,amount_cents,shipping_cost_cents,buyer_name,buyer_email,buyer_phone,buyer_document,items_description,created_at,updated_at,tracking",
      )
      .eq("status", "paid")
      .order("created_at", { ascending: true });

    if (orderId) query = query.eq("id", orderId);

    const { data: orders, error } = await query;
    if (error) throw error;

    const results: any[] = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const o of (orders || []) as OrderRow[]) {
      const alreadySent = !!(o.tracking as any)?.utmify_paid_sent_at;
      if (alreadySent && !force) {
        skipped++;
        continue;
      }

      const payload = buildPaidPayload(o);
      const tokenResults = [];
      let anyOk = false;
      for (const tk of tokens) {
        const r = await sendToUtmify(tk, payload);
        tokenResults.push({ token: tk.slice(0, 6) + "…", ...r });
        if (r.ok) anyOk = true;
      }

      if (anyOk) {
        sent++;
        // Marca como enviado
        const newTracking = {
          ...(o.tracking || {}),
          utmify_paid_sent_at: new Date().toISOString(),
        };
        await supabase
          .from("orders")
          .update({ tracking: newTracking })
          .eq("id", o.id);
      } else {
        failed++;
      }

      results.push({ orderId: o.id, ok: anyOk, tokens: tokenResults });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: orders?.length || 0,
        sent,
        skipped,
        failed,
        results,
        ranAt: nowSql(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[utmify-backfill-paid] error:", e?.message || e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
