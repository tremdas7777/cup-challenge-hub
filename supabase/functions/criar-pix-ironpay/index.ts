// Edge function: criar PIX via IronPay
// Recebe dados do checkout, chama a API da IronPay e retorna pix_code + qr_code_base64
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

interface RequestBody {
  apiToken: string;
  amount: number; // BRL (ex: 44.90)
  buyerName: string;
  buyerEmail: string;
  buyerDocument: string; // CPF (somente dígitos)
  buyerPhone?: string;
  itemsDescription?: string;
  externalRef?: string;
}

const IRONPAY_BASE = "https://api.ironpayapp.com.br/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const {
      apiToken,
      amount,
      buyerName,
      buyerEmail,
      buyerDocument,
      buyerPhone,
      itemsDescription,
      externalRef,
    } = body;

    if (!apiToken) {
      return json({ error: "apiToken obrigatório" }, 400);
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

    const payload = {
      paymentMethod: "pix",
      amount: amountCents,
      installments: 1,
      customer: {
        name: buyerName,
        email: buyerEmail,
        document: { type: document.length > 11 ? "cnpj" : "cpf", number: document },
        phone,
      },
      items: [
        {
          title: itemsDescription || "Produto",
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
        },
      ],
      externalRef: externalRef || `order-${Date.now()}`,
      pix: { expiresInDays: 1 },
    };

    const auth = "Basic " + btoa(`${apiToken}:x`);
    const resp = await fetch(`${IRONPAY_BASE}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
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
      console.error("IronPay error:", resp.status, text);
      return json(
        { error: data?.message || data?.error || "Erro IronPay", status: resp.status, details: data },
        500,
      );
    }

    const pixCode = data?.pix?.qrcode || data?.pix?.payload || data?.qrcode || "";
    const qrCodeBase64 = data?.pix?.qrcodeBase64 || data?.pix?.qr_code_base64 || data?.qrcodeBase64 || "";
    const externalId = data?.id || data?.transactionId || data?.transaction?.id || "";

    return json({
      success: true,
      externalId,
      pixCode,
      qrCodeBase64,
      raw: data,
    });
  } catch (err) {
    console.error("criar-pix-ironpay error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
