import { supabase } from '@/integrations/supabase/client';

export interface PagouAiConfig {
  publicKey: string;
  secretKey: string;
  enabled: boolean;
}

export interface VennoxConfig {
  secretKey: string;
  companyId: string;
  enabled: boolean;
}

export interface CenturionPayConfig {
  secretKey: string;
  companyId: string;
  enabled: boolean;
}

export interface IronPayConfig {
  apiToken: string;
  enabled: boolean;
}

export interface SimPayoutConfig {
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

export interface PaymentGatewayConfig {
  activeGateway: 'pagouai' | 'vennox' | 'centurionpay' | 'ironpay' | 'simpayout';
  productTicketCents: number;
  creditCardEnabled: boolean;
  supportWhatsapp: string;
  pagouai: PagouAiConfig;
  vennox: VennoxConfig;
  centurionpay: CenturionPayConfig;
  ironpay: IronPayConfig;
  simpayout: SimPayoutConfig;
}

const defaultConfig: PaymentGatewayConfig = {
  activeGateway: 'centurionpay',
  productTicketCents: 4490,
  creditCardEnabled: false,
  supportWhatsapp: '11991537247',
  pagouai: { publicKey: '', secretKey: '', enabled: false },
  vennox: { secretKey: '', companyId: '', enabled: false },
  centurionpay: { secretKey: '', companyId: '', enabled: false },
  ironpay: { apiToken: '', enabled: false },
  simpayout: { clientId: '', clientSecret: '', enabled: false },
};

// In-memory cache to avoid repeated DB calls within the same page
let cachedConfig: PaymentGatewayConfig | null = null;

export function getCachedGatewayConfig(): PaymentGatewayConfig {
  return cachedConfig || defaultConfig;
}

export async function fetchPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  try {
    const { data, error } = await supabase
      .from('gateway_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching gateway config:', error);
      return defaultConfig;
    }

    const config: PaymentGatewayConfig = {
      activeGateway: (['pagouai', 'vennox', 'centurionpay', 'ironpay', 'simpayout'].includes(data.active_gateway)
        ? data.active_gateway
        : 'centurionpay') as PaymentGatewayConfig['activeGateway'],
      productTicketCents: typeof (data as any).product_ticket_cents === 'number'
        ? (data as any).product_ticket_cents
        : 4490,
      creditCardEnabled: !!(data as any).credit_card_enabled,
      supportWhatsapp: (data as any).support_whatsapp || '11991537247',
      pagouai: {
        publicKey: data.pagouai_public_key || '',
        secretKey: data.pagouai_secret_key || '',
        enabled: !!(data.pagouai_secret_key),
      },
      vennox: {
        secretKey: data.vennox_secret_key || '',
        companyId: data.vennox_company_id || '',
        enabled: !!(data.vennox_secret_key && data.vennox_company_id),
      },
      centurionpay: {
        secretKey: data.centurionpay_secret_key || '',
        companyId: data.centurionpay_company_id || '',
        enabled: !!(data.centurionpay_secret_key && data.centurionpay_company_id),
      },
      ironpay: {
        apiToken: (data as any).ironpay_api_token || '',
        enabled: !!((data as any).ironpay_api_token),
      },
      simpayout: {
        clientId: (data as any).simpayout_client_id || '',
        clientSecret: (data as any).simpayout_client_secret || '',
        enabled: !!((data as any).simpayout_client_id && (data as any).simpayout_client_secret),
      },
    };

    cachedConfig = config;
    return config;
  } catch (err) {
    console.error('Error fetching gateway config:', err);
    return defaultConfig;
  }
}

export async function savePaymentGatewayConfig(config: PaymentGatewayConfig): Promise<boolean> {
  try {
    // Get existing row id
    const { data: existing } = await supabase
      .from('gateway_config')
      .select('id')
      .limit(1)
      .single();

    const updateData: Record<string, any> = {
      active_gateway: config.activeGateway,
      product_ticket_cents: config.productTicketCents,
      credit_card_enabled: config.creditCardEnabled,
      support_whatsapp: config.supportWhatsapp,
      pagouai_public_key: config.pagouai.publicKey,
      pagouai_secret_key: config.pagouai.secretKey,
      vennox_secret_key: config.vennox.secretKey,
      vennox_company_id: config.vennox.companyId,
      centurionpay_secret_key: config.centurionpay.secretKey,
      centurionpay_company_id: config.centurionpay.companyId,
      ironpay_api_token: config.ironpay.apiToken,
      simpayout_client_id: config.simpayout.clientId,
      simpayout_client_secret: config.simpayout.clientSecret,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('gateway_config')
        .update(updateData as any)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('gateway_config')
        .insert(updateData as any);
      if (error) throw error;
    }

    cachedConfig = config;
    return true;
  } catch (err) {
    console.error('Error saving gateway config:', err);
    return false;
  }
}

// Legacy support - keep getPaymentGatewayConfig for sync access (uses cache)
export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  return cachedConfig || defaultConfig;
}
