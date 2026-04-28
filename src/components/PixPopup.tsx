import { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle, QrCode, Loader2, Upload, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { fireConversionEvent, getPixelConfig } from '@/lib/pixelManager';
import { sendUtmifyPending, sendUtmifySale } from '@/lib/utmifyManager';
import { fireWebhookEvent } from '@/lib/webhookManager';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { syncPagouAiPayments } from '@/lib/pagouaiStatus';

interface PixPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pixCode: string;
  pixQrCodeBase64: string;
  orderId: string;
  amount: number;
}

export default function PixPopup({ open, onOpenChange, pixCode, pixQrCodeBase64, orderId, amount }: PixPopupProps) {
  const [copied, setCopied] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [supportNumber, setSupportNumber] = useState('11991537247');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFiredPaidPixel = useRef(false);
  const hasFiredPendingNotify = useRef(false);

  useEffect(() => {
    if (open) {
      fetchPaymentGatewayConfig().then(cfg => setSupportNumber(cfg.supportWhatsapp));
    }
  }, [open]);

  // Show support options after 20 seconds if not paid
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowSupport(true), 20000);
      return () => clearTimeout(timer);
    } else {
      setShowSupport(false);
    }
  }, [open]);

  // When popup opens with a fresh order, fire "venda pendente" to Utmify + webhooks
  useEffect(() => {
    if (!open || !orderId || hasFiredPendingNotify.current) return;
    hasFiredPendingNotify.current = true;
    (async () => {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('buyer_name, buyer_email, buyer_phone, buyer_document, items_description, amount_cents, shipping_cost_cents')
          .eq('id', orderId)
          .single();
        if (!order) return;
        const totalCents = (order.amount_cents || 0) + (order.shipping_cost_cents || 0);

        const pxCfg = getPixelConfig();
        if (!pxCfg.onlyPaid) {
          fireConversionEvent('Purchase', { value: amount, currency: 'BRL' }, orderId);
        }

        await Promise.allSettled([
          sendUtmifyPending({
            orderId,
            customerName: order.buyer_name || 'Cliente',
            customerEmail: order.buyer_email || 'sem-email@cliente.com',
            customerPhone: order.buyer_phone || null,
            customerDocument: order.buyer_document || null,
            productName: order.items_description || 'nutrition supplements guide eBook',
            priceInCents: totalCents || Math.round(amount * 100),
          }),
          fireWebhookEvent('venda_pendente', {
            orderId,
            buyerName: order.buyer_name,
            buyerEmail: order.buyer_email,
            amount: (totalCents || Math.round(amount * 100)) / 100,
          }),
        ]);
      } catch (e) {
        console.error('Pending notify error:', e);
      }
    })();
  }, [open, orderId, amount]);

  // Reset pending flag when popup closes
  useEffect(() => {
    if (!open) hasFiredPendingNotify.current = false;
  }, [open]);

  // Poll order status and fire pixel when paid → redirect to thank-you
  useEffect(() => {
    if (!open || !orderId) return;
    hasFiredPaidPixel.current = false;

    const interval = setInterval(async () => {
      await syncPagouAiPayments({ orderId, limit: 1 });
      const { data } = await supabase
        .from('orders')
        .select('status, buyer_name, buyer_email, buyer_phone, buyer_document, items_description, amount_cents, shipping_cost_cents')
        .eq('id', orderId)
        .single();
      if (data?.status === 'paid' && !hasFiredPaidPixel.current) {
        hasFiredPaidPixel.current = true;
        const pxCfg = getPixelConfig();
        if (pxCfg.onlyPaid) {
          fireConversionEvent('Purchase', { value: amount, currency: 'BRL' }, orderId);
        }

        const totalCents = (data.amount_cents || 0) + (data.shipping_cost_cents || 0);
        // Fire Utmify "paid" + webhook "venda_aprovada"
        await Promise.allSettled([
          sendUtmifySale({
            orderId,
            customerName: data.buyer_name || 'Cliente',
            customerEmail: data.buyer_email || 'sem-email@cliente.com',
            customerPhone: data.buyer_phone || null,
            customerDocument: data.buyer_document || null,
            productName: data.items_description || 'nutrition supplements guide eBook',
            priceInCents: totalCents || Math.round(amount * 100),
          }),
          fireWebhookEvent('venda_aprovada', {
            orderId,
            buyerName: data.buyer_name,
            buyerEmail: data.buyer_email,
            amount: (totalCents || Math.round(amount * 100)) / 100,
          }),
        ]);

        clearInterval(interval);
        // Redirect to thank-you page so the upsell flow can start
        setTimeout(() => {
          window.location.href = '/obrigado';
        }, 600);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [open, orderId, amount]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);

      // Track that QR code was copied
      if (orderId) {
        await supabase.from('orders').update({ qr_code_copied: true }).eq('id', orderId);
      }

      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback copy
      const textarea = document.createElement('textarea');
      textarea.value = pixCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);

      if (orderId) {
        await supabase.from('orders').update({ qr_code_copied: true }).eq('id', orderId);
      }

      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orderId) return;
    
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${orderId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage.from('proofs').getPublicUrl(filePath);
      const url = publicUrlData.publicUrl;
      
      await supabase.from('orders').update({ proof_url: url }).eq('id', orderId);
      setProofUrl(url);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erro ao enviar comprovante. Tente pelo WhatsApp.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-auto rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-black">
            <QrCode size={20} className="text-centauro-green" />
            Pagamento via PIX
          </DialogTitle>
          <DialogDescription className="text-xs">
            Escaneie o QR Code ou copie o código para pagar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div className="text-center bg-secondary rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Valor a pagar</p>
            <p className="text-2xl font-black text-foreground">
              R$ {amount.toFixed(2).replace('.', ',')}
            </p>
          </div>

          {/* QR Code */}
          {pixCode ? (
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-lg">
                <img
                  src={pixQrCodeBase64 
                    ? (pixQrCodeBase64.startsWith('data:') ? pixQrCodeBase64 : `data:image/png;base64,${pixQrCodeBase64}`)
                    : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`
                  }
                  alt="QR Code PIX"
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* PIX Code - Copia e Cola */}
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
                className="w-full font-bold text-sm py-5 transition-all bg-centauro-green hover:bg-centauro-green/90 text-primary-foreground"
              >
                {copied ? (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} className="mr-2" />
                    Copiar Código PIX
                  </>
                )}
              </Button>
            </div>
          )}

          <p className="text-[10px] text-center text-muted-foreground">
            Após o pagamento, a confirmação será automática em até 2 minutos.
          </p>

          {/* Suporte e Upload */}
          {showSupport && (
            <div className="mt-4 space-y-3 pt-4 border-t border-border animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs font-bold text-center text-foreground">
                Já pagou e não confirmou?
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href={`https://wa.me/${supportNumber.replace(/\D/g, '')}?text=Olá, fiz o PIX e não confirmou. Segue meu comprovante!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 rounded-lg text-xs transition-colors"
                >
                  <MessageCircle size={16} />
                  Enviar comprovante via WhatsApp
                </a>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !!proofUrl}
                  className="w-full text-xs h-10 border-border text-muted-foreground"
                >
                  {uploading ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Enviando...</>
                  ) : proofUrl ? (
                    <><CheckCircle size={14} className="mr-2 text-centauro-green" /> Comprovante Enviado</>
                  ) : (
                    <><Upload size={14} className="mr-2" /> Anexar comprovante aqui</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
