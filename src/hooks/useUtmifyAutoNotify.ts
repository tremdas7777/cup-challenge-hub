// Global listener that watches the `orders` table and notifies Utmify for
// EVERY new order (pending) and EVERY status change to `paid` (sale).
// Mounted once at the App root so notifications fire even if the user navigates away.
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendUtmifyPending, sendUtmifySale } from '@/lib/utmifyManager';
import { fireConversionEvent } from '@/lib/pixelManager';

type OrderRow = {
  id: string;
  status: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
  buyer_document: string | null;
  items_description: string | null;
  amount_cents: number | null;
  shipping_cost_cents: number | null;
};

function totalPriceCents(o: OrderRow): number {
  return (o.amount_cents || 0) + (o.shipping_cost_cents || 0) || (o.amount_cents || 0);
}

export function useUtmifyAutoNotify() {
  // Silence the automatic DB listener for sales.
  // We now handle notifications directly in the checkout/payment success callbacks
  // or via manual admin actions to ensure exactly ONE approved sale is sent.
  useEffect(() => {
    // This hook is now a placeholder to prevent breaking App.tsx imports,
    // but the logic is handled at the source of the transaction.
  }, []);
}
