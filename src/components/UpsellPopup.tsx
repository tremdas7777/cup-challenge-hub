import { useEffect, useRef, useState } from 'react';
import { Loader2, Copy, CheckCircle, QrCode, Sparkles, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { fireConversionEvent } from '@/lib/pixelManager';
import legoTrofeu from '@/assets/lego-copa-trofeu.webp';

interface UpsellBuyer {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface UpsellPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: () => void;
  buyer: UpsellBuyer;
}

const UPSELL_AMOUNT = 34.90;
const UPSELL_DESCRIPTION = 'Réplica Taça LEGO Copa do Mundo 2026';

export default function UpsellPopup({ open, onOpenChange, onPaid, buyer }: UpsellPopupProps) {
  const [stage, setStage] = useState<'offer' | 'pix'>('offer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [pixQr, setPixQr] = useState('');
  const [orderId, setOrderId] = useState('');
  const [copied, setCopied] = useState(false);
  const hasFiredPaid = useRef(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage('offer');
      setError('');
      setPixCode('');
      setPixQr('');
      setOrderId('');
      setCopied(false);
      hasFiredPaid.current = false;
    }
  }, [open]);

  // Poll for payment confirmation
  useEffect(() => {
    if (stage !== 'pix' || !orderId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
      if (data?.status === 'paid' && !hasFiredPaid.current) {
        hasFiredPaid.current = true;
        fireConversionEvent('Purchase', { value: UPSELL_AMOUNT, currency: 'BRL', content_name: UPSELL_DESCRIPTION }, orderId);
        clearInterval(interval);
        onPaid();
        onOpenChange(false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [stage, orderId, onPaid, onOpenChange]);

  const generatePix = async () => {
    setLoading(true);
    setError('');
    try {
      const cfg = await fetchPaymentGatewayConfig();
      const active = cfg.activeGateway;
      const metadata = {
        product: UPSELL_DESCRIPTION,
        upsell: true,
        cep: buyer.cep,
        address: buyer.endereco,
        addressNumber: buyer.numero,
        complement: buyer.complemento,
        neighborhood: buyer.bairro,
        city: buyer.cidade,
        state: buyer.estado,
        shippingMethod: 'sedex',
        shippingCostCents: 0,
        itemsDescription: UPSELL_DESCRIPTION,
      };

      let data: any = null;
      let invokeError: any = null;

      if (active === 'pagouai') {
        ({ data, error: invokeError } = await supabase.functions.invoke('criar-pagamento-pagouai', {
          body: {
            method: 'pix',
            secretKey: cfg.pagouai.secretKey,
            amount: UPSELL_AMOUNT,
            buyerName: buyer.nome,
            buyerEmail: buyer.email,
            buyerDocument: buyer.cpf,
            buyerPhone: buyer.telefone,
            metadata,
          },
        }));
      } else if (active === 'vennox') {
        ({ data, error: invokeError } = await supabase.functions.invoke('criar-pix-vennox', {
          body: {
            secretKey: cfg.vennox.secretKey,
            companyId: cfg.vennox.companyId,
            amount: UPSELL_AMOUNT,
            buyerName: buyer.nome,
            buyerEmail: buyer.email,
            buyerDocument: buyer.cpf,
            buyerPhone: buyer.telefone,
            metadata,
          },
        }));
      } else if (active === 'centurionpay') {
        ({ data, error: invokeError } = await supabase.functions.invoke('criar-pix-centurionpay', {
          body: {
            secretKey: cfg.centurionpay.secretKey,
            companyId: cfg.centurionpay.companyId,
            amount: UPSELL_AMOUNT,
            buyerName: buyer.nome,
            buyerEmail: buyer.email,
            buyerDocument: buyer.cpf,
            buyerPhone: buyer.telefone,
            metadata,
          },
        }));
      } else if (active === 'ironpay') {
        ({ data, error: invokeError } = await supabase.functions.invoke('criar-pix-ironpay', {
          body: {
            apiToken: cfg.ironpay.apiToken,
            amount: UPSELL_AMOUNT,
            buyerName: buyer.nome,
            buyerEmail: buyer.email,
            buyerDocument: buyer.cpf,
            buyerPhone: buyer.telefone,
            itemsDescription: UPSELL_DESCRIPTION,
            externalRef: `upsell-${Date.now()}`,
          },
        }));
        if (!invokeError && data?.success) {
          // ironpay needs manual order insert
          const { data: orderRow } = await supabase
            .from('orders')
            .insert({
              external_id: data.externalId || null,
              gateway: 'ironpay',
              gateway_response: data.raw || null,
              status: 'pending',
              amount_cents: Math.round(UPSELL_AMOUNT * 100),
              shipping_method: 'sedex',
              shipping_cost_cents: 0,
              items_description: UPSELL_DESCRIPTION,
              buyer_name: buyer.nome,
              buyer_email: buyer.email,
              buyer_document: buyer.cpf,
              buyer_phone: buyer.telefone,
              pix_code: data.pixCode || '',
              pix_qr_code_base64: data.qrCodeBase64 || '',
            })
            .select('id')
            .single();
          data = {
            pix_code: data.pixCode,
            pix_qr_code_base64: data.qrCodeBase64,
            order_id: orderRow?.id || '',
          };
        }
      } else if (active === 'simpayout') {
        ({ data, error: invokeError } = await supabase.functions.invoke('criar-pix-simpayout', {
          body: {
            clientId: cfg.simpayout.clientId,
            clientSecret: cfg.simpayout.clientSecret,
            amount: UPSELL_AMOUNT,
            buyerName: buyer.nome,
            buyerEmail: buyer.email,
            buyerDocument: buyer.cpf,
            buyerPhone: buyer.telefone,
            metadata,
          },
        }));
      }

      if (invokeError) throw invokeError;
      if (!data?.pix_code) throw new Error('PIX não gerado');

      setPixCode(data.pix_code);
      setPixQr(data.pix_qr_code_base64 || '');
      setOrderId(data.order_id || '');
      setStage('pix');
    } catch (err: any) {
      console.error('Upsell PIX error:', err);
      setError('Erro ao gerar PIX. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      if (orderId) await supabase.from('orders').update({ qr_code_copied: true }).eq('id', orderId);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = pixCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDecline = () => {
    onPaid(); // moves to final thank-you regardless
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDecline(); }}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-auto rounded-2xl p-0 overflow-hidden">
        {stage === 'offer' && (
          <div className="bg-background">
            {/* Top banner */}
            <div className="bg-gradient-to-r from-centauro-gold to-yellow-500 px-4 py-2 flex items-center justify-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Oferta exclusiva — só nesta tela
              </span>
            </div>

            <DialogHeader className="px-5 pt-5 pb-2">
              <DialogTitle className="text-lg font-black uppercase leading-tight">
                Aproveite e leve a Taça LEGO Copa 2026
              </DialogTitle>
              <DialogDescription className="text-xs">
                Réplica oficial em peças LEGO da taça da Copa do Mundo. Edição limitada.
              </DialogDescription>
            </DialogHeader>

            <div className="px-5 pb-5 space-y-4">
              {/* Product image */}
              <div className="bg-secondary rounded-xl p-4 flex items-center justify-center">
                <img
                  src={legoTrofeu}
                  alt="Réplica Taça LEGO Copa 2026"
                  className="h-48 object-contain drop-shadow-lg"
                />
              </div>

              {/* Price block */}
              <div className="text-center space-y-1">
                <p className="text-[11px] text-muted-foreground line-through">De R$ 199,90</p>
                <p className="text-3xl font-black text-centauro-green">
                  R$ 34<span className="text-xl">,90</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Adicionar ao seu pedido • Envio junto com o kit
                </p>
              </div>

              {/* Benefits */}
              <ul className="space-y-1.5 text-xs text-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>Peça colecionável oficial — produto licenciado</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>Envio em conjunto com seu pedido — sem frete extra</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-centauro-green mt-0.5 flex-shrink-0" />
                  <span>Pagamento via PIX em segundos</span>
                </li>
              </ul>

              {error && (
                <p className="text-xs text-destructive text-center font-medium">{error}</p>
              )}

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <Button
                  onClick={generatePix}
                  disabled={loading}
                  className="w-full h-12 text-sm font-black uppercase tracking-wider bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground rounded-xl shadow-lg"
                >
                  {loading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Gerando PIX...</>
                  ) : (
                    <>Sim, quero adicionar — R$ 34,90</>
                  )}
                </Button>
                <button
                  onClick={handleDecline}
                  className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5 underline-offset-2 hover:underline"
                >
                  Não, obrigado. Continuar para meu pedido
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-muted-foreground pt-1">
                <ShieldCheck size={11} />
                <span className="text-[10px] uppercase tracking-wider">Compra 100% segura</span>
              </div>
            </div>
          </div>
        )}

        {stage === 'pix' && (
          <div className="p-5 bg-background">
            <DialogHeader className="mb-3">
              <DialogTitle className="flex items-center gap-2 text-base font-black">
                <QrCode size={20} className="text-centauro-green" />
                Pague o adicional via PIX
              </DialogTitle>
              <DialogDescription className="text-xs">
                Após o pagamento, sua taça LEGO será adicionada automaticamente ao envio.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-center bg-secondary rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-black text-foreground">R$ 34,90</p>
              </div>

              {pixCode ? (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-lg">
                    <img
                      src={pixQr
                        ? (pixQr.startsWith('data:') ? pixQr : `data:image/png;base64,${pixQr}`)
                        : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`}
                      alt="QR Code PIX"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {pixCode && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Código PIX (Copia e Cola)
                  </label>
                  <div className="bg-secondary rounded-lg p-3 break-all">
                    <p className="text-[11px] font-mono text-foreground leading-relaxed max-h-20 overflow-y-auto">
                      {pixCode}
                    </p>
                  </div>
                  <Button
                    onClick={handleCopy}
                    className="w-full font-bold text-sm py-5 bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground"
                  >
                    {copied ? (
                      <><CheckCircle size={16} className="mr-2" /> Código Copiado!</>
                    ) : (
                      <><Copy size={16} className="mr-2" /> Copiar Código PIX</>
                    )}
                  </Button>
                </div>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                Confirmação automática em até 5 minutos. Você pode fechar esta janela e seguirá para a confirmação.
              </p>

              <button
                onClick={handleDecline}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5"
              >
                <X size={11} className="inline mr-1" />
                Pular oferta e continuar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
