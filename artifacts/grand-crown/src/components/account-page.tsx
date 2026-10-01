import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useChangeAccountPassword,
  useGetAccountTransactions,
  useRedeemGiftCode,
  type Settings,
  type Transaction,
  type User,
  type Withdrawal,
} from '@workspace/api-client-react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, ArrowUpToLine, ChevronDown, ChevronRight, Copy, Crown, Download, FileText, Gift, Headphones, History, LogOut, MessageCircle, ShieldCheck, UserRound, X, XCircle } from 'lucide-react';
import { assetUrl } from '@/components/plan-catalogue';
import { AppInstallAction } from '@/components/app-install-action';
import { useToast } from '@/hooks/use-toast';

const money = (value = 0, currency = 'UGX') => `${currency} ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export function apiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') return (data as { error: string }).error;
  return fallback;
}

type Row = 'history' | 'password' | 'gift' | 'help' | 'install' | 'terms' | null;

const glass = 'rounded-[26px] border border-white/20 bg-[hsl(200_35%_10%/.55)] text-white shadow-[0_24px_60px_-20px_hsl(200_50%_4%/.7)] backdrop-blur-xl backdrop-saturate-150';
const inputCls = 'h-11 w-full rounded-xl border border-white/20 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[hsl(var(--accent))] focus:ring-2 focus:ring-[hsl(var(--accent)/.25)]';
const goldBtn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-primary transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50';

export function AccountPage({ user, settings, withdrawals, withdrawalsLoading, withdrawalsError, currency, canWithdraw, onDeposit, onWithdraw, onLogout, loggingOut }: {
  user: User; settings?: Settings; withdrawals?: Withdrawal[]; withdrawalsLoading: boolean; withdrawalsError: boolean; currency: string; canWithdraw?: boolean;
  onDeposit: () => void; onWithdraw: () => void; onLogout: () => void; loggingOut?: boolean;
}) {
  const [open, setOpen] = useState<Row>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const toggle = (row: Row) => setOpen(current => current === row ? null : row);
  const groupUrl = settings?.telegramUrl || 'https://t.me/+zNDnaz_xKfdiMTlk';
  const adminHandle = settings?.supportHandle || '@grandcrown01';
  const adminUrl = `https://t.me/${adminHandle.replace(/^@/, '')}`;

  return <div className="relative -mx-5 -mt-5 min-h-[calc(100dvh-5rem)] px-4 pb-10 pt-5 sm:-m-8 sm:p-8 lg:-m-12 lg:p-12" data-testid="page-account">
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 lg:left-72">
      <img src={assetUrl('resort.jpg')} alt="" className="auth-kenburns size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(205_45%_8%/.55)] via-[hsl(200_40%_10%/.35)] to-[hsl(200_45%_6%/.75)]" />
    </div>
    <div className="relative z-[1] mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-6">
      <div className="space-y-4 lg:sticky lg:top-28">
        <section className={`${glass} animate-rise p-6 sm:p-7`} data-testid="panel-account-identity">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-full border border-white/20 text-white/70"><UserRound className="size-6" strokeWidth={1.5} /></div>
            <div className="min-w-0">
              <div className="text-sm text-white/65">My account</div>
              <div className="mt-1 truncate text-[26px] font-medium tracking-tight sm:text-3xl" data-testid="text-account-phone">{user.phone}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/65" data-testid="status-account">
                <span className={`size-1.5 rounded-full ${user.banned ? 'bg-destructive' : 'bg-emerald-400'}`} />{user.banned ? 'Account restricted' : 'Active member'}
              </div>
            </div>
          </div>
          <div className="my-6 h-px bg-white/45" />
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm text-white/70">Total wallet balance</span>
            <span className="text-2xl font-medium tracking-tight sm:text-3xl" data-testid="text-account-wallet">{money(user.wallet, currency)}</span>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm font-medium">
            <button data-testid="button-account-deposit" onClick={onDeposit} className="inline-flex items-center gap-2 rounded-lg py-1 transition hover:text-accent"><ArrowDownToLine className="size-4" />Deposit</button>
            <button data-testid="button-account-withdraw" onClick={onWithdraw} className="inline-flex items-center gap-2 rounded-lg py-1 transition hover:text-accent"><ArrowUpToLine className="size-4" />Withdraw</button>
            <button data-testid="button-account-view-wallet" onClick={() => setWalletOpen(true)} className="inline-flex items-center gap-2 rounded-lg py-1 transition hover:text-accent">View wallet<ArrowRight className="size-4" /></button>
          </div>
        </section>
        <div className="hidden lg:block"><SignOutPanel onLogout={onLogout} loggingOut={loggingOut} /></div>
      </div>

      <section className={`${glass} animate-rise px-5 py-2 sm:px-6`} data-testid="panel-account-menu">
        <MenuRow id="history" icon={History} label="Transaction history" open={open === 'history'} onClick={() => toggle('history')} indicator="chevron">
          <TransactionHistory currency={currency} />
        </MenuRow>
        <MenuRow id="password" icon={ShieldCheck} label="Change password" open={open === 'password'} onClick={() => toggle('password')}>
          <PasswordForm />
        </MenuRow>
        <MenuRow id="gift" icon={Gift} label="Redeem gift code" open={open === 'gift'} onClick={() => toggle('gift')}>
          <GiftForm currency={currency} />
        </MenuRow>
        <MenuRow id="help" icon={Headphones} label="Help & community" open={open === 'help'} onClick={() => toggle('help')} indicator="external">
          <p className="text-sm leading-6 text-white/65">Questions about a payment or withdrawal? Reach the Grand Crown team on Telegram.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <a data-testid="button-customer-support-group" href={groupUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold transition hover:border-accent"><MessageCircle className="size-4" />Telegram group</a>
            <a data-testid="button-customer-support-admin" href={adminUrl} target="_blank" rel="noreferrer" className={goldBtn}><ArrowUpRight className="size-4" />Message {adminHandle}</a>
          </div>
        </MenuRow>
        <MenuRow id="install" icon={Download} label="Install Grand Crown app" open={open === 'install'} onClick={() => toggle('install')} indicator="chevron">
          <div className="text-white"><AppInstallAction /></div>
        </MenuRow>
        <MenuRow id="terms" icon={FileText} label="Terms & conditions" open={open === 'terms'} onClick={() => toggle('terms')} indicator="chevron" last>
          <TermsBody settings={settings} adminUrl={adminUrl} adminHandle={adminHandle} />
        </MenuRow>
      </section>

      <div className="lg:hidden"><SignOutPanel onLogout={onLogout} loggingOut={loggingOut} /></div>
    </div>

    <footer className="relative z-[1] mx-auto mt-10 max-w-5xl border-t border-white/40 pt-6 text-white" data-testid="footer-account">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-accent"><Crown className="size-5" />GRAND CROWN</span>
        <span className="text-xs text-white/60">Hotel &amp; Suites</span>
      </div>
      <button data-testid="button-footer-terms" onClick={() => { setOpen('terms'); document.querySelector('[data-testid="button-account-menu-terms"]')?.scrollIntoView({ block: 'center' }); }} className="mt-4 inline-flex items-center gap-2 text-xs text-white/70 hover:text-white">Terms &amp; conditions<ArrowUpRight className="size-3.5" /></button>
    </footer>

    {walletOpen && <WalletSheet user={user} currency={currency} withdrawals={withdrawals} loading={withdrawalsLoading} error={withdrawalsError} canWithdraw={canWithdraw} onClose={() => setWalletOpen(false)} onWithdraw={() => { setWalletOpen(false); onWithdraw(); }} onDeposit={() => { setWalletOpen(false); onDeposit(); }} />}
  </div>;
}

function SignOutPanel({ onLogout, loggingOut }: { onLogout: () => void; loggingOut?: boolean }) {
  return <section className={`${glass} px-5 sm:px-6`}>
    <button data-testid="button-account-signout" onClick={onLogout} disabled={loggingOut} className="flex w-full items-center gap-4 py-7 text-left text-[15px] disabled:opacity-60">
      <LogOut className="size-5 text-white/85" strokeWidth={1.6} /><span className="flex-1">{loggingOut ? 'Signing out…' : 'Sign out'}</span><ChevronRight className="size-4 text-white/70" />
    </button>
  </section>;
}

function MenuRow({ id, icon: Icon, label, open, onClick, children, indicator = 'expand', last = false }: { id: string; icon: typeof History; label: string; open: boolean; onClick: () => void; children: ReactNode; indicator?: 'expand' | 'chevron' | 'external'; last?: boolean }) {
  const Ind = indicator === 'external' ? ArrowUpRight : indicator === 'chevron' && !open ? ChevronRight : ChevronDown;
  return <div className={`border-t border-white/20 ${last ? 'border-b' : ''}`}>
    <button data-testid={`button-account-menu-${id}`} aria-expanded={open} onClick={onClick} className="flex w-full items-center gap-4 py-5 text-left text-[15px] transition hover:text-accent">
      <Icon className="size-5 text-white/85" strokeWidth={1.6} /><span className="flex-1">{label}</span>
      <Ind className={`size-4 text-white/70 transition-transform duration-300 ${open && indicator === 'expand' ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="animate-fade pb-5 pl-9" data-testid={`panel-account-${id}`}>{children}</div>}
  </div>;
}

function TransactionHistory({ currency }: { currency: string }) {
  const tx = useGetAccountTransactions();
  const sorted = useMemo(() => [...(tx.data || [])].sort((a: Transaction, b: Transaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [tx.data]);
  if (tx.isLoading) return <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/10" />)}</div>;
  if (tx.error) return <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" data-testid="status-transactions-error"><div className="flex items-center gap-2 font-semibold"><XCircle className="size-4" />Could not load transactions.</div><button data-testid="button-retry-transactions" onClick={() => tx.refetch()} className="mt-2 text-xs font-semibold text-accent underline">Try again</button></div>;
  if (!sorted.length) return <p className="rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/60" data-testid="status-transactions-empty">No wallet movement yet. Deposits, earnings and withdrawals will appear here.</p>;
  return <div className="max-h-80 space-y-1 overflow-y-auto pr-1">{sorted.map(item => {
    const negative = item.amount < 0;
    return <div key={item.id} data-testid={`row-account-transaction-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-white/5">
      <div className="min-w-0"><div className="truncate text-sm font-medium capitalize">{item.type.replaceAll('_', ' ')}</div><div className="text-[11px] text-white/50">{dateTime(item.createdAt)}</div></div>
      <div className={`shrink-0 font-mono text-sm ${negative ? 'text-[hsl(11_80%_72%)]' : 'text-accent'}`}>{negative ? '−' : '+'}{money(Math.abs(item.amount), currency)}</div>
    </div>;
  })}</div>;
}

function PasswordForm() {
  const change = useChangeAccountPassword();
  const { toast } = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [localError, setLocalError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError('');
    if (!values.currentPassword) return setLocalError('Enter your current password.');
    if (values.newPassword.length < 8 || values.newPassword.length > 128) return setLocalError('New password must be 8 to 128 characters.');
    if (values.newPassword !== values.confirm) return setLocalError('The new passwords do not match.');
    if (values.newPassword === values.currentPassword) return setLocalError('Choose a password different from your current one.');
    change.mutate({ data: { currentPassword: values.currentPassword, newPassword: values.newPassword } }, {
      onSuccess: () => { setValues({ currentPassword: '', newPassword: '', confirm: '' }); toast({ title: 'Password updated', description: 'Other devices have been signed out. This session stays active.' }); },
    });
  };
  const error = localError || (change.error ? apiErrorMessage(change.error, 'Password could not be changed.') : '');
  return <form onSubmit={submit} className="space-y-3" data-testid="form-change-password">
      <input aria-label="Current password" data-testid="input-current-password" type="password" autoComplete="current-password" placeholder="Current password" maxLength={128} className={inputCls} value={values.currentPassword} onChange={e => setValues({ ...values, currentPassword: e.target.value })} />
      <input aria-label="New password" data-testid="input-new-password" type="password" autoComplete="new-password" placeholder="New password (min 8 characters)" maxLength={128} className={inputCls} value={values.newPassword} onChange={e => setValues({ ...values, newPassword: e.target.value })} />
      <input aria-label="Confirm new password" data-testid="input-confirm-password" type="password" autoComplete="new-password" placeholder="Confirm new password" maxLength={128} className={inputCls} value={values.confirm} onChange={e => setValues({ ...values, confirm: e.target.value })} />
    {error && <p role="alert" data-testid="status-password-error" className="text-sm text-[hsl(11_80%_72%)]">{error}</p>}
    {change.isSuccess && !error && <p data-testid="status-password-success" className="text-sm text-accent">Password updated. Other sessions were signed out.</p>}
    <button data-testid="button-submit-password" type="submit" disabled={change.isPending} className={`${goldBtn} w-full`}>{change.isPending ? 'Updating…' : 'Update password'}</button>
  </form>;
}

function GiftForm({ currency }: { currency: string }) {
  const redeem = useRedeemGiftCode();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [credited, setCredited] = useState<number | null>(null);
  const [localError, setLocalError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(''); setCredited(null);
    const clean = code.trim();
    if (clean.length < 3 || clean.length > 40) return setLocalError('Gift codes are 3 to 40 characters.');
    redeem.mutate({ data: { code: clean } }, {
      onSuccess: result => { setCode(''); setCredited(result.amount); qc.invalidateQueries(); toast({ title: `Gift credited ${money(result.amount, currency)}`, description: `New balance ${money(result.wallet, currency)}.` }); },
    });
  };
  const error = localError || (redeem.error ? apiErrorMessage(redeem.error, 'This code could not be redeemed.') : '');
  return <form onSubmit={submit} className="space-y-3" data-testid="form-redeem-gift">
    <div className="flex gap-2">
      <input aria-label="Gift code" data-testid="input-gift-code" placeholder="Enter gift code" maxLength={40} autoCapitalize="characters" className={`${inputCls} min-w-0 font-mono uppercase tracking-wider`} value={code} onChange={e => setCode(e.target.value)} />
      <button data-testid="button-submit-gift" type="submit" disabled={redeem.isPending || !code.trim()} className={`${goldBtn} shrink-0`}>{redeem.isPending ? 'Checking…' : 'Redeem'}</button>
    </div>
    {error && <p role="alert" data-testid="status-gift-error" className="text-sm text-[hsl(11_80%_72%)]">{error}</p>}
    {credited !== null && <p data-testid="status-gift-success" className="text-sm text-accent">{money(credited, currency)} has been added to your wallet.</p>}
  </form>;
}

function TermsBody({ settings, adminUrl, adminHandle }: { settings?: Settings; adminUrl: string; adminHandle: string }) {
  const text = settings?.termsText?.trim();
  if (!text) return <div data-testid="status-terms-unpublished" className="text-sm leading-6 text-white/65">Grand Crown has not published its terms and conditions yet. For questions about how plans, payments and withdrawals work, <a href={adminUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">contact {adminHandle}</a>.</div>;
  return <div data-testid="text-terms" className="max-h-96 overflow-y-auto whitespace-pre-wrap pr-1 text-sm leading-6 text-white/80">{text}</div>;
}

function WalletSheet({ user, currency, withdrawals, loading, error, canWithdraw, onClose, onWithdraw, onDeposit }: { user: User; currency: string; withdrawals?: Withdrawal[]; loading: boolean; error: boolean; canWithdraw?: boolean; onClose: () => void; onWithdraw: () => void; onDeposit: () => void }) {
  const { toast } = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(user.referralCode);
      toast({ title: 'Referral code copied' });
    } catch {
      toast({ title: 'Could not copy', description: 'Select and copy the referral code shown here.', variant: 'destructive' });
    }
  };
  const statusCls = (s: string) => /approve|paid|complete/i.test(s) ? 'status-success' : /reject|fail/i.test(s) ? 'status-danger' : 'status-pending';
  return <div role="dialog" aria-modal="true" aria-label="Wallet details" className="fixed inset-0 z-40 grid place-items-end bg-[hsl(200_45%_5%/.6)] backdrop-blur-sm animate-fade sm:place-items-center sm:p-4" data-testid="modal-wallet">
    <div className={`${glass} max-h-[88dvh] w-full overflow-y-auto rounded-b-none bg-[hsl(200_35%_10%/.92)] p-6 sm:max-w-lg sm:rounded-[26px] sm:p-7`}>
      <div className="flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-white/50">Grand Crown wallet</div><h2 className="mt-1 font-display text-2xl font-semibold">Wallet details</h2></div><button data-testid="button-close-wallet" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><X className="size-4" /></button></div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4"><div className="text-xs text-white/60">Available balance</div><div className="mt-2 text-xl font-medium" data-testid="text-wallet-available">{money(user.wallet, currency)}</div></div>
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4"><div className="text-xs text-white/60">Total earned</div><div className="mt-2 text-xl font-medium" data-testid="text-wallet-earned">{money(user.totalEarned, currency)}</div></div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 p-4"><div><div className="text-xs text-white/60">Referral code</div><div className="mt-1 font-mono text-sm" data-testid="text-wallet-referral">{user.referralCode}</div></div><button data-testid="button-copy-referral-code" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><Copy className="size-3.5" />Copy</button></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-testid="button-wallet-deposit" onClick={onDeposit} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 text-sm font-semibold hover:border-accent"><ArrowDownToLine className="size-4" />Deposit</button>
        <button data-testid="button-wallet-withdraw" onClick={onWithdraw} disabled={canWithdraw === false} className={goldBtn}><ArrowUpToLine className="size-4" />Withdraw</button>
      </div>
      <p className="mt-2 text-[11px] text-white/50">Minimum withdrawal {money(7000, currency)}. Requests are reviewed and paid manually.</p>
      <h3 className="mt-6 text-sm font-semibold">Withdrawal history</h3>
      <div className="mt-3 space-y-2">
        {loading ? [0, 1].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/10" />)
          : error ? <p className="text-sm text-[hsl(11_80%_72%)]" data-testid="status-withdrawals-error">Withdrawal history could not load.</p>
          : !withdrawals?.length ? <p className="rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/60" data-testid="status-withdrawals-empty">No withdrawal requests yet.</p>
          : withdrawals.map(w => <div key={w.id} data-testid={`row-withdrawal-${w.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="min-w-0"><div className="font-mono text-sm">{money(w.amount, currency)}</div><div className="text-[11px] text-white/50">Net {money(w.netAmount, currency)} · {w.method} · {dateTime(w.createdAt)}</div></div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusCls(w.status)}`}>{w.status}</span>
          </div>)}
      </div>
    </div>
  </div>;
}
