// Consulta CPF - retorna nome, nascimento, sexo e mãe
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function onlyDigits(s: string) {
  return (s || '').replace(/\D/g, '');
}

function isValidCPF(cpf: string): boolean {
  cpf = onlyDigits(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf[10]);
}

// Tenta várias APIs em sequência
async function tryFontesDeRenda(cpf: string) {
  try {
    const url = `https://consulta.fontesderenda.blog.br/cpf.php?token=6285fe45-e991-4071-a848-3fac8273c55a&cpf=${cpf}`;
    console.log('[fontesderenda] GET', url);
    const r = await fetch(url, { method: 'GET' });
    const txt = await r.text();
    console.log('[fontesderenda] status', r.status, 'body:', txt.slice(0, 500));
    if (!r.ok) return null;
    const j = JSON.parse(txt);
    const d = j?.DADOS;
    if (!d || !d.nome) return null;
    return {
      nome: d.nome || null,
      nascimento: d.data_nascimento || null,
      sexo: d.sexo || null,
      mae: d.nome_mae || null,
      source: 'fontesderenda',
    };
  } catch (e: any) {
    console.log('[fontesderenda] error:', e?.message);
    return null;
  }
}

async function tryHashiraSlow(cpf: string) {
  try {
    const url = `https://api-bdc.io/data/cpf?cpf=${cpf}`;
    console.log('[hashira] GET', url);
    const r = await fetch(url, { method: 'GET' });
    const txt = await r.text();
    console.log('[hashira] status', r.status, 'body:', txt.slice(0, 500));
    if (!r.ok) return null;
    const j = JSON.parse(txt);
    if (!j?.nome) return null;
    return {
      nome: j.nome || null,
      nascimento: j.nascimento || j.data_nascimento || null,
      sexo: j.sexo || j.genero || null,
      mae: j.mae || j.nome_mae || null,
      source: 'hashira',
    };
  } catch (e: any) {
    console.log('[hashira] error:', e?.message);
    return null;
  }
}

async function tryAmnesia(cpf: string) {
  try {
    const url = `https://amnesia-cpf.vercel.app/api/cpf/${cpf}`;
    console.log('[amnesia] GET', url);
    const r = await fetch(url);
    const txt = await r.text();
    console.log('[amnesia] status', r.status, 'body:', txt.slice(0, 500));
    if (!r.ok) return null;
    const j = JSON.parse(txt);
    const d = j?.dados || j?.DADOS || j;
    if (!d?.nome && !d?.NOME) return null;
    return {
      nome: d.nome || d.NOME || null,
      nascimento: d.nascimento || d.data_nascimento || d.NASC || null,
      sexo: d.sexo || d.SEXO || null,
      mae: d.mae || d.nome_mae || d.NOME_MAE || null,
      source: 'amnesia',
    };
  } catch (e: any) {
    console.log('[amnesia] error:', e?.message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({ cpf: '' }));
    const cpfRaw = body?.cpf || '';
    const digits = onlyDigits(cpfRaw);
    console.log('[consulta-cpf] received cpf:', cpfRaw, '-> digits:', digits);

    if (!isValidCPF(digits)) {
      console.log('[consulta-cpf] CPF inválido');
      return new Response(
        JSON.stringify({ success: false, error: 'CPF inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let data = await tryFontesDeRenda(digits);
    if (!data) data = await tryHashiraSlow(digits);
    if (!data) data = await tryAmnesia(digits);

    if (!data || !data.nome) {
      console.log('[consulta-cpf] nenhuma fonte retornou dados');
      return new Response(
        JSON.stringify({ success: false, error: 'Não foi possível consultar este CPF no momento' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[consulta-cpf] sucesso via', data.source, '->', data.nome);
    return new Response(
      JSON.stringify({ success: true, ...data, cpf: digits }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[consulta-cpf] error:', err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
