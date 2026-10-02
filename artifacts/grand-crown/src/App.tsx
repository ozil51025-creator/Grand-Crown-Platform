import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  useClaimCheckin,
  useBanUser,
  useBuyProduct,
  useCreateAdminAccount,
  useCreditUser,
  useCreateProduct,
  useDebitUser,
  useDeleteProduct,
  useDeleteAdminAccount,
  useDeleteUser,
  useGetAdminActivity,
  useGetAdminAdmins,
  useGetAdminDashboard,
  getGetAdminDashboardQueryKey,
  getGetCurrentUserQueryKey,
  getGetPaymentQueryKey,
  useGetAdminPayments,
  useGetAdminProducts,
  useGetAdminReferrals,
  useGetAdminSettings,
  useGetAdminTransactions,
  useGetAdminUsers,
  useGetAdminWithdrawals,
  useGetCurrentUser,
  useGetDashboard,
  useGetPayment,
  useGetPayments,
  useGetProducts,
  useGetPurchases,
  useGetReferral,
  useGetSettings,
  useGetWithdrawals,
  useLoginAdmin,
  useLoginUser,
  useLogoutAdmin,
  useLogoutUser,
  useRegisterUser,
  useRequestWithdrawal,
  useReviewPayment,
  useReviewWithdrawal,
  useSubmitPayment,
  useUpdateAdminSettings,
  type Payment,
  type Product,
  type PublicSettings,
  type Settings,
  type SettingsInput,
  type User,
} from '@workspace/api-client-react';
import { Activity, ArrowDownToLine, ArrowUpRight, Ban, BarChart3, Bell, Check, ChevronRight, Clock3, Copy, Crown, Eye, Gift, LayoutDashboard, Link2, LockKeyhole, LogOut, Menu, MessageCircle, Minus, Package, Phone, Plus, Receipt, Settings2, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, UserRound, UserX, Users, Wallet, X, XCircle } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import { AuthLayout, AuthReveal } from '@/components/auth-layout';
import { LiquidBottomNav } from '@/components/liquid-bottom-nav';
import { AccountPage } from '@/components/account-page';
import { AdminGiftCodes } from '@/components/admin-gift-codes';
import { PlanCatalogue, planImage, assetUrl } from '@/components/plan-catalogue';

const queryClient = new QueryClient();

const money = (value = 0, currency = 'UGX') =>
  `${currency} ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const ugandaDateKey = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Kampala',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(value);

function toUgandaDateTimeInput(value: string | null) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === name)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

function fromUgandaDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 3, Number(minute))).toISOString();
}

const tone = (status = '') => {
  const value = status.toLowerCase();
  if (value.includes('approve') || value === 'completed' || value === 'paid') return 'success';
  if (value.includes('reject') || value === 'failed' || value === 'expired') return 'danger';
  return 'pending';
};

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-grand-crown">
      <div className={`${small ? 'size-9' : 'size-11'} relative grid place-items-center rounded-xl bg-accent text-primary shadow-[0_8px_20px_hsl(var(--accent)/.2)]`}>
        <Crown className="size-5" strokeWidth={2.2} />
        <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />
      </div>
      <div>
        <div className="font-display text-xl font-semibold leading-none tracking-tight text-sidebar-foreground">Grand Crown</div>
        {!small && <div className="mt-1 font-mono text-[9px] uppercase tracking-[.26em] text-sidebar-foreground/55">Hotel &amp; Suites</div>}
      </div>
    </div>
  );
}

function Button({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger' }) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_18px_hsl(var(--primary)/.12)]',
    ghost: 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
    outline: 'border border-border bg-card text-foreground hover:border-accent hover:bg-accent/10',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  return <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</span><input className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20" {...props} /></label>;
}

function AuthField({ label, icon: Icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: typeof Phone }) {
  return <label className="gc-auth-field"><span className="gc-auth-field-label">{label}</span><div className="gc-auth-input-wrap"><input className="gc-auth-input" {...props} /><Icon className="gc-auth-input-icon" size={15} aria-hidden="true" /></div></label>;
}

function StatusPill({ status }: { status?: string }) {
  const kind = tone(status);
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] status-${kind}`}><span className="size-1.5 rounded-full bg-current" />{status || 'pending'}</span>;
}

function Empty({ icon: Icon = Package, title, copy }: { icon?: typeof Package; title: string; copy: string }) {
  return <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center"><div className="mb-3 grid size-11 place-items-center rounded-2xl bg-secondary text-muted-foreground"><Icon className="size-5" /></div><h3 className="font-display text-lg font-semibold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy}</p></div>;
}

function Loading({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary/70" />)}</div>;
}

function QueryState({ loading, error, children, empty }: { loading?: boolean; error?: boolean; children: ReactNode; empty?: boolean }) {
  if (loading) return <Loading />;
  if (error) return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"><div className="flex items-center gap-2 font-semibold"><XCircle className="size-4" /> We couldn't load this view.</div><p className="mt-1 text-destructive/75">Check your connection and try again.</p></div>;
  if (empty) return <Empty title="Nothing here yet" copy="New activity will appear here as your Grand Crown journey grows." />;
  return <>{children}</>;
}

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const login = useLoginUser();
  const register = useRegisterUser();
  const memberSettings = useGetSettings();
  const { toast } = useToast();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const onSuccess = () => { queryClient.invalidateQueries(); toast({ title: mode === 'login' ? 'Welcome back' : 'Your account is ready', description: 'Opening your Grand Crown circle.' }); };
    if (mode === 'login') login.mutate({ data: { phone, password } }, { onSuccess });
    else register.mutate({ data: { phone, password, referralCode: referralCode || undefined } }, { onSuccess });
  };
  const pending = login.isPending || register.isPending;
  return <AuthLayout
    mode={mode}
    setMode={setMode}
    logo={<Logo />}
    logoSmall={<Logo small />}
    form={<form onSubmit={submit}>
      <AuthField label="Mobile number" icon={Phone} autoComplete="tel" data-testid="input-phone" type="tel" placeholder="07xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} required minLength={7} />
      <AuthField label="Password" icon={LockKeyhole} data-testid="input-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
      <AuthReveal show={mode === 'register'}><AuthField label={`Referral code${memberSettings.data?.requireReferralCode ? ' (required)' : ' (optional)'}`} icon={Link2} data-testid="input-referral-code" placeholder="e.g. GC-4L8P" value={referralCode} onChange={e => setReferralCode(e.target.value)} required={mode === 'register' && !!memberSettings.data?.requireReferralCode} /></AuthReveal>
      {!!(login.error || register.error) && <p data-testid="status-auth-error" role="alert" className="text-sm text-destructive">We couldn't verify those details. Please try again.</p>}
      <Button data-testid="button-submit-auth" type="submit" className="liquid-submit mt-2 min-h-12 w-full rounded-2xl" disabled={pending}>{pending ? 'Checking details…' : mode === 'login' ? 'Login' : 'Sign up'}<ArrowUpRight className="size-4" /></Button>
    </form>}
    toggle={<button type="button" data-testid="button-toggle-auth-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-6 w-full rounded-lg text-center text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent">{mode === 'login' ? "Don't have an account? " : 'Already have an account? '}<span className="font-bold text-primary">{mode === 'login' ? 'Sign up' : 'Login'}</span></button>}
  />;
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-40 grid place-items-center bg-primary/50 p-4 backdrop-blur-sm animate-fade"><div className={`max-h-[90dvh] w-full overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-md'}`}><div className="mb-6 flex items-start justify-between gap-4"><div><div className="mb-1 font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Grand Crown</div><h2 className="font-display text-2xl font-semibold">{title}</h2></div><button data-testid="button-close-modal" onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"><X className="size-4" /></button></div>{children}</div></div>;
}

function MemberShell({ active, setActive, onLogout, children, user }: { active: string; setActive: (value: string) => void; onLogout: () => void; children: ReactNode; user?: User }) {
  const [open, setOpen] = useState(false);
  const items = [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'products', label: 'Earning plans', icon: Target }, { id: 'purchases', label: 'My purchases', icon: Receipt }, { id: 'referrals', label: 'My circle', icon: Users }, { id: 'account', label: 'Account', icon: UserRound }];
  return <div className="grain min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col bg-sidebar p-6 text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex items-center justify-between"><Logo /><button data-testid="button-close-sidebar" onClick={() => setOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/60 lg:hidden"><X className="size-4" /></button></div><div className="mt-14"><div className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.22em] text-sidebar-foreground/40">Member space</div><nav className="space-y-1">{items.map(item => <button data-testid={`button-nav-${item.id}`} key={item.id} onClick={() => { setActive(item.id); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === item.id ? 'bg-sidebar-accent font-semibold text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}><item.icon className={`size-4 ${active === item.id ? 'text-accent' : ''}`} />{item.label}{active === item.id && <ChevronRight className="ml-auto size-4 text-accent" />}</button>)}</nav></div><div className="mt-auto border-t border-sidebar-border pt-5"><div className="mb-5 flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-accent font-display font-semibold text-primary">{user?.phone?.slice(-2) || 'GC'}</div><div className="min-w-0"><div className="truncate text-sm font-semibold">{user?.phone || 'Member'}</div><div className="font-mono text-[10px] text-sidebar-foreground/45">{user?.referralCode || 'Member circle'}</div></div></div><button data-testid="button-member-logout" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="size-4" />Sign out</button></div></aside>
    {open && <button data-testid="button-sidebar-overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-20 bg-primary/40 lg:hidden" />}
     <div className="lg:pl-72"><header className={`sticky top-0 z-10 flex h-20 items-center justify-between border-b px-5 backdrop-blur-xl sm:px-8 lg:px-12 ${active === 'overview' || active === 'purchases' ? 'gc-experience-header border-white/15 bg-[rgba(8,15,18,.48)]' : 'border-border/70 bg-background/90 backdrop-blur-md'}`}><div className="flex items-center gap-3"><div className="hidden text-sm text-muted-foreground sm:block">Member space <span className="mx-2 text-border">/</span> <span className="font-semibold text-foreground">{items.find(item => item.id === active)?.label}</span></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground lg:flex"><ShieldCheck className="size-3.5 text-accent-foreground" /> Secure member access</div><Button data-testid="button-header-deposit" onClick={() => setActive('products')} className="min-h-9 rounded-xl bg-accent px-3 text-xs text-primary hover:bg-accent/90"><ArrowDownToLine className="size-3.5" /><span>Deposit</span></Button><button data-testid="button-notifications" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"><Bell className="size-4" /></button></div></header><main className="relative z-[1] mx-auto max-w-[1440px] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:p-8 sm:pb-[calc(7rem+env(safe-area-inset-bottom))] lg:p-12 lg:pb-12">{children}</main></div>
    <LiquidBottomNav items={items} active={active} onSelect={id => { setActive(id); setOpen(false); }} />
  </div>;
}

function MemberDashboard() {
  const session = useGetCurrentUser();
  const [active, setActive] = useState('overview');
  const logout = useLogoutUser();
  const { toast } = useToast();
  const doLogout = () => logout.mutate(undefined, {
    onSuccess: async () => {
      await queryClient.cancelQueries();
      const sessionKey = getGetCurrentUserQueryKey();
      queryClient.removeQueries({ predicate: query => JSON.stringify(query.queryKey) !== JSON.stringify(sessionKey) });
      queryClient.setQueryData(sessionKey, { loggedIn: false, user: null });
      setActive('overview');
    },
    onError: () => toast({ title: 'Could not sign out', description: 'Check your connection and try again.', variant: 'destructive' }),
  });
  if (session.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="w-64"><Loading rows={4} /></div></div>;
  if (session.data && session.data.accessMode !== 'available') {
    return <AccessPage mode={session.data.accessMode} message={session.data.accessMessage} openingAt={session.data.openingAt} />;
  }
  if (!session.data?.loggedIn || !session.data.user) return <AuthPage />;
  return <MemberShell active={active} setActive={setActive} user={session.data.user} onLogout={doLogout}><MemberContent active={active} user={session.data.user} setActive={setActive} onLogout={doLogout} loggingOut={logout.isPending} /></MemberShell>;
}

function AccessPage({ mode, message, openingAt }: { mode: 'maintenance' | 'opening'; message: string; openingAt: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (mode !== 'opening') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mode]);
  const remaining = openingAt ? Math.max(0, Date.parse(openingAt) - now) : 0;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return <main className="grain grid min-h-[100dvh] place-items-center bg-primary p-5 text-primary-foreground">
    <section className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-card p-8 text-card-foreground shadow-2xl sm:p-10">
      <Logo />
      <div className="mt-10 font-mono text-[10px] uppercase tracking-[.2em] text-accent-foreground">{mode === 'maintenance' ? 'Temporarily unavailable' : 'Opening soon'}</div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{mode === 'maintenance' ? 'We’ll be back shortly.' : 'Grand Crown is preparing to open.'}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      {mode === 'opening' && openingAt && <div className="mt-7 rounded-2xl bg-secondary p-5">
        {remaining > 0 ? <div className="grid grid-cols-4 gap-2 text-center" aria-live="polite">{[['Days', days], ['Hours', hours], ['Minutes', minutes], ['Seconds', seconds]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-card px-2 py-3"><div className="font-mono text-2xl font-semibold">{String(value).padStart(2, '0')}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div></div>)}</div> : <div className="text-sm font-semibold">The opening time has arrived. Refresh this page to continue.</div>}
        <p className="mt-4 text-center text-xs text-muted-foreground">Opening {new Date(openingAt).toLocaleString('en-UG', { timeZone: 'Africa/Kampala', dateStyle: 'long', timeStyle: 'short' })} · Uganda time</p>
      </div>}
      {remaining === 0 && mode === 'opening' && <Button className="mt-6 w-full" onClick={() => window.location.reload()}>Refresh page</Button>}
    </section>
  </main>;
}

function MemberContent({ active, user, setActive, onLogout, loggingOut }: { active: string; user: User; setActive: (value: string) => void; onLogout: () => void; loggingOut: boolean }) {
  const dashboard = useGetDashboard();
  const products = useGetProducts();
  const purchases = useGetPurchases();
  const payments = useGetPayments();
  const referrals = useGetReferral();
  const withdrawals = useGetWithdrawals();
  const settings = useGetSettings();
  const checkin = useClaimCheckin();
  const requestWithdrawal = useRequestWithdrawal();
  const submitPayment = useSubmitPayment();
  const buyProduct = useBuyProduct();
  const { toast } = useToast();
  const [modal, setModal] = useState<'deposit' | 'payment-status' | 'purchase' | 'withdrawal' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<string | null>(null);
  const [payment, setPayment] = useState({ method: 'MTN Mobile Money', payerPhone: user.phone, payerReference: '' });
  const [depositAmount, setDepositAmount] = useState('19000');
  const [withdrawal, setWithdrawal] = useState({ amount: '', method: 'MTN Mobile Money', phone: user.phone });
  const currency = settings.data?.currency || 'UGX';
  const userData = dashboard.data?.user || user;
  const primaryPlan = active === 'overview'
    ? dashboard.data?.purchases?.find((purchase: any) => purchase.status === 'active')
    : purchases.data?.[0];
  const experiencePhoto = active === 'overview' || active === 'purchases'
    ? planImage(primaryPlan?.productName || 'Presidential Suite')
    : undefined;
  const openPurchase = (product: Product) => { setSelectedProduct(product); setModal('purchase'); };
  const openDeposit = (amount?: number) => {
    const minimum = settings.data?.minDeposit ?? 19000;
    setDepositAmount(String(Math.max(minimum, amount ?? minimum)));
    setPayment({ method: 'MTN Mobile Money', payerPhone: user.phone, payerReference: '' });
    setModal('deposit');
  };
  const openPaymentStatus = (paymentId: string) => { setSelectedPaymentId(paymentId); setModal('payment-status'); };
  const submitDepositForm = (event: FormEvent) => {
    event.preventDefault();
    submitPayment.mutate({ data: { amount: Number(depositAmount), ...payment } }, {
      onSuccess: result => {
        queryClient.invalidateQueries();
        if (result.paymentId) {
          setSelectedPaymentId(result.paymentId);
          setModal('payment-status');
          toast({ title: 'Transfer submitted', description: 'Your deposit will be credited to product funds after an administrator verifies the transfer.' });
        } else {
          setModal(null);
        }
      },
    });
  };
  const submitPurchase = () => {
    if (!selectedProduct) return;
    buyProduct.mutate({ data: { productId: selectedProduct.id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setModal(null);
        setSelectedProduct(null);
        toast({ title: 'Product purchased', description: 'Your product funds were used. Earnings remain in your withdrawable wallet.' });
      },
    });
  };
  const submitWithdrawalForm = (event: FormEvent) => { event.preventDefault(); requestWithdrawal.mutate({ data: { amount: Number(withdrawal.amount), method: withdrawal.method, phone: withdrawal.phone } }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); toast({ title: 'Withdrawal requested', description: 'Your request is now waiting for administrator review.' }); } }); };
  const claim = () => checkin.mutate(undefined, { onSuccess: result => { queryClient.invalidateQueries(); toast({ title: `Check-in credited ${money(result.reward, currency)}`, description: 'Your daily rhythm is intact.' }); } });
  const announcementKey = `${settings.data?.announcementTitle || ''}:${settings.data?.announcementMessage || ''}`;
  useEffect(() => {
    if (!settings.data?.announcementEnabled || !announcementKey) return;
    if (sessionStorage.getItem(`gc-announcement:${announcementKey}`) === 'dismissed') {
      setDismissedAnnouncement(announcementKey);
    } else {
      setDismissedAnnouncement(null);
    }
  }, [announcementKey, settings.data?.announcementEnabled]);
  const dismissAnnouncement = () => {
    sessionStorage.setItem(`gc-announcement:${announcementKey}`, 'dismissed');
    setDismissedAnnouncement(announcementKey);
  };
  let view: ReactNode;
  if (active === 'products') view = <ProductsView products={products.data} loading={products.isLoading} error={!!products.error} onBuy={openPurchase} currency={currency} payments={payments.data} onCheckPayment={openPaymentStatus} depositBalance={userData.depositBalance} onDeposit={() => openDeposit()} />;
  else if (active === 'purchases') view = <PurchasesView purchases={purchases.data} loading={purchases.isLoading} error={!!purchases.error} currency={currency} onBrowse={() => setActive('products')} />;
  else if (active === 'referrals') view = <ReferralView referrals={referrals.data} loading={referrals.isLoading} error={!!referrals.error} currency={currency} />;
  else if (active === 'account') view = <AccountPage user={userData} settings={settings.data} withdrawals={withdrawals.data} withdrawalsLoading={withdrawals.isLoading} withdrawalsError={!!withdrawals.error} currency={currency} canWithdraw={dashboard.data?.canWithdraw} onDeposit={() => setActive('products')} onWithdraw={() => setModal('withdrawal')} onLogout={onLogout} loggingOut={loggingOut} />;
  else view = <OverviewView dashboard={dashboard.data} loading={dashboard.isLoading} error={!!dashboard.error} currency={currency} settings={settings.data} onCheckin={claim} checkingIn={checkin.isPending} onWithdraw={() => setModal('withdrawal')} onBuy={() => setActive('products')} />;
  return <>{experiencePhoto && <div aria-hidden className="gc-experience-backdrop pointer-events-none fixed inset-0 z-0 lg:left-72"><img src={experiencePhoto} alt="" className="size-full object-cover object-center" /></div>}<div className={experiencePhoto ? 'dark gc-experience-content' : ''}>{view}</div>{modal === 'deposit' && <DepositModal amount={depositAmount} setAmount={setDepositAmount} settings={settings.data} values={payment} setValues={setPayment} onClose={() => setModal(null)} onSubmit={submitDepositForm} pending={submitPayment.isPending} error={!!submitPayment.error} />}{modal === 'payment-status' && selectedPaymentId && <PaymentStatusModal paymentId={selectedPaymentId} onClose={() => { setModal(null); queryClient.invalidateQueries(); }} />}{modal === 'purchase' && selectedProduct && <PurchaseModal product={selectedProduct} depositBalance={userData.depositBalance} currency={currency} onClose={() => setModal(null)} onPurchase={submitPurchase} onDeposit={amount => openDeposit(amount)} pending={buyProduct.isPending} error={!!buyProduct.error} />}{modal === 'withdrawal' && <WithdrawModal balance={userData.wallet} currency={currency} settings={settings.data} values={withdrawal} setValues={setWithdrawal} onClose={() => setModal(null)} onSubmit={submitWithdrawalForm} pending={requestWithdrawal.isPending} error={!!requestWithdrawal.error} />}{settings.data?.announcementEnabled && dismissedAnnouncement !== announcementKey && <Modal title={settings.data.announcementTitle || 'Grand Crown update'} onClose={dismissAnnouncement}><div className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{settings.data.announcementMessage || 'There are no additional details yet.'}</div><Button className="mt-6 w-full" onClick={dismissAnnouncement}>Continue</Button></Modal>}</>;
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: ReactNode }) {
  return <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.22em] text-accent-foreground">{eyebrow}</div><h1 className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{copy}</p></div>{action}</div>;
}

function OverviewView({ dashboard, loading, error, currency, settings, onCheckin, checkingIn, onWithdraw, onBuy }: { dashboard?: any; loading: boolean; error: boolean; currency: string; settings?: PublicSettings; onCheckin: () => void; checkingIn: boolean; onWithdraw: () => void; onBuy: () => void }) {
  const user = dashboard?.user;
  const activePlan = dashboard?.purchases?.find((purchase: any) => purchase.status === 'active');
  const experienceImage = planImage(activePlan?.productName || 'Presidential Suite');
  const canCheckin = !user?.lastCheckin || user.lastCheckin !== ugandaDateKey();
  const displayTime = (value?: string) => {
    if (!value) return '—';
    const [rawHour, minute] = value.split(':').map(Number);
    const suffix = rawHour >= 12 ? 'pm' : 'am';
    const hour = rawHour % 12 || 12;
    return `${hour}:${String(minute).padStart(2, '0')}${suffix}`;
  };
  return <div className="animate-rise"><PageHeading eyebrow="Member overview" title={`Good morning${user?.phone ? `, ${user.phone.slice(-4)}` : ''}.`} copy="Your withdrawable earnings and product funds are kept in separate balances." action={<Button data-testid="button-browse-plans" onClick={onBuy}><Package className="size-4" /> Browse products</Button>} />
    <section data-testid="panel-overview-description" className="mb-5 rounded-3xl border border-white/25 bg-slate-950/35 p-5 text-white shadow-xl backdrop-blur-lg sm:p-7">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-amber-200">👑 GRAND CROWN HOTEL &amp; SUITES</div>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Welcome to Grand Crown — luxury stays with exciting rewards!</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['🎁 Welcome Bonus', money(settings?.welcomeBonus ?? 1000, currency)],
          ['📅 Daily Check-in', money(settings?.checkinBonus ?? 50, currency)],
          ['💰 Referral Bonus', `${settings?.l1CommissionPercent ?? 10}% Level 1`],
          ['💳 Minimum Top-up', money(settings?.minDeposit ?? 19000, currency)],
          ['💸 Minimum Withdrawal', money(settings?.minWithdrawal ?? 3000, currency)],
          ['🔻 Withdrawal Fee', `${settings?.withdrawalFeePercent ?? 15}%`],
          ['🕙 Withdrawal', `${displayTime(settings?.withdrawalStartTime ?? '10:00')}–${displayTime(settings?.withdrawalEndTime ?? '17:00')} EAT`],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4">
          <div className="text-xs font-medium text-white/70">{label}</div>
          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
        </div>)}
      </div>
      <p className="mt-5 text-sm leading-6 text-white/85">🏨 Offers from UGX 19,000 to UGX 12,000,000, including Garden View, Mountain View, Ocean View, Executive, Deluxe, Golden, Diamond, Royal &amp; Presidential Suites.</p>
    </section>
    <QueryState loading={loading} error={error}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Metric label="Withdrawable balance" value={money(user?.wallet, currency)} icon={Wallet} accent /><Metric label="Product funds" value={money(user?.depositBalance, currency)} icon={ArrowDownToLine} /><Metric label="Total earned" value={money(user?.totalEarned, currency)} icon={TrendingUp} /><Metric label="Active plans" value={String(dashboard?.purchases?.filter((p: any) => p.status === 'active' || p.status === 'approved').length || 0)} icon={Target} /><Metric label="Last check-in" value={user?.lastCheckin ? shortDate(user.lastCheckin) : 'Not yet'} icon={Clock3} /></div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="gc-overview-hero relative isolate overflow-hidden rounded-3xl border border-white/20 p-7 text-white shadow-xl sm:p-9" data-testid="panel-overview-experience"><img src={experienceImage} alt={`${activePlan?.productName || 'Presidential Suite'} illustrative room`} loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" /><div className="gc-overview-hero-shade absolute inset-0 -z-10" /><div className="absolute -right-14 -top-24 size-72 rounded-full border border-white/20" /><div className="absolute right-8 top-8 size-28 rounded-full border border-white/25" /><div className="relative"><div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-accent"><Sparkles className="size-4" /> Daily crown ritual</div><h2 className="max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl">Small, consistent moves compound.</h2><p className="mt-3 max-w-md text-sm leading-6 text-white/80">Check in each day to keep your account active and claim your daily reward.</p><Button data-testid="button-claim-checkin" onClick={onCheckin} disabled={!canCheckin || checkingIn} className="mt-7 bg-accent text-primary hover:bg-accent/90">{checkingIn ? 'Crediting…' : canCheckin ? 'Claim today’s reward' : 'Checked in today'}<Check className="size-4" /></Button></div></div><div className="rounded-3xl border border-border bg-card p-7"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Withdrawable</div><div className="mt-3 font-display text-3xl font-semibold">{money(user?.wallet, currency)}</div></div><div className="grid size-11 place-items-center rounded-2xl bg-accent/20 text-accent-foreground"><ArrowDownToLine className="size-5" /></div></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Minimum withdrawal is {money(settings?.minWithdrawal ?? 3000, currency)}. A {settings?.withdrawalFeePercent ?? 15}% fee applies to every request. Requests are reviewed and paid manually.</p><Button data-testid="button-request-withdrawal" onClick={onWithdraw} variant="outline" className="mt-6 w-full" disabled={!dashboard?.canWithdraw}>Request withdrawal <ArrowUpRight className="size-4" /></Button></div></div>
      <div className="mt-5 rounded-3xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-2xl font-semibold">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">The latest movement across your account.</p></div><Activity className="size-5 text-accent-foreground" /></div><ActivityTable transactions={dashboard?.transactions || []} currency={currency} /></div>
    </QueryState></div>;
}

function Metric({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Wallet; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-accent/50 bg-accent/10' : 'border-border bg-card'}`}><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Icon className={`size-4 ${accent ? 'text-accent-foreground' : 'text-muted-foreground'}`} /></div><div className="mt-5 font-display text-2xl font-semibold tracking-tight">{value}</div></div>;
}

function ProductsView({ payments, onCheckPayment, depositBalance, onDeposit, ...catalogueProps }: { products?: Product[]; loading: boolean; error: boolean; onBuy: (product: Product) => void; currency: string; payments?: Payment[]; onCheckPayment: (id: string) => void; depositBalance: number; onDeposit: () => void }) {
  return <div>
    <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div><div className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Product funds · not withdrawable</div><div className="mt-1 font-display text-2xl font-semibold">{money(depositBalance, catalogueProps.currency)}</div><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Manually verified mobile-money deposits appear here. Use them to buy products; they are separate from your withdrawable earnings.</p></div>
      <Button data-testid="button-open-deposit" onClick={onDeposit} className="shrink-0"><ArrowDownToLine className="size-4" /> Deposit funds</Button>
    </div>
    <PlanCatalogue {...catalogueProps} />
    {!!payments?.length && <section className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-7" aria-labelledby="payment-history-title">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="payment-history-title" className="font-display text-2xl font-semibold">Deposit activity</h2><p className="mt-1 text-sm text-muted-foreground">Product funds are credited only after an administrator verifies the transfer.</p></div><Receipt className="size-5 text-accent-foreground" /></div>
      <div className="divide-y divide-border">{payments.slice(0, 8).map(item => <div key={item.id} data-testid={`row-member-payment-${item.id}`} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold">Mobile-money deposit <StatusPill status={item.status} /></div><div className="mt-1 text-xs text-muted-foreground">{money(item.amount, catalogueProps.currency)} · {item.method} · {shortDate(item.createdAt)}</div>{item.payerReference && <div className="mt-1 text-xs text-muted-foreground">Transfer reference: <span className="font-mono text-foreground">{item.payerReference}</span></div>}</div>{item.status === 'pending' && <Button data-testid={`button-check-payment-${item.id}`} variant="outline" className="min-h-9 self-start px-3 text-xs sm:self-auto" onClick={() => onCheckPayment(item.id)}>View review status <ArrowUpRight className="size-3.5" /></Button>}</div>)}</div>
    </section>}
  </div>;
}

function PaymentStatusModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const payment = useGetPayment(paymentId, {
    query: {
      queryKey: getGetPaymentQueryKey(paymentId),
      refetchInterval: query => query.state.data?.status === 'pending' ? 3500 : false,
      refetchOnWindowFocus: true,
    },
  });
  const { toast } = useToast();
  useEffect(() => {
    if (payment.data?.status === 'completed' || payment.data?.status === 'approved') {
      queryClient.invalidateQueries();
      toast({ title: 'Deposit confirmed', description: 'Purchase-only product funds have been added to your account.' });
    }
  }, [payment.data?.status]);
  const status = payment.data?.status;
  const message = status === 'completed' || status === 'approved'
    ? 'An administrator verified your transfer. The funds are now in your product balance and can be used to buy products.'
    : status === 'rejected'
      ? 'An administrator could not verify this transfer. No funds were added. Contact support if you believe this is incorrect.'
      : status === 'failed' || status === 'expired'
        ? 'This deposit request was not completed. No funds were added.'
        : 'Your transfer reference is waiting for administrator review. Product funds are credited only after verification.';
  return <Modal title={status === 'completed' || status === 'approved' ? 'Deposit confirmed' : status === 'rejected' || status === 'failed' || status === 'expired' ? 'Deposit not approved' : 'Waiting for review'} onClose={onClose}>
    <div className="rounded-2xl bg-secondary p-4">
      <div className="flex items-center justify-between gap-3"><span className="font-semibold">Mobile-money deposit</span><StatusPill status={status || (payment.isError ? 'status unavailable' : 'pending')} /></div>
      {payment.data && <div className="mt-2 font-mono text-sm">{money(payment.data.amount, 'UGX')}</div>}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{payment.isError ? 'We could not load this deposit status right now. Please try again later.' : message}</p>
    </div>
    {status === 'pending' && <p className="mt-4 text-xs leading-5 text-muted-foreground" aria-live="polite">Status refreshes automatically. Do not submit the same transfer reference again.</p>}
    <Button data-testid="button-close-payment-status" className="mt-6 w-full" variant="outline" onClick={onClose}>Close</Button>
  </Modal>;
}

function PurchasesView({ purchases, loading, error, currency, onBrowse }: { purchases?: any[]; loading: boolean; error: boolean; currency: string; onBrowse: () => void }) {
  return <div className="animate-rise"><PageHeading eyebrow="Portfolio" title="My purchases." copy="Every plan you have started, with its current verification and earning status." /><QueryState loading={loading} error={error}><div className="space-y-4" data-testid="list-purchases">{purchases?.length ? purchases.map(purchase => <article key={purchase.id} data-testid={`row-purchase-${purchase.id}`} className="grid gap-4 rounded-3xl border border-white/20 bg-card/80 p-4 shadow-lg backdrop-blur-xl sm:grid-cols-[130px_1.3fr_.8fr_.8fr_.8fr] sm:items-center sm:gap-5 sm:p-5"><div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/15 sm:aspect-square"><img src={planImage(purchase.productName)} alt={`Illustrative ${purchase.productName} interior`} loading="lazy" className="size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 to-transparent" /><span className="absolute bottom-2 left-2 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-white backdrop-blur-sm">Grand Crown</span></div><div><div className="font-display text-xl font-semibold">{purchase.productName}</div><div className="mt-1 text-xs text-muted-foreground">Started {shortDate(purchase.purchasedAt)}</div></div><div><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Amount</div><div className="mt-1 font-mono text-sm font-semibold">{money(purchase.amount, currency)}</div></div><div><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Earned</div><div className="mt-1 font-mono text-sm font-semibold">{money(purchase.earningsCredited, currency)}</div></div><div><div className="mb-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Status</div><StatusPill status={purchase.status} /></div></article>) : <div className="relative isolate flex min-h-72 flex-col items-start justify-end overflow-hidden rounded-3xl border border-white/20 p-6 text-white shadow-xl sm:min-h-80 sm:p-9" data-testid="empty-purchases"><img src={assetUrl('presidential-suite.jpg')} alt="Illustrative Presidential Suite interior" className="absolute inset-0 -z-20 size-full object-cover" /><div className="gc-overview-hero-shade absolute inset-0 -z-10" /><div className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Grand Crown collection</div><h2 className="mt-2 font-display text-3xl font-semibold">Your next experience starts here.</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/75">Once you start a plan, its room image, amount and status will appear here.</p><Button data-testid="button-browse-plans-empty" onClick={onBrowse} className="mt-5 bg-accent text-primary hover:bg-accent/90">Browse plans <ArrowUpRight className="size-4" /></Button></div>}</div></QueryState></div>;
}

function ReferralView({ referrals, loading, error, currency }: { referrals?: any; loading: boolean; error: boolean; currency: string }) {
  const { toast } = useToast();
  const members = referrals?.members || [];
  const copy = () => { if (referrals?.link) navigator.clipboard?.writeText(referrals.link); toast({ title: 'Referral link copied', description: 'Share it with someone who values a steadier pace.' }); };
  return <div className="animate-rise">
    <PageHeading eyebrow="Your circle" title="Grow together." copy="Earn a 10% Level 1 commission when a direct referral purchases a product." />
    <QueryState loading={loading} error={error}>
      <div className="grid gap-5 md:grid-cols-2">
        <Metric label="Direct referrals · Level 1" value={String(referrals?.directReferrals || 0)} icon={UserRound} />
        <Metric label="Referral commissions" value={money((referrals?.commissions || []).reduce((sum: number, item: any) => sum + item.amount, 0), currency)} icon={Gift} accent />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl bg-primary p-7 text-primary-foreground">
          <div className="flex items-center gap-2 text-accent"><Link2 className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[.18em]">Your invite link</span></div>
          <div className="mt-6 break-all font-mono text-sm text-primary-foreground/80">{referrals?.link || 'Your referral link will appear here.'}</div>
          <Button data-testid="button-copy-referral" onClick={copy} className="mt-7 bg-accent text-primary hover:bg-accent/90"><Copy className="size-4" /> Copy link</Button>
        </div>
        <div className="rounded-3xl border border-border bg-card p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-semibold">Direct referrals</h2><p className="mt-1 text-sm text-muted-foreground">People who joined with your invite link.</p></div><Users className="size-5 text-accent-foreground" /></div>
          <div className="mt-5 space-y-3">{members.length ? members.slice(0, 10).map((member: any) => <div key={member.id} data-testid={`row-referral-${member.id}`} className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-accent/20 font-mono text-xs text-accent-foreground">{member.phone.slice(-2)}</div><div><div className="text-sm font-semibold">{member.phone}</div><div className="text-xs text-muted-foreground">Level 1 · {shortDate(member.createdAt)}</div></div></div><ChevronRight className="size-4 text-muted-foreground" /></div>) : <Empty icon={Users} title="No direct referrals yet" copy="Share your invite link to earn Level 1 commissions." />}</div>
        </div>
      </div>
    </QueryState>
  </div>;
}

function ActivityTable({ transactions, currency }: { transactions: any[]; currency: string }) {
  if (!transactions.length) return <Empty icon={Activity} title="No transactions yet" copy="Your plan and wallet activity will be recorded here." />;
  return <div className="space-y-2">{transactions.slice(0, 5).map(item => <div key={item.id} data-testid={`row-transaction-${item.id}`} className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-secondary/60"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-secondary"><ArrowUpRight className="size-4 text-accent-foreground" /></div><div><div className="text-sm font-semibold capitalize">{item.type.replaceAll('_', ' ')}</div><div className="text-xs text-muted-foreground">{shortDate(item.createdAt)}</div></div></div><div className="font-mono text-sm font-semibold">{money(item.amount, currency)}</div></div>)}</div>;
}

function DepositModal({ amount, setAmount, settings, values, setValues, onClose, onSubmit, pending, error }: { amount: string; setAmount: (value: string) => void; settings?: PublicSettings; values: { method: string; payerPhone: string; payerReference: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error?: boolean }) {
  const destinationNumber = values.method === 'MTN Mobile Money' ? settings?.mtnNumber : settings?.airtelNumber;
  return <Modal title="Deposit product funds" onClose={onClose} wide>
    <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
      <div className="flex items-center justify-between gap-4"><span className="text-sm text-primary-foreground/65">Deposit amount</span><span className="font-display text-2xl font-semibold">{money(Number(amount) || 0, settings?.currency)}</span></div>
      <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-primary-foreground/75"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />Send money manually to the account below. Product funds are credited only after an administrator verifies the transfer.</div>
    </div>
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field label={`Deposit amount · minimum ${money(settings?.minDeposit ?? 19000, settings?.currency)}`} data-testid="input-deposit-amount" type="number" inputMode="numeric" min={settings?.minDeposit ?? 19000} step="1" value={amount} onChange={event => setAmount(event.target.value)} required />
      <label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Mobile-money network</span><select data-testid="select-payment-method" className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:border-accent" value={values.method} onChange={event => setValues({ ...values, method: event.target.value })}><option>MTN Mobile Money</option><option>Airtel Money</option></select></label>
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-4" data-testid="panel-manual-payment-details">
        <div className="text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">Send to this account</div>
        <div className="mt-2 font-mono text-lg font-semibold" data-testid="text-deposit-destination-number">{destinationNumber || 'Contact support for the current number'}</div>
        <div className="mt-1 text-sm text-muted-foreground">Registered name: <span className="font-semibold text-foreground">{settings?.payeeName || 'Nakaliiba Martha'}</span></div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Transfer the exact amount shown above to this number on the selected network before submitting your receipt reference.</p>
      </div>
      <Field label="Number you sent the money from" data-testid="input-payer-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07xx xxx xxx or +256..." value={values.payerPhone} onChange={event => setValues({ ...values, payerPhone: event.target.value })} required />
      <Field label="Mobile-money transaction reference" data-testid="input-payer-reference" autoComplete="off" maxLength={80} value={values.payerReference} onChange={event => setValues({ ...values, payerReference: event.target.value })} required />
      {error && <p role="alert" className="text-sm text-destructive">Could not submit this transfer. Check the details and make sure the reference has not already been used.</p>}
      <Button data-testid="button-submit-payment" type="submit" className="w-full" disabled={pending}>{pending ? 'Submitting…' : 'Submit transfer for review'}<ArrowUpRight className="size-4" /></Button>
    </form>
  </Modal>;
}

function PurchaseModal({ product, depositBalance, currency, onClose, onPurchase, onDeposit, pending, error }: { product: Product; depositBalance: number; currency: string; onClose: () => void; onPurchase: () => void; onDeposit: (amount: number) => void; pending: boolean; error?: boolean }) {
  const shortfall = Math.max(0, product.price - depositBalance);
  return <Modal title={`Buy ${product.name}`} onClose={onClose}>
    <div className="rounded-2xl bg-secondary p-4 text-sm">
      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Product price</span><span className="font-mono font-semibold">{money(product.price, currency)}</span></div>
      <div className="mt-2 flex justify-between gap-3"><span className="text-muted-foreground">Product funds available</span><span className="font-mono font-semibold">{money(depositBalance, currency)}</span></div>
      <div className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Product funds are purchase-only. This purchase will not use your withdrawable earnings balance.</div>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-destructive">We couldn't complete the purchase. Refresh your balance and try again.</p>}
    {shortfall > 0
      ? <><p className="mt-4 text-sm text-muted-foreground">Deposit {money(shortfall, currency)} more to buy this product.</p><Button data-testid="button-deposit-shortfall" className="mt-5 w-full" onClick={() => onDeposit(shortfall)}>Deposit funds <ArrowDownToLine className="size-4" /></Button></>
      : <Button data-testid="button-confirm-product-purchase" className="mt-5 w-full" onClick={onPurchase} disabled={pending}>{pending ? 'Completing purchase…' : 'Buy with product funds'}<ArrowUpRight className="size-4" /></Button>}
  </Modal>;
}

function WithdrawModal({ balance, currency, settings, values, setValues, onClose, onSubmit, pending, error }: { balance: number; currency: string; settings?: PublicSettings; values: { amount: string; method: string; phone: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error?: boolean }) {
  const minimum = settings?.minWithdrawal ?? 3000;
  const feePercent = settings?.withdrawalFeePercent ?? 15;
  const requestedAmount = Number(values.amount) || 0;
  const fee = Math.round(requestedAmount * feePercent / 100);
  return <Modal title="Request a withdrawal" onClose={onClose}><div className="rounded-2xl bg-secondary p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Withdrawable balance</span><span className="font-mono font-semibold">{money(balance, currency)}</span></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">Minimum request</span><span className="font-mono font-semibold">{money(minimum, currency)}</span></div><div className="mt-3 border-t border-border pt-3"><div className="flex justify-between"><span className="text-muted-foreground">Fee · {feePercent}%</span><span className="font-mono font-semibold">{money(fee, currency)}</span></div><div className="mt-1 flex justify-between"><span className="text-muted-foreground">Estimated payout</span><span className="font-mono font-semibold">{money(Math.max(0, requestedAmount - fee), currency)}</span></div></div></div><form onSubmit={onSubmit} className="mt-6 space-y-4"><Field label="Amount" data-testid="input-withdrawal-amount" type="number" min={minimum} max={balance} placeholder={String(minimum)} value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })} required /><label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Payment method</span><select data-testid="select-withdrawal-method" className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none" value={values.method} onChange={e => setValues({ ...values, method: e.target.value })}><option>MTN Mobile Money</option><option>Airtel Money</option></select></label><Field label="Mobile-money number" data-testid="input-withdrawal-phone" type="tel" value={values.phone} onChange={e => setValues({ ...values, phone: e.target.value })} required /><p className="text-xs leading-5 text-muted-foreground">Only earnings in your withdrawable balance can be requested. A {feePercent}% fee is deducted from every request. Withdrawals are reviewed and paid manually.</p>{error && <p className="text-sm text-destructive">We could not create that request. Check the amount and try again.</p>}<Button data-testid="button-submit-withdrawal" type="submit" className="w-full" disabled={pending}>{pending ? 'Submitting…' : 'Send withdrawal request'}</Button></form></Modal>;
}

function AdminShell({ active, setActive, children, onLogout }: { active: string; setActive: (value: string) => void; children: ReactNode; onLogout: () => void }) {
  const items = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'deposits', label: 'Payments', icon: ArrowDownToLine },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'gift-codes', label: 'Gift Codes', icon: Gift },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'referrals', label: 'Referrals', icon: Gift },
    { id: 'settings', label: 'Settings', icon: Settings2 },
    { id: 'countries', label: 'Countries', icon: Target },
    { id: 'admins', label: 'Admins', icon: ShieldCheck },
    { id: 'activity', label: 'Activity Log', icon: Activity },
  ];
  return <div className="admin-surface min-h-[100dvh] bg-[#f4f7fb] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[76px] max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#f07a16] text-white shadow-sm"><Crown className="size-5" /></div>
          <div><div className="text-[19px] font-extrabold leading-none tracking-tight">Grand Crown</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Admin</div></div>
        </div>
        <div className="flex items-center gap-2">
          <select aria-label="Language" className="hidden h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none sm:block"><option>English</option></select>
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#eef7f1] px-3 text-sm font-bold text-slate-700"><span className="size-2 rounded-full bg-emerald-500" />Live</span>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#edf1f7] px-3 text-sm font-bold text-slate-700 transition hover:bg-[#e2e8f1]"><Bell className="size-4" /><span className="hidden sm:inline">Notify</span></button>
          <button data-testid="button-admin-logout" onClick={onLogout} className="grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Sign out"><LogOut className="size-4" /></button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1500px] flex-wrap gap-1.5 border-t border-slate-100 px-4 py-3 sm:gap-2 sm:px-6 lg:px-8">
       {items.map(item => <button data-testid={`button-admin-nav-${item.id}`} key={item.id} type="button" onClick={() => setActive(item.id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold transition sm:px-4 ${active === item.id ? 'bg-[#ef7815] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><item.icon className="size-3.5" />{item.label}</button>)}
      </nav>
    </header>
    <main className="mx-auto max-w-[1500px] px-0 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
  </div>;
}

function AdminApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const session = useGetAdminDashboard({ query: { enabled: !authenticated, retry: false, queryKey: getGetAdminDashboardQueryKey() } });
  const login = useLoginAdmin();
  const logout = useLogoutAdmin();
  useEffect(() => {
    if (session.data) setAuthenticated(true);
  }, [session.data]);
  if (!authenticated) return <AdminLogin onSuccess={() => setAuthenticated(true)} login={login} />;
  return <AdminConsole onLogout={() => logout.mutate(undefined, { onSuccess: () => setAuthenticated(false) })} />;
}

function AdminLogin({ onSuccess, login }: { onSuccess: () => void; login: ReturnType<typeof useLoginAdmin> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useLocation();
  const submit = (event: FormEvent) => { event.preventDefault(); login.mutate({ data: { username, password } }, { onSuccess: () => onSuccess() }); };
  return <main className="grain grid min-h-[100dvh] place-items-center bg-primary p-5"><div className="absolute left-8 top-8"><Logo /></div><div className="w-full max-w-md animate-rise rounded-3xl border border-sidebar-border bg-card p-7 shadow-2xl sm:p-9"><div className="mb-8"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-primary"><ShieldCheck className="size-6" /></div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Restricted console</div><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Admin sign in.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Review member activity and provider-confirmed payment status.</p></div><form onSubmit={submit} className="space-y-4"><Field label="Username" autoComplete="username" data-testid="input-console-username" value={username} onChange={e => setUsername(e.target.value)} required /><Field label="Password" autoComplete="current-password" data-testid="input-console-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />{!!login.error && <p data-testid="status-admin-error" className="text-sm text-destructive">Those credentials did not match.</p>}<Button data-testid="button-console-login" className="mt-2 w-full" disabled={login.isPending}>{login.isPending ? 'Verifying…' : 'Enter console'}<ArrowUpRight className="size-4" /></Button></form><button data-testid="button-back-to-member" onClick={() => setLocation('/')} className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronRight className="size-3 rotate-180" /> Back to member sign in</button></div></main>;
}

function AdminConsole({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState('overview');
  return <AdminShell active={active} setActive={setActive} onLogout={onLogout}><AdminContent active={active} setActive={setActive} /></AdminShell>;
}

function AdminContent({ active, setActive }: { active: string; setActive: (value: string) => void }) {
  const dashboard = useGetAdminDashboard();
  const users = useGetAdminUsers();
  const payments = useGetAdminPayments();
  const withdrawals = useGetAdminWithdrawals();
  const products = useGetAdminProducts();
  const transactions = useGetAdminTransactions();
  const referrals = useGetAdminReferrals();
  const activity = useGetAdminActivity();
  const settings = useGetAdminSettings();
  const adminAccounts = useGetAdminAdmins();
  const reviewPayment = useReviewPayment();
  const reviewWithdrawal = useReviewWithdrawal();
  const creditUser = useCreditUser();
  const debitUser = useDebitUser();
  const banUser = useBanUser();
  const deleteUser = useDeleteUser();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateSettings = useUpdateAdminSettings();
  const createAdmin = useCreateAdminAccount();
  const deleteAdmin = useDeleteAdminAccount();
  const [modal, setModal] = useState<'product' | 'credit' | 'debit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userAmount, setUserAmount] = useState('');
  const [userNote, setUserNote] = useState('');
  const [product, setProduct] = useState({ name: '', price: '', daily: '', total: '', days: '' });
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const { toast } = useToast();
  const approveWithdrawal = (id: string, action: 'approve' | 'reject') => reviewWithdrawal.mutate({ id, data: { action } }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: `Withdrawal ${action}d`, description: 'The withdrawal queue has been updated.' }); } });
  const reviewDeposit = (id: string, action: 'approve' | 'reject') => {
    const confirmation = action === 'approve'
      ? 'Approve this deposit only after the mobile-money transaction reference is verified in the MTN or Airtel payment record. Product funds will be credited.'
      : 'Reject this deposit? No product funds will be credited.';
    if (!window.confirm(confirmation)) return;
    reviewPayment.mutate({ id, data: { action } }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({
          title: action === 'approve' ? 'Deposit approved' : 'Deposit rejected',
          description: action === 'approve' ? 'Verified funds were added to the member’s product balance.' : 'No product funds were credited.',
        });
      },
    });
  };
  const saveProduct = (event: FormEvent) => { event.preventDefault(); createProduct.mutate({ data: { name: product.name, price: Number(product.price), daily: Number(product.daily), total: Number(product.total), days: Number(product.days) } }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); setProduct({ name: '', price: '', daily: '', total: '', days: '' }); toast({ title: 'Product created' }); } }); };
  const saveSettings = (data: SettingsInput) => updateSettings.mutate({ data }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: 'Settings saved', description: 'Uganda rates, limits, and platform options are now active.' }); } });
  const saveAdmin = (event: FormEvent) => {
    event.preventDefault();
    createAdmin.mutate({ data: adminForm }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        setAdminForm({ username: '', password: '' });
        toast({ title: 'Administrator added' });
      },
    });
  };
  const removeAdmin = (admin: any) => {
    if (!window.confirm(`Remove administrator ${admin.username}? Their active console sessions will be revoked.`)) return;
    deleteAdmin.mutate({ id: admin.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: 'Administrator removed', description: 'Their active console sessions have been revoked.' });
      },
    });
  };
  const openUserWallet = (user: any, action: 'credit' | 'debit') => { setSelectedUser(user); setUserAmount(''); setUserNote(''); setModal(action); };
  const saveUserWallet = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;
    const mutation = modal === 'credit' ? creditUser : debitUser;
    mutation.mutate({ id: selectedUser.id, data: { amount: Number(userAmount), note: userNote || undefined } }, {
      onSuccess: () => { queryClient.invalidateQueries(); setModal(null); setSelectedUser(null); toast({ title: `User ${modal}ed`, description: `${selectedUser.phone}'s balance has been updated.` }); },
    });
  };
  const toggleBan = (user: any) => {
    const nextBanned = !user.banned;
    if (!window.confirm(`${nextBanned ? 'Ban' : 'Unban'} ${user.phone}?`)) return;
    banUser.mutate({ id: user.id, data: { banned: nextBanned } }, {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: nextBanned ? 'User banned' : 'User unbanned', description: `${user.phone} can ${nextBanned ? 'no longer' : 'now'} sign in.` }); },
    });
  };
  const removeUser = (user: any) => {
    if (!window.confirm(`Delete ${user.phone}? This removes the user's account, wallet history, deposits, and withdrawals.`)) return;
    deleteUser.mutate({ id: user.id }, {
      onSuccess: () => { queryClient.invalidateQueries(); toast({ title: 'User deleted', description: `${user.phone} was removed from the platform.` }); },
    });
  };
  let view: ReactNode;
  if (active === 'analytics') view = <AdminListPage eyebrow="Platform analytics" title="Analytics." copy="A quick read on balances, deposits, withdrawals, and platform activity." loading={dashboard.isLoading} error={!!dashboard.error}><AdminAnalytics dashboard={dashboard.data} /></AdminListPage>;
  else if (active === 'users') view = <AdminListPage eyebrow="Member directory" title="Users." copy="Credit, debit, ban, or delete member accounts." loading={users.isLoading} error={!!users.error} empty={!users.data?.length}><AdminUsers users={users.data || []} onCredit={user => openUserWallet(user, 'credit')} onDebit={user => openUserWallet(user, 'debit')} onToggleBan={toggleBan} onDelete={removeUser} /></AdminListPage>;
  else if (active === 'deposits') view = <AdminListPage eyebrow="Manual payment review" title="Payments." copy="Confirm each transfer in the MTN or Airtel payment record before approving it. Approved deposits are credited to product funds only." loading={payments.isLoading} error={!!payments.error} empty={!payments.data?.length}><AdminPayments payments={payments.data || []} onReview={reviewDeposit} reviewing={reviewPayment.isPending} error={!!reviewPayment.error} /></AdminListPage>;
  else if (active === 'withdrawals') view = <AdminListPage eyebrow="Manual payout queue" title="Withdrawals." copy="Review member requests and confirm payments outside this system." loading={withdrawals.isLoading} error={!!withdrawals.error} empty={!withdrawals.data?.length}><AdminWithdrawals withdrawals={withdrawals.data || []} onReview={approveWithdrawal} /></AdminListPage>;
  else if (active === 'products') view = <AdminListPage eyebrow="Earning catalogue" title="Products." copy="Set the fixed earning plans available to members." action={<Button data-testid="button-new-product" onClick={() => setModal('product')}><Plus className="size-4" /> New product</Button>} loading={products.isLoading} error={!!products.error} empty={!products.data?.length}><AdminProducts products={products.data || []} onDelete={(id) => deleteProduct.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: 'Product removed' }); } })} /></AdminListPage>;
  else if (active === 'transactions') view = <AdminListPage eyebrow="Ledger" title="Transactions." copy="A complete record of wallet movement." loading={transactions.isLoading} error={!!transactions.error} empty={!transactions.data?.length}><AdminTransactions transactions={transactions.data || []} /></AdminListPage>;
  else if (active === 'referrals') view = <AdminListPage eyebrow="Network health" title="Referrals." copy="The current shape of member-led growth." loading={referrals.isLoading} error={!!referrals.error} empty={!referrals.data}><AdminReferrals referrals={referrals.data} /></AdminListPage>;
  else if (active === 'gift-codes') view = <AdminGiftCodes />;
  else if (active === 'messages') view = <AdminSupportPage settings={settings.data} />;
  else if (active === 'countries') view = <AdminListPage eyebrow="Platform reach" title="Countries." copy="Grand Crown currently supports one market profile." loading={settings.isLoading} error={!!settings.error}><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Active market</div><h2 className="mt-2 text-2xl font-extrabold text-slate-900">Uganda</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Currency: {settings.data?.currency || 'UGX'} · Mobile money: MTN and Airtel · Local time: Africa/Kampala</p></div><Button data-testid="button-country-settings" onClick={() => setActive('settings')} className="bg-[#f07a16] text-white hover:bg-[#dc6810]"><Settings2 className="size-4" /> Rates &amp; limits · Uganda</Button></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold text-slate-500">Minimum deposit</div><div className="mt-2 font-mono font-bold text-slate-900">{money(settings.data?.minDeposit, settings.data?.currency)}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold text-slate-500">Minimum withdrawal</div><div className="mt-2 font-mono font-bold text-slate-900">{money(settings.data?.minWithdrawal, settings.data?.currency)}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-semibold text-slate-500">Withdrawal fee</div><div className="mt-2 font-mono font-bold text-slate-900">{settings.data?.withdrawalFeePercent ?? 0}%</div></div></div></div></AdminListPage>;
  else if (active === 'admins') view = <AdminListPage eyebrow="Access control" title="Admins." copy="Manage administrator accounts. Only the owner can add or remove accounts." loading={adminAccounts.isLoading} error={!!adminAccounts.error}><div className="space-y-5"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{(adminAccounts.data?.admins || []).map((admin: any) => <div key={admin.id} data-testid={`row-admin-account-${admin.id}`} className="flex flex-col gap-4 border-b border-slate-100 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{admin.username}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">{admin.role}</span>{admin.isCurrent && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Current session</span>}</div><div className="mt-1 text-xs text-slate-500">Created {admin.createdAt ? shortDate(admin.createdAt) : 'Owner account'} · Last sign-in {admin.lastLoginAt ? shortDate(admin.lastLoginAt) : 'Not recorded'}</div></div>{adminAccounts.data?.canManage && admin.role !== 'Owner' && !admin.isCurrent && <Button data-testid={`button-delete-admin-${admin.id}`} variant="danger" onClick={() => removeAdmin(admin)} disabled={deleteAdmin.isPending}><Trash2 className="size-4" /> Remove</Button>}</div>)}</div>{adminAccounts.data?.canManage && <form onSubmit={saveAdmin} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">Add administrator</h2><p className="mt-1 text-sm text-slate-500">Create an account with its own sign-in at /admin.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Username" data-testid="input-new-admin-username" autoComplete="off" minLength={3} maxLength={32} value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} required /><Field label="Temporary password" data-testid="input-new-admin-password" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} required /></div>{createAdmin.error && <p role="alert" className="mt-3 text-sm text-red-600">Could not add the administrator. Check the username is unique and the password is at least 8 characters.</p>}<Button data-testid="button-create-admin" type="submit" className="mt-5 bg-[#f07a16] text-white hover:bg-[#dc6810]" disabled={createAdmin.isPending}>{createAdmin.isPending ? 'Creating…' : 'Create admin account'}<Plus className="size-4" /></Button></form>}</div></AdminListPage>;
  else if (active === 'activity') view = <AdminListPage eyebrow="Audit trail" title="Activity." copy="Recent actions across the Grand Crown console." loading={activity.isLoading} error={!!activity.error} empty={!activity.data?.length}><AdminActivity activity={activity.data || []} /></AdminListPage>;
  else if (active === 'settings') view = <AdminListPage eyebrow="Configuration" title="Settings." copy="Edit every member-facing rate, limit, payment instruction, access control, and announcement." loading={settings.isLoading} error={!!settings.error}>{settings.data && <AdminSettingsEditor settings={settings.data} onSave={saveSettings} pending={updateSettings.isPending} error={!!updateSettings.error} />}</AdminListPage>;
  else view = <AdminOverview dashboard={dashboard.data} loading={dashboard.isLoading} error={!!dashboard.error} onReview={() => setActive('deposits')} />;
  return <>{view}{modal === 'product' && <AdminProductModal values={product} setValues={setProduct} onClose={() => setModal(null)} onSubmit={saveProduct} pending={createProduct.isPending} error={!!createProduct.error} />}{(modal === 'credit' || modal === 'debit') && selectedUser && <AdminUserWalletModal action={modal} user={selectedUser} amount={userAmount} note={userNote} setAmount={setUserAmount} setNote={setUserNote} onClose={() => { setModal(null); setSelectedUser(null); }} onSubmit={saveUserWallet} pending={creditUser.isPending || debitUser.isPending} error={!!creditUser.error || !!debitUser.error} />}</>;
}

function AdminListPage({ eyebrow, title, copy, action, loading, error, empty, children }: { eyebrow: string; title: string; copy: string; action?: ReactNode; loading: boolean; error: boolean; empty?: boolean; children: ReactNode }) {
  return <div className="animate-rise"><PageHeading eyebrow={eyebrow} title={title} copy={copy} action={action} /><QueryState loading={loading} error={error} empty={empty}>{children}</QueryState></div>;
}

function AdminProductModal({ values, setValues, onClose, onSubmit, pending, error }: { values: { name: string; price: string; daily: string; total: string; days: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error: boolean }) {
  return <Modal title="Create an earning plan" onClose={onClose}><form onSubmit={onSubmit} className="space-y-4"><Field label="Plan name" data-testid="input-product-name" placeholder="e.g. Crown Builder" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Price" data-testid="input-product-price" type="number" min="1" value={values.price} onChange={e => setValues({ ...values, price: e.target.value })} required /><Field label="Daily earning" data-testid="input-product-daily" type="number" min="0" value={values.daily} onChange={e => setValues({ ...values, daily: e.target.value })} required /><Field label="Total earning" data-testid="input-product-total" type="number" min="0" value={values.total} onChange={e => setValues({ ...values, total: e.target.value })} required /><Field label="Term in days" data-testid="input-product-days" type="number" min="1" value={values.days} onChange={e => setValues({ ...values, days: e.target.value })} required /></div>{error && <p className="text-sm text-destructive">Product could not be created. Confirm each value and try again.</p>}<Button data-testid="button-submit-product" type="submit" className="w-full" disabled={pending}>{pending ? 'Creating…' : 'Create product'}<Plus className="size-4" /></Button></form></Modal>;
}

function AdminSettingsToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 size-4 accent-[#f07a16]" />
    <span><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
  </label>;
}

function AdminSettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-5"><h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </section>;
}

function AdminSettingsEditor({ settings, onSave, pending, error }: { settings: Settings; onSave: (data: SettingsInput) => void; pending: boolean; error: boolean }) {
  const [values, setValues] = useState<SettingsInput>(() => ({ ...settings, allowedDomains: [...settings.allowedDomains] }));
  const [domainsText, setDomainsText] = useState(settings.allowedDomains.join('\n'));
  const [openingAtText, setOpeningAtText] = useState(toUgandaDateTimeInput(settings.openingAt));
  useEffect(() => {
    setValues({ ...settings, allowedDomains: [...settings.allowedDomains] });
    setDomainsText(settings.allowedDomains.join('\n'));
    setOpeningAtText(toUgandaDateTimeInput(settings.openingAt));
  }, [settings]);
  const updateText = (key: 'brand' | 'currency' | 'supportHandle' | 'telegramUrl' | 'airtelNumber' | 'mtnNumber' | 'payeeName', value: string) => setValues(current => ({ ...current, [key]: value }));
  const updateNumber = (key: 'minDeposit' | 'minWithdrawal' | 'withdrawalMultiple' | 'welcomeBonus' | 'checkinBonus' | 'withdrawalFeePercent' | 'l1CommissionPercent' | 'returnMultiple' | 'cycleDays' | 'maxWithdrawalsPerUserPerDay', value: string) => setValues(current => ({ ...current, [key]: value === '' ? 0 : Number(value) }));
  const updateToggle = (key: 'requirePlanBeforeWithdraw' | 'restrictWithdrawalsToHours' | 'requireReferralCode' | 'maintenanceMode' | 'openingCountdown' | 'announcementEnabled', checked: boolean) => setValues(current => ({ ...current, [key]: checked }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...values,
      allowedDomains: domainsText.split(/[\n,]/).map(domain => domain.trim()).filter(Boolean),
      openingAt: openingAtText ? fromUgandaDateTimeInput(openingAtText) : null,
    });
  };
  const numberField = (key: Parameters<typeof updateNumber>[0], label: string, min = 0, max?: number, step = 1, hint?: string) => <div className="space-y-1.5"><Field label={label} type="number" min={min} max={max} step={step} value={values[key]} onChange={event => updateNumber(key, event.target.value)} />{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>;
  const toggle = (key: Parameters<typeof updateToggle>[0], title: string, description: string) => <AdminSettingsToggle title={title} description={description} checked={values[key]} onChange={checked => updateToggle(key, checked)} />;
  return <form onSubmit={save} className="space-y-5" data-testid="form-admin-settings">
    <AdminSettingsSection title="Brand and support details" description="Member-facing identity and the MTN/Airtel numbers used for manual deposits.">
      <Field label="Brand name" data-testid="input-settings-brand" maxLength={80} value={values.brand} onChange={event => updateText('brand', event.target.value)} required />
      <Field label="Currency code" data-testid="input-settings-currency" maxLength={8} value={values.currency} onChange={event => updateText('currency', event.target.value.toUpperCase())} required />
      <Field label="MTN Mobile Money number" data-testid="input-settings-mtn" value={values.mtnNumber} onChange={event => updateText('mtnNumber', event.target.value)} />
      <Field label="Airtel Money number" data-testid="input-settings-airtel" value={values.airtelNumber} onChange={event => updateText('airtelNumber', event.target.value)} />
      <Field label="Payee name" data-testid="input-settings-payee" value={values.payeeName} onChange={event => updateText('payeeName', event.target.value)} />
      <Field label="Support handle" data-testid="input-settings-support" value={values.supportHandle} onChange={event => updateText('supportHandle', event.target.value)} />
      <Field label="Telegram URL" data-testid="input-settings-telegram" type="url" value={values.telegramUrl} onChange={event => updateText('telegramUrl', event.target.value)} />
      <label className="block space-y-2 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-600">Terms and conditions</span><textarea data-testid="input-settings-terms" maxLength={20000} rows={6} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#f07a16] focus:ring-2 focus:ring-orange-100" value={values.termsText} onChange={event => setValues(current => ({ ...current, termsText: event.target.value }))} /><span className="block text-right text-[10px] text-slate-500">{values.termsText.length}/20000 characters</span></label>
    </AdminSettingsSection>
    <AdminSettingsSection title="Rates &amp; limits · Uganda" description="These values apply to the single Uganda profile and affect member transactions.">
      {numberField('minDeposit', 'Minimum deposit (UGX)', 0, 100_000_000)}
      {numberField('minWithdrawal', 'Minimum withdrawal (UGX)', 0, 100_000_000)}
      {numberField('withdrawalMultiple', 'Withdrawal amount multiple', 0, 100_000_000, 1, '0 disables the multiple requirement.')}
      {numberField('welcomeBonus', 'Signup bonus (UGX)', 0, 100_000_000)}
      {numberField('checkinBonus', 'Daily check-in bonus (UGX)', 0, 100_000_000)}
      {numberField('withdrawalFeePercent', 'Withdrawal fee (%)', 0, 100, 0.1)}
      {numberField('l1CommissionPercent', 'Referral commission · level 1 (%)', 0, 100, 0.1)}
      {numberField('returnMultiple', 'Maximum plan return multiple', 0, 100, 0.01)}
      {numberField('cycleDays', 'Earning cycle length (days)', 1, 365)}
      {numberField('maxWithdrawalsPerUserPerDay', 'Maximum withdrawals per member per day', 0, 1000, 1, '0 means there is no daily withdrawal cap.')}
      <div className="space-y-3 sm:col-span-2">{toggle('requirePlanBeforeWithdraw', 'Require an active plan to withdraw', 'Members must have an active plan before requesting a withdrawal.')}{toggle('restrictWithdrawalsToHours', 'Limit withdrawals to set hours', 'Use Uganda local time for the start and end times.')}</div>
      <Field label="Withdrawal window starts · Uganda time" type="time" value={values.withdrawalStartTime} onChange={event => setValues(current => ({ ...current, withdrawalStartTime: event.target.value }))} required />
      <Field label="Withdrawal window ends · Uganda time" type="time" value={values.withdrawalEndTime} onChange={event => setValues(current => ({ ...current, withdrawalEndTime: event.target.value }))} required />
    </AdminSettingsSection>
    <AdminSettingsSection title="Referrals and access" description="Control invitations, allowed website domains, maintenance, and the opening date.">
      <div className="sm:col-span-2">{toggle('requireReferralCode', 'Require a referral code to sign up', 'The registration form and server will both enforce this setting.')}</div>
      <label className="block space-y-2 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-600">Allowed website domains</span><textarea data-testid="input-settings-domains" rows={3} maxLength={13000} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#f07a16] focus:ring-2 focus:ring-orange-100" placeholder="example.com&#10;members.example.com" value={domainsText} onChange={event => setDomainsText(event.target.value)} /><span className="block text-xs text-slate-500">Enter hostnames only, one per line or comma-separated. Wildcards and URL paths are not accepted.</span></label>
      <div className="sm:col-span-2">{toggle('maintenanceMode', 'Turn on maintenance mode', 'Blocks member access while keeping the administrator console available.')}</div>
      <label className="block space-y-2 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-600">Maintenance message</span><textarea data-testid="input-settings-maintenance-message" rows={3} maxLength={500} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#f07a16] focus:ring-2 focus:ring-orange-100" value={values.maintenanceMessage} onChange={event => setValues(current => ({ ...current, maintenanceMessage: event.target.value }))} /></label>
      <div className="sm:col-span-2">{toggle('openingCountdown', 'Show opening countdown', 'When enabled, members see a countdown until the opening date and time.')}</div>
      <label className="block space-y-2 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-600">Opening date and time · Uganda time</span><input data-testid="input-settings-opening-at" type="datetime-local" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none focus:border-[#f07a16] focus:ring-2 focus:ring-orange-100" value={openingAtText} onChange={event => setOpeningAtText(event.target.value)} /><span className="block text-xs text-slate-500">Leave blank to clear the opening date.</span></label>
    </AdminSettingsSection>
    <AdminSettingsSection title="Member announcement" description="Show a dismissible announcement dialog when members enter the portal.">
      <div className="sm:col-span-2">{toggle('announcementEnabled', 'Show announcement dialog', 'The dialog stays dismissed for each member until its title or message changes.')}</div>
      <Field label="Announcement title" data-testid="input-settings-announcement-title" maxLength={120} value={values.announcementTitle} onChange={event => setValues(current => ({ ...current, announcementTitle: event.target.value }))} />
      <label className="block space-y-2 sm:col-span-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-600">Announcement message</span><textarea data-testid="input-settings-announcement-message" rows={4} maxLength={2000} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#f07a16] focus:ring-2 focus:ring-orange-100" value={values.announcementMessage} onChange={event => setValues(current => ({ ...current, announcementMessage: event.target.value }))} /><span className="block text-right text-[10px] text-slate-500">{values.announcementMessage.length}/2000 characters</span></label>
    </AdminSettingsSection>
    <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>{error && <p role="alert" className="text-sm font-medium text-red-600">Settings could not be saved. Check domains, percentages, and text limits.</p>}</div>
      <Button data-testid="button-submit-settings" type="submit" className="bg-[#f07a16] text-white hover:bg-[#dc6810]" disabled={pending}>{pending ? 'Saving settings…' : 'Save all settings'}<Check className="size-4" /></Button>
    </div>
  </form>;
}

function AdminOverview({ dashboard, loading, error, onReview }: { dashboard?: any; loading: boolean; error: boolean; onReview: () => void }) {
  const stats = [
    ['Total users', dashboard?.users || 0, false],
    ['Active users', dashboard?.users || 0, false],
    ['Banned users', 0, false],
    ['Withdrawable balances', money(dashboard?.walletBalances), true],
    ['Product funds', money(dashboard?.productFundBalances), true],
    ['Total deposited', money(dashboard?.totalDeposited), true],
    ['Total withdrawn', money(dashboard?.totalWithdrawn), true],
    ['Total invested', money(dashboard?.totalInvested), true],
    ['Active plans', dashboard?.purchases || 0, false],
    ['Pending deposits', dashboard?.payments || 0, false],
    ['Pending withdrawals', dashboard?.withdrawals || 0, false],
  ];
  return <div className="animate-rise">
    <div className="mb-5 flex items-center justify-between px-4 sm:px-0"><div><div className="text-2xl font-extrabold tracking-tight text-slate-900">Overview</div><p className="mt-1 text-sm text-slate-500">A live view of the Grand Crown platform.</p></div><Button data-testid="button-review-deposits" onClick={onReview} className="bg-[#ef7815] text-white shadow-none hover:bg-[#db690b]"><Eye className="size-4" /><span className="hidden sm:inline">Payment activity</span></Button></div>
    <QueryState loading={loading} error={error}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{stats.map(([label, value, isMoney]) => <div key={String(label)} className="min-h-[94px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:min-h-[108px] sm:p-5"><div className={`font-extrabold leading-tight tracking-tight text-slate-900 ${isMoney ? 'text-[18px] sm:text-[21px]' : 'text-[25px] sm:text-[30px]'}`}>{value}</div><div className="mt-2 text-[12px] font-medium text-slate-500 sm:text-[13px]">{label}</div></div>)}</div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Member balances</h2><p className="mt-1 text-sm text-slate-500">Product funds are tracked separately and cannot be withdrawn.</p></div><div className="rounded-xl bg-[#fff1e7] p-3 text-[#ef7815]"><Wallet className="size-5" /></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><div className="text-xs text-slate-500">Withdrawable wallet total</div><div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{money(dashboard?.walletBalances)}</div></div><div><div className="text-xs text-slate-500">Product funds total</div><div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{money(dashboard?.productFundBalances)}</div></div></div></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Platform pulse</h2><p className="mt-1 text-sm text-slate-500">The numbers behind the circle.</p></div><BarChart3 className="size-5 text-slate-400" /></div><div className="grid gap-3 sm:grid-cols-2">{[['Purchases', dashboard?.purchases], ['Pending deposits', dashboard?.payments], ['Withdrawals', dashboard?.withdrawals], ['Ledger entries', dashboard?.transactions], ['Active products', dashboard?.products], ['Total invested', money(dashboard?.totalInvested)]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#f4f7fb] p-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-2 font-mono text-xl font-semibold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value || '0'}</div></div>)}</div></div><div className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex items-center gap-2 text-[#f4a261]"><ShieldCheck className="size-4" /><span className="text-[10px] font-bold uppercase tracking-[.16em]">Manual verification</span></div><h2 className="mt-6 text-3xl font-extrabold leading-tight">Every deposit is checked before credit.</h2><p className="mt-4 text-sm leading-6 text-white/60">Members send MTN or Airtel transfers directly. An administrator verifies the receipt in the payment record before adding purchase-only product funds.</p><div className="my-6 h-px bg-white/15" /><div className="flex items-center gap-3 text-sm text-white/70"><Clock3 className="size-4 text-[#f4a261]" /> {dashboard?.payments || 0} deposits awaiting administrator review</div></div></div>
    </QueryState>
  </div>;
}

function AdminUsers({ users, onCredit, onDebit, onToggleBan, onDelete }: { users: any[]; onCredit: (user: any) => void; onDebit: (user: any) => void; onToggleBan: (user: any) => void; onDelete: (user: any) => void }) {
  return <div className="overflow-hidden rounded-3xl border border-border bg-card">{users.map(user => <div key={user.id} data-testid={`row-admin-user-${user.id}`} className="flex flex-col gap-4 border-b border-border p-5 last:border-0 sm:px-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-full font-mono text-xs ${user.banned ? 'bg-red-100 text-red-700' : 'bg-accent/20 text-accent-foreground'}`}>{user.phone.slice(-2)}</div><div><div className="flex flex-wrap items-center gap-2 font-semibold"><span>{user.phone}</span>{user.banned && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Banned</span>}</div><div className="text-xs text-muted-foreground">Joined {shortDate(user.createdAt)} · Ref {user.referralCode}</div></div></div>
      <div className="flex flex-wrap items-center gap-5 text-right"><div><div className="text-xs text-muted-foreground">Withdrawable</div><div className="font-mono text-sm">{money(user.wallet)}</div></div><div><div className="text-xs text-muted-foreground">Product funds</div><div className="font-mono text-sm">{money(user.depositBalance)}</div></div><div><div className="text-xs text-muted-foreground">Earned</div><div className="font-mono text-sm text-accent-foreground">{money(user.totalEarned)}</div></div></div>
    </div>
    <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3"><Button data-testid={`button-credit-user-${user.id}`} onClick={() => onCredit(user)} className="min-h-9 bg-emerald-600 px-3 text-xs text-white shadow-none hover:bg-emerald-700"><Plus className="size-3.5" /> Credit</Button><Button data-testid={`button-debit-user-${user.id}`} onClick={() => onDebit(user)} variant="outline" className="min-h-9 px-3 text-xs"><Minus className="size-3.5" /> Debit</Button><Button data-testid={`button-ban-user-${user.id}`} onClick={() => onToggleBan(user)} variant="outline" className="min-h-9 px-3 text-xs"><Ban className="size-3.5" /> {user.banned ? 'Unban' : 'Ban'}</Button><Button data-testid={`button-delete-user-${user.id}`} onClick={() => onDelete(user)} variant="danger" className="min-h-9 px-3 text-xs"><UserX className="size-3.5" /> Delete</Button></div>
  </div>)}</div>;
}

function AdminAnalytics({ dashboard }: { dashboard?: any }) {
  const cards = [
    ['Members', dashboard?.users || 0, false],
    ['Purchases', dashboard?.purchases || 0, false],
    ['Pending deposits', dashboard?.payments || 0, false],
    ['Pending withdrawals', dashboard?.withdrawals || 0, false],
    ['Wallet balances', money(dashboard?.walletBalances), true],
    ['Total deposited', money(dashboard?.totalDeposited), true],
    ['Total withdrawn', money(dashboard?.totalWithdrawn), true],
    ['Total invested', money(dashboard?.totalInvested), true],
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, isMoney]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)]"><div className={`font-extrabold tracking-tight text-slate-900 ${isMoney ? 'text-xl' : 'text-3xl'}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div><div className="mt-2 text-sm font-medium text-slate-500">{label}</div></div>)}</div>;
}

function AdminInfoPage({ eyebrow, title, copy, title2, body }: { eyebrow: string; title: string; copy: string; title2: string; body: string }) {
  return <div className="animate-rise"><PageHeading eyebrow={eyebrow} title={title} copy={copy} /><div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,.03)]"><div className="grid size-12 place-items-center rounded-2xl bg-[#fff1e7] text-[#ef7815]"><ShieldCheck className="size-5" /></div><h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">{title2}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{body}</p></div></div>;
}

function AdminSupportPage({ settings }: { settings?: Settings }) {
  const groupUrl = settings?.telegramUrl || 'https://t.me/+zNDnaz_xKfdiMTlk';
  const handle = settings?.supportHandle || '@grandcrown01';
  const adminUrl = `https://t.me/${handle.replace(/^@/, '')}`;
  return <div className="animate-rise"><PageHeading eyebrow="Customer support" title="Messages." copy="Open the two configured Telegram support channels for member conversations." /><div className="grid gap-4 md:grid-cols-2"><a href={groupUrl} target="_blank" rel="noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-[#ef7815] hover:shadow-sm"><MessageCircle className="size-6 text-[#ef7815]" /><h2 className="mt-5 text-xl font-extrabold text-slate-900">Telegram group</h2><p className="mt-2 text-sm leading-6 text-slate-500">Open the Grand Crown member support group.</p><span className="mt-5 inline-flex text-sm font-bold text-[#ef7815]">Open group <ArrowUpRight className="ml-1 size-4" /></span></a><a href={adminUrl} target="_blank" rel="noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-[#ef7815] hover:shadow-sm"><UserRound className="size-6 text-[#ef7815]" /><h2 className="mt-5 text-xl font-extrabold text-slate-900">Talk to admin {handle}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Open a direct Telegram conversation with the administrator.</p><span className="mt-5 inline-flex text-sm font-bold text-[#ef7815]">Message admin <ArrowUpRight className="ml-1 size-4" /></span></a></div></div>;
}

function AdminUserWalletModal({ action, user, amount, note, setAmount, setNote, onClose, onSubmit, pending, error }: { action: 'credit' | 'debit'; user: any; amount: string; note: string; setAmount: (value: string) => void; setNote: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error: boolean }) {
  return <Modal title={`${action === 'credit' ? 'Credit' : 'Debit'} ${user.phone}`} onClose={onClose}><div className="rounded-2xl bg-secondary p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Current balance</span><span className="font-mono font-semibold">{money(user.wallet)}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{action === 'credit' ? 'The amount will be added to the member wallet and lifetime earned total.' : 'The amount will be removed from the member wallet. Debit cannot exceed the current balance.'}</p></div><form onSubmit={onSubmit} className="mt-6 space-y-4"><Field label="Amount (UGX)" data-testid={`input-${action}-user-amount`} type="number" min="1" max={action === 'debit' ? user.wallet : undefined} value={amount} onChange={e => setAmount(e.target.value)} required /><Field label="Note (optional)" data-testid={`input-${action}-user-note`} placeholder="Reason for this adjustment" value={note} onChange={e => setNote(e.target.value)} />{error && <p className="text-sm text-destructive">The balance adjustment could not be completed. Check the amount and try again.</p>}<Button data-testid={`button-submit-${action}-user`} type="submit" className="w-full" disabled={pending}>{pending ? 'Saving…' : `${action === 'credit' ? 'Credit' : 'Debit'} user`}<Check className="size-4" /></Button></form></Modal>;
}
function AdminPayments({ payments, onReview, reviewing, error }: { payments: Payment[]; onReview: (id: string, action: 'approve' | 'reject') => void; reviewing: boolean; error: boolean }) {
  return <div className="space-y-3">
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      Verify each transaction in the matching MTN or Airtel payment record before approving. A member-submitted reference alone is not proof of payment.
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">The deposit review could not be saved. Refresh the list and try again.</p>}
    {payments.map(payment => <div key={payment.id} data-testid={`row-admin-payment-${payment.id}`} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-semibold">Product-fund deposit <StatusPill status={payment.status} /></div>
          <div className="mt-2 text-sm">{money(payment.amount, 'UGX')} · {payment.method}</div>
          <div className="mt-1 text-xs text-muted-foreground">Sent from {payment.payerPhone} · Submitted {shortDate(payment.createdAt)}</div>
          <div className="mt-2 text-xs text-muted-foreground">Transfer reference: {payment.payerReference
            ? <span className="font-mono font-semibold text-foreground">{payment.payerReference}</span>
            : <span className="font-semibold text-destructive">Not provided — do not approve this legacy request.</span>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Platform deposit ID: <span className="font-mono">{payment.transactionId}</span></div>
        </div>
        {payment.status === 'pending'
          ? <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="text-xs font-medium text-amber-700">Awaiting administrator verification</div>
            <div className="flex gap-2">
              <Button data-testid={`button-approve-payment-${payment.id}`} disabled={reviewing || !payment.payerReference} onClick={() => onReview(payment.id, 'approve')} className="bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"><Check className="size-3.5" /> Approve &amp; credit</Button>
              <Button data-testid={`button-reject-payment-${payment.id}`} disabled={reviewing} onClick={() => onReview(payment.id, 'reject')} variant="outline" className="px-3 text-xs"><X className="size-3.5" /> Reject</Button>
            </div>
          </div>
          : <div className="text-xs font-medium text-muted-foreground">{payment.status === 'approved' || payment.status === 'completed'
            ? `Credited to product funds ${shortDate(payment.settledAt || payment.reviewedAt)}`
            : payment.status === 'rejected'
              ? `Rejected · no funds credited ${shortDate(payment.reviewedAt)}`
              : 'Not completed'}</div>}
      </div>
    </div>)}
  </div>;
}
function AdminWithdrawals({ withdrawals, onReview }: { withdrawals: any[]; onReview: (id: string, action: 'approve' | 'reject') => void }) { return <div className="space-y-3">{withdrawals.map(item => <div key={item.id} data-testid={`row-admin-withdrawal-${item.id}`} className="rounded-2xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between"><div><div className="font-mono text-lg font-semibold">{money(item.amount)}</div><div className="mt-1 text-xs text-muted-foreground">{item.phone} · {item.method} · Net {money(item.netAmount)}</div><div className="mt-1 text-xs text-muted-foreground">Requested {shortDate(item.createdAt)}</div></div><div className="mt-4 flex items-center gap-2 sm:mt-0">{item.status === 'pending' ? <><Button data-testid={`button-approve-withdrawal-${item.id}`} onClick={() => onReview(item.id, 'approve')} className="bg-accent text-primary hover:bg-accent/90"><Check className="size-4" /> Mark paid</Button><Button data-testid={`button-reject-withdrawal-${item.id}`} onClick={() => onReview(item.id, 'reject')} variant="outline"><X className="size-4" /> Reject</Button></> : <StatusPill status={item.status} />}</div></div>)}</div>; }
function AdminProducts({ products, onDelete }: { products: Product[]; onDelete: (id: string) => void }) { return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map(product => <div key={product.id} data-testid={`card-admin-product-${product.id}`} className="overflow-hidden rounded-3xl border border-border bg-card"><img src={planImage(product.name)} alt={`Illustrative ${product.name}`} loading="lazy" className="aspect-[16/9] w-full object-cover" /><div className="p-6"><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-xl bg-primary text-accent"><Crown className="size-4" /></div><button data-testid={`button-delete-product-${product.id}`} onClick={() => { if (window.confirm(`Remove ${product.name}?`)) onDelete(product.id); }} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div><h2 className="mt-6 font-display text-2xl font-semibold">{product.name}</h2><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-muted-foreground">Price</span><div className="font-mono">{money(product.price)}</div></div><div><span className="text-xs text-muted-foreground">Daily</span><div className="font-mono text-accent-foreground">{money(product.daily)}</div></div><div><span className="text-xs text-muted-foreground">Total</span><div className="font-mono">{money(product.total)}</div></div><div><span className="text-xs text-muted-foreground">Term</span><div className="font-mono">{product.days} days</div></div></div></div></div>)}</div>; }
function AdminTransactions({ transactions }: { transactions: any[] }) { return <div className="overflow-hidden rounded-3xl border border-border bg-card">{transactions.map(item => <div key={item.id} data-testid={`row-admin-transaction-${item.id}`} className="flex items-center justify-between border-b border-border p-5 last:border-0"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-secondary"><Receipt className="size-4 text-accent-foreground" /></div><div><div className="text-sm font-semibold capitalize">{item.type.replaceAll('_', ' ')}</div><div className="text-xs text-muted-foreground">User {item.userId} · {shortDate(item.createdAt)}</div></div></div><div className="font-mono text-sm font-semibold">{money(item.amount)}</div></div>)}</div>; }
function AdminReferrals({ referrals }: { referrals: any }) { return <div className="grid gap-4 sm:grid-cols-2"><Metric label="Tracked commissions" value={String(referrals.commissions || 0)} icon={Gift} accent /><Metric label="Total referral paid" value={money(referrals.total)} icon={Users} /></div>; }
function AdminActivity({ activity }: { activity: any[] }) { return <div className="space-y-2">{activity.map(item => <div key={item.id} data-testid={`row-admin-activity-${item.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><Activity className="size-4 text-accent-foreground" /><div><div className="text-sm font-semibold capitalize">{item.type.replaceAll('_', ' ')}</div><div className="text-xs text-muted-foreground">{item.userId ? `User ${item.userId}` : 'System event'} · {shortDate(item.createdAt)}</div></div></div><ChevronRight className="size-4 text-muted-foreground" /></div>)}</div>; }
function SettingsCard({ settings }: { settings?: any }) { return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(settings || {}).map(([key, value]) => <div key={key} className="rounded-2xl border border-border bg-card p-5"><div className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</div><div className="mt-2 text-sm font-semibold">{String(value || 'Not set')}</div></div>)}</div>; }

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary><Switch><Route path="/" component={MemberDashboard} /><Route path="/admin" component={AdminApp} /><Route component={NotFound} /></Switch></ErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;