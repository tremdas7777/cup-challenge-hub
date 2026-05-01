import { supabase } from '@/integrations/supabase/client';

export interface UtmifyConfig {
  apiToken: string;
  apiToken2: string;
}

const STORAGE_KEY = 'utmify_config';
const API_URL = 'https://api.utmify.com.br/api-credentials/orders';

const DEFAULT_CONFIG: UtmifyConfig = { apiToken: '', apiToken2: '' };

export function getUtmifyConfig(): UtmifyConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveUtmifyConfig(config: UtmifyConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Also persist to DB so server-side edge functions can notify Utmify even
  // when the buyer's browser is closed (PIX paid via gateway webhook, etc.)
  void persistUtmifyTokensToDb(config);
}

async function persistUtmifyTokensToDb(config: UtmifyConfig): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('gateway_config')
      .select('id')
      .limit(1)
      .single();
    const payload = {
      utmify_api_token: config.apiToken || null,
      utmify_api_token_2: config.apiToken2 || null,
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      await supabase.from('gateway_config').update(payload as any).eq('id', existing.id);
    } else {
      await supabase.from('gateway_config').insert(payload as any);
    }
  } catch (e) {
    console.error('Failed to persist Utmify tokens to DB:', e);
  }
}

/** Loads tokens from DB and writes them into localStorage so the admin UI shows them. */
export async function syncUtmifyConfigFromDb(): Promise<UtmifyConfig> {
  try {
    const { data } = await supabase
      .from('gateway_config')
      .select('utmify_api_token, utmify_api_token_2')
      .limit(1)
      .single();
    const cfg: UtmifyConfig = {
      apiToken: (data as any)?.utmify_api_token || '',
      apiToken2: (data as any)?.utmify_api_token_2 || '',
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    return cfg;
  } catch {
    return getUtmifyConfig();
  }
}

export async function testUtmifyToken(token: string): Promise<{ success: boolean; message: string }> {
  if (!token.trim()) {
    return { success: false, message: 'Token não pode estar vazio!' };
  }

  try {
    const testPayload = {
      orderId: `test_${Date.now()}`,
      platform: 'quiz-copa-2026',
      paymentMethod: 'pix',
      status: 'paid',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      refundedAt: null,
      customer: {
        name: 'Teste Integração',
        email: 'teste@teste.com',
        phone: null,
        document: null,
      },
      products: [
        {
          id: 'test-product',
          name: 'Teste Copa 2026',
          planId: null,
          planName: null,
          quantity: 1,
          priceInCents: 100,
        },
      ],
      trackingParameters: {
        src: null,
        sck: null,
        utm_source: null,
        utm_campaign: null,
        utm_medium: null,
        utm_content: null,
        utm_term: null,
      },
      commission: {
        totalPriceInCents: 100,
        gatewayFeeInCents: 0,
        userCommissionInCents: 100,
        currency: 'EUR',
      },
      isTest: true,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': token,
      },
      body: JSON.stringify(testPayload),
    });

    if (response.ok) {
      return { success: true, message: 'Token válido! Integração funcionando ✓' };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Token inválido ou sem permissão!' };
    }

    const text = await response.text().catch(() => '');
    return { success: false, message: `Erro ${response.status}: ${text || 'Resposta inesperada'}` };
  } catch (error) {
    return { success: false, message: 'Erro de conexão. A API pode estar bloqueando requisições do navegador (CORS). O token foi salvo e será usado server-side.' };
  }
}


/** Forwards payload to Utmify via edge function (avoids browser CORS) */
async function forwardViaEdge(tokens: string[], payload: Record<string, unknown>): Promise<boolean> {
  if (tokens.length === 0) return false;
  try {
    const { data, error } = await supabase.functions.invoke('utmify-notify', {
      body: { tokens, payload },
    });
    if (error) {
      console.error('utmify-notify error:', error);
      return false;
    }
    return !!(data as any)?.ok;
  } catch (e) {
    console.error('utmify-notify exception:', e);
    return false;
  }
}

/** Captura parâmetros UTM da URL atual + sessionStorage (persistidos) */
export function getTrackingParametersFromUrl(): Record<string, string | null> {
  const result: Record<string, string | null> = {
    src: null, sck: null,
    utm_source: null, utm_campaign: null, utm_medium: null,
    utm_content: null, utm_term: null,
  };
  try {
    const params = new URLSearchParams(window.location.search);
    Object.keys(result).forEach((k) => {
      const v = params.get(k);
      if (v) {
        result[k] = v;
        try { sessionStorage.setItem(`utm_${k}`, v); } catch {}
      } else {
        try {
          const stored = sessionStorage.getItem(`utm_${k}`);
          if (stored) result[k] = stored;
        } catch {}
      }
    });
  } catch {}
  return result;
}

const nowSql = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

interface SaleData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerDocument?: string | null;
  productName: string;
  priceInCents: number;
  trackingParameters?: Record<string, string | null>;
  isTest?: boolean;
}

function buildPayload(data: SaleData, status: 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback') {
  const tracking = data.trackingParameters || getTrackingParametersFromUrl();
  return {
    orderId: data.orderId,
    platform: 'quiz-copa-2026',
    paymentMethod: 'credit_card',
    status,
    createdAt: nowSql(),
    approvedDate: status === 'paid' ? nowSql() : null,
    refundedAt: null,
    customer: {
      name: data.customerName,
      email: data.customerEmail,
      phone: data.customerPhone ?? null,
      document: data.customerDocument ?? null,
    },
    products: [
      {
        id: 'bola-de-futebol',
        name: data.productName,
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: data.priceInCents,
      },
    ],
    trackingParameters: {
      src: tracking.src ?? null,
      sck: tracking.sck ?? null,
      utm_source: tracking.utm_source ?? null,
      utm_campaign: tracking.utm_campaign ?? null,
      utm_medium: tracking.utm_medium ?? null,
      utm_content: tracking.utm_content ?? null,
      utm_term: tracking.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: data.priceInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: data.priceInCents,
      currency: 'EUR',
    },
    ...(data.isTest ? { isTest: true } : {}),
  };
}

/** Envia "venda pendente" (PIX gerado, aguardando pagamento) */
export async function sendUtmifyPending(data: SaleData): Promise<boolean> {
  const config = getUtmifyConfig();
  const tokens = [config.apiToken, config.apiToken2].filter(Boolean);
  if (tokens.length === 0) return false;
  return forwardViaEdge(tokens, buildPayload(data, 'waiting_payment'));
}

/** Envia "venda aprovada" (PIX pago) */
export async function sendUtmifySale(data: SaleData): Promise<boolean> {
  const config = getUtmifyConfig();
  const tokens = [config.apiToken, config.apiToken2].filter(Boolean);
  if (tokens.length === 0) return false;
  return forwardViaEdge(tokens, buildPayload(data, 'paid'));
}
