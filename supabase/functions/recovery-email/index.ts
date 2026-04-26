import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const RESEND_API_KEY = "re_ib5fJwx5_CYZEvQxCnxdWQ2ngw2NXmWhX";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    // 1. Get orders that are pending, created more than 30 mins ago, and haven't been recovered
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();

    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('recovery_sent', false)
      .not('pix_code', 'is', null)
      .gt('created_at', twoHoursAgo)
      .lt('created_at', thirtyMinsAgo);

    if (fetchError) throw fetchError;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "No orders to recover" }), { status: 200 });
    }

    console.log(`Found ${orders.length} orders for recovery`);

    const results = [];
    for (const order of orders) {
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #000; padding: 20px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">CENTAURO</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Olá, ${order.buyer_name?.split(' ')[0] || 'Campeão'}! ⚽</h2>
            <p style="color: #666; line-height: 1.6;">Vimos que você gerou um PIX para o seu pedido, mas o pagamento ainda não foi confirmado.</p>
            <p style="color: #666; line-height: 1.6;">Garanta agora seus itens com <strong>prioridade de envio</strong> utilizando o código PIX Copia e Cola abaixo:</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px dashed #ccc; margin: 20px 0; word-break: break-all;">
              <code style="font-family: monospace; color: #d00; font-size: 12px;">${order.pix_code}</code>
            </div>

            <p style="color: #666; font-size: 14px;">Basta copiar o código acima e colar no aplicativo do seu banco na opção <strong>PIX Copia e Cola</strong>.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #999; font-size: 12px;">Se você já realizou o pagamento, desconsidere este e-mail.</p>
            </div>
          </div>
        </div>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Centauro <onboarding@resend.dev>",
          to: [order.buyer_email],
          subject: "Seu pedido está aguardando o pagamento! ⚽",
          html: emailHtml,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        await supabase
          .from('orders')
          .update({ recovery_sent: true, recovery_last_sent_at: new Date().toISOString() })
          .eq('id', order.id);
        results.push({ orderId: order.id, status: "sent" });
      } else {
        results.push({ orderId: order.id, status: "failed", error: resData });
      }
    }

    return new Response(JSON.stringify({ results }), { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
