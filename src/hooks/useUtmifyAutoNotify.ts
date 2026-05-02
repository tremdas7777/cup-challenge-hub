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
  // Avoid duplicate notifications across re-renders / fast events
  const notifiedPending = useRef<Set<string>>(new Set());
  const notifiedPaid = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel('orders-utmify-auto')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          const o = payload.new as OrderRow;
          if (!o?.id) return;
          try {
            // Só dispara para Utmify se já entrou como PAID (cartão aprovado na hora).
            // Pendentes NÃO devem ser notificados.
            if (o.status === 'paid' && !notifiedPaid.current.has(o.id)) {
              notifiedPaid.current.add(o.id);
              
              // Fire Facebook/TikTok/Google pixels
              fireConversionEvent('Purchase', {
                value: (o.amount_cents || 0) / 100,
                currency: 'EUR',
                content_name: o.items_description || 'Produto',
                order_id: o.id
              }, o.id);

              await sendUtmifySale({
                orderId: o.id,
                customerName: o.buyer_name || 'Cliente',
                customerEmail: o.buyer_email || 'sem-email@cliente.com',
                customerPhone: o.buyer_phone,
                customerDocument: o.buyer_document || undefined,
                productName: o.items_description || 'nutrition supplements guide eBook',
                priceInCents: o.amount_cents,
              });
            }
          } catch (e) {
            console.error('[utmify-auto] pending error:', e);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const newRow = payload.new as OrderRow;
          const oldRow = payload.old as Partial<OrderRow>;
          if (!newRow?.id) return;
          if (newRow.status !== 'paid') return;
          if (oldRow?.status === 'paid') return;
          if (notifiedPaid.current.has(newRow.id)) return;
          notifiedPaid.current.add(newRow.id);
          try {
            // Fire Facebook/TikTok/Google pixels
            fireConversionEvent('Purchase', {
              value: (newRow.amount_cents || 0) / 100,
              currency: 'EUR',
              content_name: newRow.items_description || 'Produto',
              order_id: newRow.id
            }, newRow.id);

            await sendUtmifySale({
              orderId: newRow.id,
              customerName: newRow.buyer_name || 'Cliente',
              customerEmail: newRow.buyer_email || 'sem-email@cliente.com',
              customerPhone: newRow.buyer_phone,
              customerDocument: newRow.buyer_document || undefined,
              productName: newRow.items_description || 'nutrition supplements guide eBook',
              priceInCents: newRow.amount_cents,
            });
          } catch (e) {
            console.error('[utmify-auto] paid error:', e);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
