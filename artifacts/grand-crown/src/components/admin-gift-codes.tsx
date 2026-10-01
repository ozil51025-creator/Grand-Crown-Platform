import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateAdminGiftCode, useGetAdminGiftCodes, useUpdateAdminGiftCode, type GiftCode } from '@workspace/api-client-react';
import { Gift, Plus, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiErrorMessage } from '@/components/account-page';

const fmt = (n: number) => `UGX ${Number(n).toLocaleString('en-US')}`;
const date = (v?: string | null) => v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No expiry';
const input = 'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

export function AdminGiftCodes() {
  const list = useGetAdminGiftCodes();
  const create = useCreateAdminGiftCode();
  const update = useUpdateAdminGiftCode();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({ code: '', amount: '', maxRedemptions: '1', expiresAt: '' });
  const [localError, setLocalError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault(); setLocalError('');
    const code = form.code.trim(); const amount = Number(form.amount); const max = Number(form.maxRedemptions);
    if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) return setLocalError('Code must be 3-40 letters, numbers or hyphens.');
    if (!Number.isInteger(amount) || amount < 1 || amount > 100000000) return setLocalError('Amount must be a whole number from 1 to 100,000,000.');
    if (!Number.isInteger(max) || max < 1 || max > 100000) return setLocalError('Max redemptions must be a whole number from 1 to 100,000.');
    let expiresAt: string | null = null;
    if (form.expiresAt) { const d = new Date(form.expiresAt); if (isNaN(d.getTime())) return setLocalError('Invalid expiry date.'); expiresAt = d.toISOString(); }
    create.mutate({ data: { code, amount, maxRedemptions: max, expiresAt } }, {
      onSuccess: () => { setForm({ code: '', amount: '', maxRedemptions: '1', expiresAt: '' }); qc.invalidateQueries({ queryKey: list.queryKey }); toast({ title: 'Gift code created', description: code }); },
    });
  };
  const toggle = (g: GiftCode) => {
    setTogglingId(g.id);
    update.mutate({ id: g.id, data: { enabled: !g.enabled } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: list.queryKey }); toast({ title: g.enabled ? 'Code disabled' : 'Code enabled' }); },
      onError: err => toast({ title: 'Update failed', description: apiErrorMessage(err, 'Could not update this code.'), variant: 'destructive' }),
      onSettled: () => setTogglingId(null),
    });
  };
  const error = localError || (create.error ? apiErrorMessage(create.error, 'Gift code could not be created.') : '');
  const codes = [...(list.data || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return <div className="animate-rise">
    <div className="mb-8"><div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.22em] text-accent-foreground">Member rewards</div><h1 className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">Gift codes.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Create codes members can redeem from their Account page. Each redemption credits their wallet once.</p></div>
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-4 rounded-3xl border border-border bg-card p-6" data-testid="form-admin-gift-code">
        <h2 className="font-display text-xl font-semibold">New code</h2>
        <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Code</span><input data-testid="input-gift-code-code" className={`${input} font-mono uppercase`} maxLength={40} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="CROWN-2026" /></label>
        <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Amount (UGX)</span><input data-testid="input-gift-code-amount" type="number" min={1} max={100000000} step={1} className={input} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label>
        <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Max redemptions</span><input data-testid="input-gift-code-max" type="number" min={1} max={100000} step={1} className={input} value={form.maxRedemptions} onChange={e => setForm({ ...form, maxRedemptions: e.target.value })} /></label>
        <label className="block space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Expires (optional)</span><input data-testid="input-gift-code-expires" type="datetime-local" className={input} value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></label>
        {error && <p role="alert" data-testid="status-gift-code-error" className="text-sm text-destructive">{error}</p>}
        <button data-testid="button-create-gift-code" type="submit" disabled={create.isPending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Plus className="size-4" />{create.isPending ? 'Creating…' : 'Create gift code'}</button>
      </form>
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {list.isLoading ? <div className="space-y-3 p-5">{[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary/70" />)}</div>
          : list.error ? <div className="p-6 text-sm text-destructive"><div className="flex items-center gap-2 font-semibold"><XCircle className="size-4" />Gift codes could not load.</div><button data-testid="button-retry-gift-codes" onClick={() => list.refetch()} className="mt-2 font-semibold underline">Retry</button></div>
          : !codes.length ? <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center"><Gift className="mb-3 size-6 text-muted-foreground" /><h3 className="font-display text-lg font-semibold">No gift codes yet</h3><p className="mt-1 text-sm text-muted-foreground">Codes you create appear here with their redemption count.</p></div>
          : codes.map(g => {
            const expired = !!g.expiresAt && new Date(g.expiresAt) < new Date();
            const full = g.redemptionCount >= g.maxRedemptions;
            return <div key={g.id} data-testid={`row-gift-code-${g.id}`} className="flex flex-col gap-3 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0"><div className="font-mono text-sm font-semibold">{g.code}</div><div className="mt-1 text-xs text-muted-foreground">{fmt(g.amount)} · {g.redemptionCount}/{g.maxRedemptions} redeemed · {date(g.expiresAt)}</div></div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${!g.enabled || expired ? 'status-danger' : full ? 'status-pending' : 'status-success'}`}>{!g.enabled ? 'Disabled' : expired ? 'Expired' : full ? 'Used up' : 'Active'}</span>
                <button data-testid={`button-toggle-gift-code-${g.id}`} onClick={() => toggle(g)} disabled={togglingId === g.id} className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold hover:border-accent disabled:opacity-50">{togglingId === g.id ? 'Saving…' : g.enabled ? 'Disable' : 'Enable'}</button>
              </div>
            </div>;
          })}
      </div>
    </div>
  </div>;
}
