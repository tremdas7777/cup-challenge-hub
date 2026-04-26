// Funnel event tracking using Supabase database
// Events: 'visitor' | 'quiz_started' | 'quiz_completed' | 'checkout' | 'purchase'
// Checkout steps: 'checkout_step_1' | 'checkout_step_2' | 'checkout_step_3'

import { supabase } from '@/integrations/supabase/client';

export type FunnelEvent =
  | 'visitor'
  | 'quiz_started'
  | 'quiz_completed'
  | 'scratch_card'
  | 'checkout'
  | 'checkout_step_1'
  | 'checkout_step_2'
  | 'checkout_step_3'
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

  const { data, error } = await supabase
    .from('funnel_events')
    .select('event, created_at')
    .gte('created_at', cutoff);

  if (error) {
    console.warn('Failed to fetch funnel stats:', error);
    return {
      visitors: 0, quizStarted: 0, quizCompleted: 0, scratchCard: 0,
      checkout: 0, purchase: 0, activeNow: 0,
      checkoutStep1: 0, checkoutStep2: 0, checkoutStep3: 0,
    };
  }

  const events = data || [];
  const visitors = events.filter(e => e.event === 'visitor').length;
  const quizStarted = events.filter(e => e.event === 'quiz_started').length;
  const quizCompleted = events.filter(e => e.event === 'quiz_completed').length;
  const scratchCard = events.filter(e => e.event === 'scratch_card').length;
  const checkout = events.filter(e => e.event === 'checkout').length;
  const purchase = events.filter(e => e.event === 'purchase').length;
  const activeNow = events.filter(e => e.created_at >= activeNowCutoff).length;
  const checkoutStep1 = events.filter(e => e.event === 'checkout_step_1').length;
  const checkoutStep2 = events.filter(e => e.event === 'checkout_step_2').length;
  const checkoutStep3 = events.filter(e => e.event === 'checkout_step_3').length;

  return { visitors, quizStarted, quizCompleted, scratchCard, checkout, purchase, activeNow, checkoutStep1, checkoutStep2, checkoutStep3 };
}

export async function clearFunnelEvents() {
  // No-op: clearing from DB would require delete policy
  // Admin can use this as a placeholder
  console.log('Clear funnel events - data persists in database');
}
