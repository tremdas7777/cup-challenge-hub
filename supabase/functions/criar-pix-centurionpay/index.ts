// Edge function: criar PIX via CenturionPay
// Recebe dados do checkout, chama a API da CenturionPay, persiste a order no DB
// e retorna { pix_code, pix_qr_code_base64, order_id }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  secretKey: string;
  companyId: string;
  amount: number; // BRL (ex: 44.90)
  buyerName: string;
  buyerEmail: string;
  buyerDocument: string; // CPF (somente dígitos)
  buyerPhone?: string;
  itemsDescription?: string;
  externalRef?: string;
  metadata?: Record<string, unknown>;
}

const CENTURION_BASE = "https://api.centurionpay.com.br/functions/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const {
      secretKey,
      companyId,
      amount,
      buyerName,
      buyerEmail,
      buyerDocument,
      buyerPhone,
      itemsDescription,
      externalRef,
      metadata,
    } = body;

    if (!secretKey || !companyId) {
      return json({ error: "secretKey e companyId obrigatórios" }, 400);
    }
    if (!amount || amount <= 0) {
      return json({ error: "amount inválido" }, 400);
    }
    if (!buyerName || !buyerEmail || !buyerDocument) {
      return json({ error: "Dados do comprador incompletos" }, 400);
    }

    const document = String(buyerDocument).replace(/\D/g, "");
    const phone = (buyerPhone || "").replace(/\D/g, "") || "11999999999";
    const amountCents = Math.round(amount * 100);
    const ref = externalRef || `order-${Date.now()}`;

    const payload = {
      identifier: ref,
      amount: amountCents,
      paymentMethod: "PIX",
      installments: 1,
      customer: {
        name: buyerName,
        email: buyerEmail,
        phone,
        document: {
          number: document,
          type: document.length > 11 ? "CNPJ" : "CPF",
        },
      },
      // Mantém também `client` para compatibilidade com versões antigas da API
      client: {
        name: buyerName,
        email: buyerEmail,
        document,
        phone,
      },
      items: [
        {
          title: itemsDescription || "Produto",
          unitPrice: amountCents,
          quantity: 1,
          tangible: true,
        },
      ],
      products: [
        {
          id: "kit-brasil-2026",
          name: itemsDescription || "Produto",
          quantity: 1,
          price: amountCents,
        },
      ],
      pix: { expiresInDays: 1 },
      metadata: metadata || {},
    };

    const auth = "Basic " + btoa(`${secretKey}:x`);
    console.log("[centurionpay] POST /transactions", { ref, amountCents, companyId, url: `${CENTURION_BASE}/transactions` });

    const resp = await fetch(`${CENTURION_BASE}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        "x-company-id": companyId,
        apikey: secretKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      console.error("CenturionPay error:", resp.status, text);
      return json(
        {
          error: data?.message || data?.error || "Erro CenturionPay",
          status: resp.status,
          details: data,
        },
        500,
      );
    }

    const pixCode =
      data?.pix?.qrcode ||
      data?.pix?.payload ||
      data?.pix?.code ||
      data?.qrcode ||
      data?.transaction?.pix?.qrcode ||
      "";
    const qrCodeBase64 =
      data?.pix?.qrcodeBase64 ||
      data?.pix?.qr_code_base64 ||
      data?.pix?.base64 ||
      data?.qrcodeBase64 ||
      data?.transaction?.pix?.base64 ||
      "";
    const externalId =
      data?.id ||
      data?.transactionId ||
      data?.transaction?.id ||
      data?.identifier ||
      ref;

    // Persist order in DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: orderRow, error: dbError } = await supabase
      .from("orders")
      .insert({
        external_id: externalId,
        gateway: "centurionpay",
        gateway_response: data,
        status: "pending",
        amount_cents: amountCents,
        shipping_method: "pac",
        shipping_cost_cents: amountCents,
        items_description: itemsDescription || "Produto",
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_document: document,
        buyer_phone: phone,
        pix_code: pixCode,
        pix_qr_code_base64: qrCodeBase64,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
    }

    return json({
      success: true,
      order_id: orderRow?.id || null,
      external_id: externalId,
      pix_code: pixCode,
      pix_qr_code_base64: qrCodeBase64,
      raw: data,
    });
  } catch (err) {
    console.error("criar-pix-centurionpay error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
