const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_URL = "https://api.utmify.com.br/api-credentials/orders";

interface ForwardBody {
  tokens: string[];
  payload: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ForwardBody;
    const tokens = (body.tokens || []).filter((t) => typeof t === "string" && t.trim());
    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "no tokens provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!body.payload || typeof body.payload !== "object") {
      return new Response(
        JSON.stringify({ ok: false, error: "missing payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const r = await fetch(API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-token": token,
            },
            body: JSON.stringify(body.payload),
          });
          const text = await r.text().catch(() => "");
          return { token: token.slice(0, 6) + "…", status: r.status, ok: r.ok, body: text.slice(0, 400) };
        } catch (e) {
          return { token: token.slice(0, 6) + "…", ok: false, error: String(e) };
        }
      }),
    );

    const anyOk = results.some((r) => r.ok);
    return new Response(JSON.stringify({ ok: anyOk, results }), {
      status: anyOk ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
