// Funnel event tracking using Supabase database
// Events: 'visitor' | 'quiz_started' | 'quiz_completed' | 'checkout' | 'purchase'
// Checkout steps: 'checkout_step_1' | 'checkout_step_2' | 'checkout_step_3'

import { supabase } from '@/integrations/supabase/client';

export type FunnelEvent =
  | 'visitor'
  | 'quiz_started'
  | 'quiz_q1'
  | 'quiz_q2'
  | 'quiz_q3'
  | 'quiz_q4'
  | 'quiz_q5'
  | 'quiz_completed'
  | 'loading_results'
  | 'scratch_card'
  | 'checkout'
  | 'checkout_step_1'
  | 'checkout_step_2'
  | 'checkout_step_3'
  | 'address_focus'
  | 'payment_init'
  | 'payment_error'
  | 'upsell_view'
  | 'upsell_accepted'
  | 'upsell_declined'
  | 'upsell_completed'
  | 'sale_completed'
  | 'purchase';

const SESSION_KEY = 'funnel_session_id';

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackEvent(event: FunnelEvent) {
  try {
    await supabase.from('funnel_events').insert({
      event,
      session_id: getSessionId(),
    });
  } catch (err) {
    console.warn('Failed to track funnel event:', err);
  }
}

export async function getFunnelStats(periodMinutes: number) {
  const cutoff = new Date(Date.now() - periodMinutes * 60 * 1000).toISOString();
  const activeNowCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const [{ data: eventData, error: eventError }, { data: orderData, error: orderError }] = await Promise.all([
    supabase
      .from('funnel_events')
      .select('event, created_at')
      .gte('created_at', cutoff),
    supabase
      .from('orders')
      .select('status, created_at')
      .gte('created_at', cutoff)
      .eq('status', 'paid')
  ]);

  if (eventError || orderError) {
    console.warn('Failed to fetch funnel stats:', eventError || orderError);
    return {
      visitors: 0, quizStarted: 0, quizCompleted: 0, scratchCard: 0,
      checkout: 0, purchase: 0, activeNow: 0,
      checkoutStep1: 0, checkoutStep2: 0, checkoutStep3: 0,
      approvedSales: 0,
    };
  }

  const events = eventData || [];
  const orders = orderData || [];
  
  const getCount = (name: FunnelEvent) => events.filter(e => e.event === name).length;

  const stats = {
    visitors: getCount('visitor'),
    quizStarted: getCount('quiz_started'),
    quizQ1: getCount('quiz_q1'),
    quizQ2: getCount('quiz_q2'),
    quizQ3: getCount('quiz_q3'),
    quizQ4: getCount('quiz_q4'),
    quizQ5: getCount('quiz_q5'),
    quizCompleted: getCount('quiz_completed'),
    loadingResults: getCount('loading_results'),
    scratchCard: getCount('scratch_card'),
    checkout: getCount('checkout'),
    checkoutStep1: getCount('checkout_step_1'),
    checkoutStep2: getCount('checkout_step_2'),
    checkoutStep3: getCount('checkout_step_3'),
    addressFocus: getCount('address_focus'),
    paymentInit: getCount('payment_init'),
    paymentError: getCount('payment_error'),
    upsellView: getCount('upsell_view'),
    upsellAccepted: getCount('upsell_accepted'),
    upsellDeclined: getCount('upsell_declined'),
    purchase: getCount('purchase'),
    approvedSales: orders.length,
    activeNow: events.filter(e => e.created_at >= activeNowCutoff).length,
  };

  return stats;
}

export async function clearFunnelEvents() {
  // No-op: clearing from DB would require delete policy
  // Admin can use this as a placeholder
  console.log('Clear funnel events - data persists in database');
}
