import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { syncPagouAiPayments } from '@/lib/pagouaiStatus';

type FilterPeriod = '3h' | '6h' | '12h' | '24h' | 'hoje' | 'semana' | 'mes' | 'todos';

interface Order {
  id: string;
  amount_cents: number;
  shipping_cost_cents: number | null;
  status: string;
  created_at: string;
  buyer_name: string | null;
  buyer_document: string | null;
  gateway: string;
}

export default function AdminFinanceiro() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterPeriod>('hoje');
  const [adCost, setAdCost] = useState(() => {
    const saved = localStorage.getItem('admin_ad_cost');
    return saved ? Number(saved) : 0;
  });

  const fetchOrders = async () => {
    setLoading(true);
    await syncPagouAiPayments({ limit: 50 });
    const { data } = await supabase
      .from('orders')
      .select('id, amount_cents, shipping_cost_cents, status, created_at, buyer_name, buyer_document, gateway')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      const created = new Date(order.created_at);
      switch (period) {
        case '3h': {
          const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
          return created >= threeHoursAgo;
        }
        case '6h': {
          const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          return created >= sixHoursAgo;
        }
        case '12h': {
          const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
          return created >= twelveHoursAgo;
        }
        case '24h': {
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          return created >= twentyFourHoursAgo;
        }
        case 'hoje': {
          return created.toDateString() === now.toDateString();
        }
        case 'semana': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        }
        case 'mes': {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return created >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [orders, period]);

  const stats = useMemo(() => {
    const approved = filteredOrders.filter(o => o.status === 'paid');
    const pending = filteredOrders.filter(o => o.status === 'pending');
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled' || o.status === 'expired');

    const faturamentoCents = approved.reduce((sum, o) => sum + o.amount_cents + (o.shipping_cost_cents || 0), 0);
    const pendenteCents = pending.reduce((sum, o) => sum + o.amount_cents + (o.shipping_cost_cents || 0), 0);

    const lucro = (faturamentoCents / 100) - adCost;

    const taxaAprovacao = filteredOrders.length > 0 ? (approved.length / filteredOrders.length) * 100 : 0;

    return {
      totalOrders: filteredOrders.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
      faturamento: faturamentoCents / 100,
      pendente: pendenteCents / 100,
      lucro,
      ticketMedio: approved.length > 0 ? (faturamentoCents / approved.length) / 100 : 0,
      taxaAprovacao,
    };
  }, [filteredOrders, adCost]);

  const chartData = useMemo(() => {
    const dayMap: Record<string, { faturamento: number; vendas: number }> = {};
    filteredOrders.filter(o => o.status === 'paid').forEach(order => {
      const day = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dayMap[day]) dayMap[day] = { faturamento: 0, vendas: 0 };
      dayMap[day].faturamento += (order.amount_cents + (order.shipping_cost_cents || 0)) / 100;
      dayMap[day].vendas += 1;
    });
    return Object.entries(dayMap)
      .map(([dia, v]) => ({ dia, faturamento: Number(v.faturamento.toFixed(2)), vendas: v.vendas }))
      .reverse();
  }, [filteredOrders]);

  const pieData = useMemo(() => [
    { name: 'Aprovadas', value: stats.approvedCount, color: 'hsl(142, 71%, 45%)' },
    { name: 'Pendentes', value: stats.pendingCount, color: 'hsl(45, 93%, 47%)' },
    { name: 'Canceladas', value: stats.cancelledCount, color: 'hsl(0, 84%, 60%)' },
  ].filter(d => d.value > 0), [stats]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });

  const periods: { id: FilterPeriod; label: string }[] = [
    { id: '3h', label: '3h' },
    { id: '6h', label: '6h' },
    { id: '12h', label: '12h' },
    { id: '24h', label: '24h' },
    { id: 'hoje', label: 'Hoje' },
    { id: 'semana', label: '7 dias' },
    { id: 'mes', label: '30 dias' },
    { id: 'todos', label: 'Todos' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-black text-foreground">Financeiro</h2>
          <p className="text-muted-foreground text-xs">Faturamento, lucro e vendas em tempo real</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" size="sm" className="text-xs" disabled={loading}>
          {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
          Atualizar
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Período:</span>
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
              period === p.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-muted border border-border'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-centauro-green/10 flex items-center justify-center">
                  <DollarSign size={16} className="text-centauro-green" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Faturamento</span>
              </div>
              <p className="text-xl font-black text-foreground">{formatCurrency(stats.faturamento)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.approvedCount} vendas aprovadas</p>
            </Card>

            <Card className="p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Lucro</span>
              </div>
              <p className={`text-xl font-black ${stats.lucro >= 0 ? 'text-foreground' : 'text-destructive'}`}>{formatCurrency(stats.lucro)}</p>
            </Card>

            <Card className="p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-centauro-gold/10 flex items-center justify-center">
                  <Clock size={16} className="text-centauro-gold" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Pendentes</span>
              </div>
              <p className="text-xl font-black text-foreground">{stats.pendingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{formatCurrency(stats.pendente)} em aberto</p>
            </Card>

            <Card className="p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-centauro-green/10 flex items-center justify-center">
                  <CheckCircle size={16} className="text-centauro-green" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Aprovadas</span>
              </div>
              <p className="text-xl font-black text-foreground">{stats.approvedCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Ticket médio: {formatCurrency(stats.ticketMedio)}</p>
            </Card>

            <Card className="p-4 border border-border shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp size={16} className="text-primary" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Taxa Aprovação</span>
              </div>
              <p className="text-xl font-black text-foreground">{stats.taxaAprovacao.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.approvedCount}/{stats.totalOrders} pedidos</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="p-4 border border-border shadow-sm">
              <h3 className="text-xs font-black text-foreground mb-3 uppercase">Faturamento por Dia</h3>
              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(value: number) => [`€ ${value.toFixed(2)}`, 'Faturamento']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="faturamento" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4 border border-border shadow-sm">
              <h3 className="text-xs font-black text-foreground mb-3 uppercase">Status das Vendas</h3>
              {pieData.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-8">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
          <Card className="p-4 border border-border shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-muted-foreground">Resumo do período</div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] border-centauro-green/30 text-centauro-green">
                  <CheckCircle size={10} className="mr-1" /> {stats.approvedCount} aprovadas
                </Badge>
                <Badge variant="outline" className="text-[10px] border-centauro-gold/30 text-centauro-gold">
                  <Clock size={10} className="mr-1" /> {stats.pendingCount} pendentes
                </Badge>
                <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                  <XCircle size={10} className="mr-1" /> {stats.cancelledCount} canceladas
                </Badge>
              </div>
            </div>
          </Card>

          {/* Recent approved sales */}
          <div>
            <h3 className="text-sm font-black text-foreground mb-3">Últimas Vendas Aprovadas</h3>
            {filteredOrders.filter(o => o.status === 'paid').length === 0 ? (
              <Card className="p-6 border border-border shadow-sm text-center">
                <p className="text-muted-foreground text-xs">Nenhuma venda aprovada neste período</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredOrders
                  .filter(o => o.status === 'paid')
                  .slice(0, 10)
                  .map(order => (
                    <Card key={order.id} className="p-3 border border-border shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {order.buyer_name || 'Sem nome'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(order.created_at).toLocaleString('pt-BR')} • {order.gateway}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-centauro-green">
                            {formatCurrency((order.amount_cents + (order.shipping_cost_cents || 0)) / 100)}
                          </p>
                          <Badge className="text-[9px] bg-centauro-green/10 text-centauro-green border-centauro-green/30" variant="outline">
                            Aprovada
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
