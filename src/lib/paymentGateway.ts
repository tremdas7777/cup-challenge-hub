import { supabase } from '@/integrations/supabase/client';

export interface PagouAiConfig {
  publicKey: string;
  secretKey: string;
  enabled: boolean;
}

export interface StripeConfig {
  publicKey: string;
  secretKey: string;
  enabled: boolean;
}

export interface PaymentGatewayConfig {
  activeGateway: 'pagouai' | 'stripe';
  productTicketCents: number;
  creditCardEnabled: boolean;
  supportWhatsapp: string;
  externalCheckoutEnabled: boolean;
  externalCheckoutUrl: string;
  pagouai: PagouAiConfig;
  stripe: StripeConfig;
}

const defaultConfig: PaymentGatewayConfig = {
  activeGateway: 'stripe',
  productTicketCents: 1200,
  creditCardEnabled: true,
  supportWhatsapp: '11991537247',
  externalCheckoutEnabled: false,
  externalCheckoutUrl: '',
  pagouai: { publicKey: '', secretKey: '', enabled: false },
  stripe: { 
    publicKey: 'pk_live_51QfEVFDIdOJJDfBut2ck9a3uEMOk6R4tEvEckC4afM10Sbrk3gKFggZkOkNypjTPfCcHtjSNs0HSKF66o58hGhm100CPXMK29K', 
    secretKey: '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', 
    enabled: true 
  },
};

// In-memory cache to avoid repeated DB calls within the same page
let cachedConfig: PaymentGatewayConfig | null = null;

export function getCachedGatewayConfig(): PaymentGatewayConfig {
  return cachedConfig || defaultConfig;
}

export async function fetchPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  cachedConfig = null; // Clear cache to force fresh fetch
  try {
    const { data, error } = await supabase
      .from('gateway_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Error fetching gateway config:', error);
      return defaultConfig;
    }

    const config: PaymentGatewayConfig = {
      activeGateway: (['pagouai', 'stripe'].includes(data.active_gateway)
        ? data.active_gateway
        : 'pagouai') as PaymentGatewayConfig['activeGateway'],
      productTicketCents: typeof (data as any).product_ticket_cents === 'number'
        ? (data as any).product_ticket_cents
        : 1200,
      creditCardEnabled: !!(data as any).credit_card_enabled,
      supportWhatsapp: (data as any).support_whatsapp || '11991537247',
      externalCheckoutEnabled: !!(data as any).external_checkout_enabled,
      externalCheckoutUrl: (data as any).external_checkout_url || '',
      pagouai: {
        publicKey: data.pagouai_public_key || '',
        secretKey: data.pagouai_secret_key || '',
        enabled: !!(data.pagouai_secret_key),
      },
      stripe: {
        publicKey: (data as any).stripe_public_key || defaultConfig.stripe.publicKey,
        secretKey: (data as any).stripe_secret_key || defaultConfig.stripe.secretKey,
        enabled: true,
      },
    };

    // Apply localStorage fallback if it exists (solves silent RLS failures)
    const localOverride = localStorage.getItem('admin_external_checkout_enabled');
    if (localOverride !== null) {
      config.externalCheckoutEnabled = localOverride === '1';
    }

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
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const updateData: Record<string, any> = {
      active_gateway: config.activeGateway,
      product_ticket_cents: config.productTicketCents,
      credit_card_enabled: config.creditCardEnabled,
      support_whatsapp: config.supportWhatsapp,
      external_checkout_enabled: config.externalCheckoutEnabled,
      external_checkout_url: config.externalCheckoutUrl,
      pagouai_public_key: config.pagouai.publicKey,
      pagouai_secret_key: config.pagouai.secretKey,
      stripe_public_key: config.stripe.publicKey,
      stripe_secret_key: config.stripe.secretKey,
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

    // Force save to localStorage as a fallback in case Supabase RLS is silently blocking updates
    localStorage.setItem('admin_external_checkout_enabled', config.externalCheckoutEnabled ? '1' : '0');

    cachedConfig = config;
    return true;
  } catch (err) {
    console.error('Error saving gateway config:', err);
    return false;
  }
}

export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  return cachedConfig || defaultConfig;
}
