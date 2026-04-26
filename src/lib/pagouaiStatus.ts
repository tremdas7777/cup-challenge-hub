import { supabase } from '@/integrations/supabase/client';

interface SyncOptions {
  orderId?: string;
  limit?: number;
}

export async function syncPagouAiPayments(options: SyncOptions = {}) {
  try {
    const { data, error } = await supabase.functions.invoke('reconcile-pagouai-payments', {
      body: {
        orderId: options.orderId,
        limit: options.limit,
      },
    });

    if (error) {
      console.error('Pagou.ai reconcile error:', error);
      return null;
    }

    return data ?? null;
  } catch (error) {
    console.error('Pagou.ai reconcile exception:', error);
    return null;
  }
}