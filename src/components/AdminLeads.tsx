import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Users, Phone, Mail, FileText, Copy, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { syncPagouAiPayments } from '@/lib/pagouaiStatus';

interface Lead {
  id: string;
  buyer_name: string | null;
  buyer_document: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  pix_code: string | null;
  buyer_cep: string | null;
  buyer_address: string | null;
  buyer_address_number: string | null;
  buyer_city: string | null;
}

type FilterStatus = 'todos' | 'paid' | 'pending' | 'expired' | 'cancelled';

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    await syncPagouAiPayments({ limit: 100 });
    const { data } = await supabase
      .from('orders')
      .select('id, buyer_name, buyer_document, buyer_phone, buyer_email, amount_cents, status, created_at, pix_code, buyer_cep, buyer_address, buyer_address_number, buyer_city')
      .order('created_at', { ascending: false })
      .limit(200);
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'todos') return leads;
    return leads.filter(l => l.status === filter);
  }, [leads, filter]);

  const stats = useMemo(() => ({
    total: leads.length,
    paid: leads.filter(l => l.status === 'paid').length,
    pending: leads.filter(l => l.status === 'pending').length,
    expired: leads.filter(l => l.status === 'expired').length,
    cancelled: leads.filter(l => l.status === 'cancelled').length,
    withPhone: leads.filter(l => l.buyer_phone).length,
    withEmail: leads.filter(l => l.buyer_email).length,
  }), [leads]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCSV = () => {
    const rows = [['Nome', 'Telefone', 'Email', 'Valor', 'Status', 'Data']];
    filtered.forEach(l => {
      rows.push([
        l.buyer_name || '',
        (l.amount_cents / 100).toFixed(2),
        l.status,
        new Date(l.created_at).toLocaleString('de-DE'),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const statusLabel: Record<string, { label: string; color: string }> = {
    paid: { label: 'Aprovado', color: 'text-centauro-green border-centauro-green/30' },
    pending: { label: 'Pendente', color: 'text-centauro-gold border-centauro-gold/30' },
    expired: { label: 'Expirado', color: 'text-destructive border-destructive/30' },
    cancelled: { label: 'Cancelado', color: 'text-destructive border-destructive/30' },
  };

  const filters: { id: FilterStatus; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'paid', label: 'Aprovados' },
    { id: 'pending', label: 'Pendentes' },
    { id: 'expired', label: 'Expirados' },
    { id: 'cancelled', label: 'Cancelados' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-black text-foreground">Leads</h2>
          <p className="text-muted-foreground text-xs">Todos os clientes (aprovados e não aprovados)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="text-xs" disabled={loading || filtered.length === 0}>
            <FileText size={14} className="mr-1" /> Exportar CSV
          </Button>
          <Button onClick={fetchLeads} variant="outline" size="sm" className="text-xs" disabled={loading}>
            {loading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="p-3 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-primary" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Leads</span>
          </div>
          <p className="text-lg font-black text-foreground">{stats.total}</p>
        </Card>
        <Card className="p-3 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Phone size={14} className="text-centauro-green" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Com Telefone</span>
          </div>
          <p className="text-lg font-black text-foreground">{stats.withPhone}</p>
        </Card>
        <Card className="p-3 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={14} className="text-centauro-gold" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Com Email</span>
          </div>
          <p className="text-lg font-black text-foreground">{stats.withEmail}</p>
        </Card>
        <Card className="p-3 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Pendentes</span>
          </div>
          <p className="text-lg font-black text-foreground">{stats.pending}</p>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold text-muted-foreground">Status:</span>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-muted border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 border border-border shadow-sm text-center">
          <p className="text-muted-foreground text-xs">Nenhum lead encontrado</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <Card key={lead.id} className="p-3 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {lead.buyer_name || 'Sem nome'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {lead.buyer_phone && (
                      <button
                        onClick={() => copyToClipboard(lead.buyer_phone!, lead.id + '-phone')}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === lead.id + '-phone' ? <CheckCircle size={10} className="text-centauro-green" /> : <Phone size={10} />}
                        {lead.buyer_phone}
                      </button>
                    )}
                    {lead.buyer_email && (
                      <button
                        onClick={() => copyToClipboard(lead.buyer_email!, lead.id + '-email')}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedId === lead.id + '-email' ? <CheckCircle size={10} className="text-centauro-green" /> : <Mail size={10} />}
                        {lead.buyer_email}
                      </button>
                    )}
                  </div>
                  {(lead.buyer_address || lead.buyer_cep) && (
                    <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/50">
                      <MapPin size={10} className="text-muted-foreground shrink-0" />
                      <p className="text-[10px] text-muted-foreground truncate">
                        {lead.buyer_cep && `${lead.buyer_cep}, `}
                        {lead.buyer_address && `${lead.buyer_address} ${lead.buyer_address_number || ''}`}
                        {lead.buyer_city && ` - ${lead.buyer_city}`}
                      </p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(lead.created_at).toLocaleString('de-DE')} • € {(lead.amount_cents / 100).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="ml-3">
                  <Badge variant="outline" className={`text-[9px] ${statusLabel[lead.status]?.color || 'text-muted-foreground'}`}>
                    {statusLabel[lead.status]?.label || lead.status}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
