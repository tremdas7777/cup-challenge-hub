// Webhook manager - sends POST notifications on sale events
// Now syncs with database so edge functions can also fire webhooks

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'webhook_config_v2';

export interface WebhookEntry {
  id: string;
  url: string;
  events: ('venda_pendente' | 'venda_aprovada')[];
}

export interface WebhookConfig {
  webhooks: WebhookEntry[];
  // Legacy compat
  saleWebhookUrl?: string;
}

export function getWebhookConfig(): WebhookConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Migrate from v1
    const oldRaw = localStorage.getItem('webhook_config');
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (old.saleWebhookUrl) {
        const migrated: WebhookConfig = {
          webhooks: [{
            id: crypto.randomUUID(),
            url: old.saleWebhookUrl,
            events: ['venda_pendente', 'venda_aprovada'],
          }],
        };
        saveWebhookConfig(migrated);
        return migrated;
      }
    }
  } catch {}
  return { webhooks: [] };
}

export function saveWebhookConfig(config: WebhookConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Sync local webhook config to the database so edge functions can read it */
export async function syncWebhooksToDb(config: WebhookConfig) {
  const currentIds = config.webhooks.filter(w => w.url?.trim()).map(w => w.id);

  // Remove webhooks that are no longer in the config
  if (currentIds.length > 0) {
    await supabase.from('webhook_endpoints').delete().not('id', 'in', `(${currentIds.join(',')})`);
  }

  // Upsert current webhooks
  if (config.webhooks.length > 0) {
    const rows = config.webhooks
      .filter(w => w.url?.trim())
      .map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: true,
      }));
    if (rows.length > 0) {
      await supabase.from('webhook_endpoints').upsert(rows, { onConflict: 'id' });
    }
  }
}

/** Load webhook config from DB (for initial admin load) */
export async function loadWebhooksFromDb(): Promise<WebhookConfig> {
  const { data } = await supabase.from('webhook_endpoints').select('*').eq('active', true);
  if (data && data.length > 0) {
    const webhooks: WebhookEntry[] = data.map((row: any) => ({
      id: row.id,
      url: row.url,
      events: row.events || ['venda_pendente', 'venda_aprovada'],
    }));
    return { webhooks };
  }
  // Fallback to localStorage
  return getWebhookConfig();
}

export async function fireWebhookEvent(
  eventType: 'venda_pendente' | 'venda_aprovada',
  data: Record<string, unknown>
) {
  // Try DB first, fallback to localStorage
  let targets: { url: string }[] = [];
  
  try {
    const { data: dbWebhooks } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('active', true)
      .contains('events', [eventType]);
    
    if (dbWebhooks && dbWebhooks.length > 0) {
      targets = dbWebhooks.filter((w: any) => w.url?.trim());
    }
  } catch {}

  // Fallback to localStorage if no DB results
  if (targets.length === 0) {
    const config = getWebhookConfig();
    targets = config.webhooks.filter(w => w.url && w.events.includes(eventType));
  }

  const promises = targets.map(async (webhook) => {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          ...data,
        }),
        mode: 'no-cors',
      });
    } catch (err) {
      console.error(`Webhook error (${webhook.url}):`, err);
    }
  });

  await Promise.allSettled(promises);
}

// Legacy compat
export async function fireSaleWebhook(data: Record<string, unknown>) {
  await fireWebhookEvent('venda_pendente', data);
}
