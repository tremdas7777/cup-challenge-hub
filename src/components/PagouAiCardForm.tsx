import { useEffect, useRef, useState } from 'react';
import { Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PagouAiCardTokenData {
  token: string;
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  ipAddress?: string;
}

interface PagouAiCardFormProps {
  publicKey: string;
  amount: number; // R$
  onCreateTransaction: (tokenData: PagouAiCardTokenData & { installments: number }) => Promise<any>;
  onSubmitResult?: (payload: {
    sdkResult: any;
    gatewayResponse: any;
    tokenData: PagouAiCardTokenData;
    installments: number;
  }) => Promise<void> | void;
  disabled?: boolean;
}

declare global {
  interface Window {
    Pagou?: any;
  }
}

const SCRIPT_URL = 'https://js.pagou.ai/payments/v3.js';

let scriptPromise: Promise<void> | null = null;
let clientIpPromise: Promise<string> | null = null;

function loadPagouScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Pagou) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar script Pagou.ai')));
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar script Pagou.ai'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function resolveClientIp(): Promise<string> {
  if (typeof window === 'undefined') return '';
  if ((window as any).__pagouai_client_ip) return (window as any).__pagouai_client_ip;
  if (!clientIpPromise) {
    clientIpPromise = fetch('https://api.ipify.org?format=json', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return '';
        const data = await response.json().catch(() => null);
        return typeof data?.ip === 'string' ? data.ip : '';
      })
      .catch(() => '');
  }
  const ip = await clientIpPromise;
  if (ip) (window as any).__pagouai_client_ip = ip;
  return ip;
}

export default function PagouAiCardForm({ publicKey, amount, onCreateTransaction, onSubmitResult, disabled }: PagouAiCardFormProps) {
  const cardElRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [cardValid, setCardValid] = useState(false);
  const [cardError, setCardError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setReady(false);
        setCardValid(false);
        setCardError('');
        setLoadError('');
        await loadPagouScript();
        if (cancelled) return;
        if (!window.Pagou) throw new Error('SDK Pagou.ai indisponível');
        try {
          window.Pagou.setEnvironment?.(publicKey.startsWith('pk_sandbox_') ? 'sandbox' : 'production');
        } catch {}

        const elements = window.Pagou.elements({
          publicKey,
          locale: 'pt-BR',
          origin: window.location.origin,
        });
        const card = elements.create('card', { theme: 'default' });
        card.mount(cardElRef.current);
        card.on?.('change', ({ valid, errors }: any) => {
          setCardValid(!!valid);
          const firstErr = errors ? Object.values(errors)[0] : '';
          setCardError(typeof firstErr === 'string' ? firstErr : '');
        });
        elementsRef.current = elements;
        cardRef.current = card;
        setReady(true);
      } catch (e: any) {
        console.error('Pagou.ai init error:', e);
        setLoadError(e?.message || 'Erro ao carregar formulário de cartão');
      }
    })();
    return () => {
      cancelled = true;
      try { cardRef.current?.unmount?.(); } catch {}
    };
  }, [publicKey]);

  const handleSubmit = async () => {
    if (!elementsRef.current || !cardValid || submitting || disabled) return;
    setSubmitting(true);
    setCardError('');
    try {
      const clientIp = await resolveClientIp();
      let tokenCaptured: PagouAiCardTokenData | null = null;
      let gatewayResponse: any = null;
      const result = await elementsRef.current.submit({
        createTransaction: async (tokenData: any) => {
          tokenCaptured = {
            token: tokenData.token,
            brand: tokenData.brand,
            last4: tokenData.last4,
            expMonth: tokenData.exp_month,
            expYear: tokenData.exp_year,
            ipAddress: clientIp || undefined,
          };
          gatewayResponse = await onCreateTransaction({
            ...tokenCaptured,
            installments,
          });
          return gatewayResponse?.data ?? gatewayResponse;
        },
      });
      if (result?.status === 'error') {
        setCardError(result.error || 'Pagamento falhou');
        return;
      }
      if (tokenCaptured) {
        await onSubmitResult?.({
          sdkResult: result,
          gatewayResponse,
          tokenData: tokenCaptured,
          installments,
        });
      }
    } catch (e: any) {
      setCardError(e?.message || 'Erro ao processar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  const installmentsList = [1];

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold border border-destructive/30">
          {loadError}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-foreground mb-1.5 block">Dados do Cartão</label>
        <div
          ref={cardElRef}
          className="min-h-[44px] px-3 py-2.5 rounded-md border border-input bg-background"
        />
        {!ready && !loadError && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs mt-2">
            <Loader2 size={12} className="animate-spin" /> Carregando formulário seguro...
          </div>
        )}
        {cardError && <p className="text-destructive text-xs font-semibold mt-1.5">{cardError}</p>}
      </div>

      <div>
        <label className="text-xs font-bold text-foreground mb-1.5 block">Parcelas</label>
        <select
          value={installments}
          onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {installmentsList.map((n) => (
            <option key={n} value={n}>
              {n}x de R$ {(amount / n).toFixed(2).replace('.', ',')} {n === 1 ? '' : 'sem juros'}
            </option>
          ))}
        </select>
      </div>

      {/* Hidden carrier of installments to parent via data-attr */}
      <input type="hidden" data-pagouai-installments value={installments} readOnly />

      <Button
        onClick={() => {
          // Repass installments to parent through window event before tokenize
          (window as any).__pagouai_installments__ = installments;
          handleSubmit();
        }}
        disabled={!ready || !cardValid || submitting || disabled}
        className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg"
      >
        {submitting ? (
          <><Loader2 size={18} className="mr-2 animate-spin" /> PROCESSANDO...</>
        ) : (
          <><CreditCard size={18} className="mr-2" /> PAGAR R$ {amount.toFixed(2).replace('.', ',')}</>
        )}
      </Button>

    </div>
  );
}
