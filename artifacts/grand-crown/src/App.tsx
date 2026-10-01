import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  useClaimCheckin,
  useBanUser,
  useCreditUser,
  useCreateProduct,
  useDebitUser,
  useDeleteProduct,
  useDeleteUser,
  useGetAdminActivity,
  useGetAdminDashboard,
  getGetAdminDashboardQueryKey,
  useGetAdminPayments,
  useGetAdminProducts,
  useGetAdminReferrals,
  useGetAdminSettings,
  useGetAdminTransactions,
  useGetAdminUsers,
  useGetAdminWithdrawals,
  useGetCurrentUser,
  useGetDashboard,
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
  type Product,
  type Settings,
  type User,
} from '@workspace/api-client-react';
import { Activity, ArrowDownToLine, ArrowUpRight, Ban, BarChart3, Bell, Check, ChevronRight, Clock3, Copy, Crown, Eye, Gift, LayoutDashboard, Link2, LogOut, Menu, MessageCircle, Minus, Package, Plus, Receipt, Settings2, ShieldCheck, Sparkles, Target, Trash2, TrendingUp, UserRound, UserX, Users, Wallet, X, XCircle } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';
import { PlanCatalogue, planImage, assetUrl } from '@/components/plan-catalogue';

const queryClient = new QueryClient();

const money = (value = 0, currency = 'UGX') =>
  `${currency} ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const tone = (status = '') => {
  const value = status.toLowerCase();
  if (value.includes('approve') || value === 'completed' || value === 'paid') return 'success';
  if (value.includes('reject') || value === 'failed') return 'danger';
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
  const [adminOpen, setAdminOpen] = useState(false);
  const login = useLoginUser();
  const register = useRegisterUser();
  const adminLogin = useLoginAdmin();
  const [adminUser, setAdminUser] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const onSuccess = () => { queryClient.invalidateQueries(); toast({ title: mode === 'login' ? 'Welcome back' : 'Your account is ready', description: 'Opening your Grand Crown circle.' }); };
    if (mode === 'login') login.mutate({ data: { phone, password } }, { onSuccess });
    else register.mutate({ data: { phone, password, referralCode: referralCode || undefined } }, { onSuccess });
  };
  const submitAdmin = (event: FormEvent) => {
    event.preventDefault();
    adminLogin.mutate({ data: { username: adminUser, password: adminPassword } }, { onSuccess: () => setLocation('/admin') });
  };
  const pending = login.isPending || register.isPending;
  return <main className="grain grid min-h-[100dvh] lg:grid-cols-[1.05fr_.95fr]">
    <section className="relative hidden overflow-hidden bg-primary p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
      <img src={assetUrl('resort.jpg')} alt="Illustrative resort at sunset" className="absolute inset-0 size-full object-cover" /><div className="absolute inset-0 bg-gradient-to-b from-[hsl(160_45%_8%/.85)] via-[hsl(160_45%_8%/.55)] to-[hsl(160_45%_6%/.92)]" />
      <div className="relative"><Logo /><div className="mt-24 max-w-xl animate-rise"><div className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.25em] text-accent"><Sparkles className="size-3.5" /> Luxury stays · Investment packages</div><h1 className="font-display text-6xl font-semibold leading-[.95] tracking-[-.04em] xl:text-8xl">Invest in comfort,<br /><span className="text-accent">invest in value.</span></h1><p className="mt-8 max-w-md text-base leading-7 text-sidebar-foreground/65">Thirteen hotel-themed packages, from Garden View to the Presidential Suite, each with clearly stated terms, plus daily check-ins and a member circle.</p></div></div>
      <div className="relative flex items-end justify-between border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/50"><span>© Grand Crown Hotel &amp; Suites</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Manual review, human trust</span></div>
    </section>
    <section className="flex min-h-[100dvh] flex-col bg-background p-6 sm:p-10 lg:p-16">
      <div className="flex items-center justify-between lg:justify-end"><div className="lg:hidden"><Logo small /></div><button data-testid="button-admin-access" onClick={() => setAdminOpen(true)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-muted-foreground transition hover:text-foreground"><ShieldCheck className="size-4" /> Admin access</button></div>
      <div className="m-auto w-full max-w-md animate-rise">
        <div className="mb-9 lg:hidden"><div className="mb-4 font-mono text-[10px] uppercase tracking-[.25em] text-accent-foreground">Grand Crown Hotel &amp; Suites</div><h1 className="font-display text-5xl font-semibold leading-none tracking-tight">Invest in <span className="text-primary">comfort.</span></h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Hotel-themed packages with clearly stated price, daily, total and term.</p></div>
        <div className="mb-8"><div className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent-foreground">{mode === 'login' ? 'Member sign in' : 'New member'}</div><h2 className="font-display text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Good to see you.' : 'Start your circle.'}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === 'login' ? 'Pick up where you left off.' : 'Create an account and choose your first earning plan.'}</p></div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Mobile number" autoComplete="tel" data-testid="input-phone" type="tel" placeholder="07xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} required minLength={7} />
          <Field label="Password" data-testid="input-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          {mode === 'register' && <Field label="Referral code (optional)" data-testid="input-referral-code" placeholder="e.g. GC-4L8P" value={referralCode} onChange={e => setReferralCode(e.target.value)} />}
          {!!(login.error || register.error) && <p data-testid="status-auth-error" className="text-sm text-destructive">We couldn't verify those details. Please try again.</p>}
          <Button data-testid="button-submit-auth" type="submit" className="mt-2 w-full" disabled={pending}>{pending ? 'Checking details…' : mode === 'login' ? 'Enter my circle' : 'Create my account'}<ArrowUpRight className="size-4" /></Button>
        </form>
        <button data-testid="button-toggle-auth-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground">{mode === 'login' ? 'New to Grand Crown? ' : 'Already a member? '}<span className="font-bold text-primary">{mode === 'login' ? 'Create an account' : 'Sign in'}</span></button>
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-accent-foreground" /> Your account is protected by secure session access</div>
      </div>
    </section>
    {adminOpen && <Modal title="Administrator access" onClose={() => setAdminOpen(false)}><form onSubmit={submitAdmin} className="space-y-4"><Field label="Username" autoComplete="username" data-testid="input-admin-username" value={adminUser} onChange={e => setAdminUser(e.target.value)} required /><Field label="Password" autoComplete="current-password" data-testid="input-admin-password" type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required />{adminLogin.error && <p className="text-sm text-destructive">Admin sign in failed. Check your credentials.</p>}<Button data-testid="button-submit-admin-login" className="w-full" disabled={adminLogin.isPending}>{adminLogin.isPending ? 'Verifying…' : 'Open admin console'}</Button></form></Modal>}
  </main>;
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
    <div className="lg:pl-72"><header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12"><div className="flex items-center gap-3"><div className="hidden text-sm text-muted-foreground sm:block">Member space <span className="mx-2 text-border">/</span> <span className="font-semibold text-foreground">{items.find(item => item.id === active)?.label}</span></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground lg:flex"><ShieldCheck className="size-3.5 text-accent-foreground" /> Secure member access</div><Button data-testid="button-header-deposit" onClick={() => setActive('products')} className="min-h-9 rounded-xl bg-accent px-3 text-xs text-primary hover:bg-accent/90"><ArrowDownToLine className="size-3.5" /><span>Deposit</span></Button><button data-testid="button-notifications" className="grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"><Bell className="size-4" /></button></div></header><main className="mx-auto max-w-[1440px] px-5 pb-24 pt-5 sm:p-8 sm:pb-24 lg:p-12 lg:pb-12">{children}</main></div>
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_hsl(var(--primary)/.08)] backdrop-blur lg:hidden">
      {items.map(item => <button data-testid={`button-bottom-nav-${item.id}`} key={item.id} type="button" onClick={() => { setActive(item.id); setOpen(false); }} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition ${active === item.id ? 'text-accent-foreground' : 'text-muted-foreground'}`}><item.icon className="size-5" strokeWidth={active === item.id ? 2.5 : 2} /><span>{item.id === 'products' ? 'Plans' : item.label.replace('My ', '')}</span></button>)}
    </nav>
  </div>;
}

function MemberDashboard() {
  const session = useGetCurrentUser();
  const [active, setActive] = useState('overview');
  const logout = useLogoutUser();
  if (session.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="w-64"><Loading rows={4} /></div></div>;
  if (!session.data?.loggedIn || !session.data.user) return <AuthPage />;
  return <MemberShell active={active} setActive={setActive} user={session.data.user} onLogout={() => logout.mutate(undefined, { onSuccess: () => { queryClient.invalidateQueries(); } })}><MemberContent active={active} user={session.data.user} setActive={setActive} /></MemberShell>;
}

function MemberContent({ active, user, setActive }: { active: string; user: User; setActive: (value: string) => void }) {
  const dashboard = useGetDashboard();
  const products = useGetProducts();
  const purchases = useGetPurchases();
  const referrals = useGetReferral();
  const withdrawals = useGetWithdrawals();
  const settings = useGetSettings();
  const checkin = useClaimCheckin();
  const requestWithdrawal = useRequestWithdrawal();
  const submitPayment = useSubmitPayment();
  const { toast } = useToast();
  const [modal, setModal] = useState<'payment' | 'withdrawal' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [payment, setPayment] = useState({ method: 'MTN Mobile Money', payerPhone: user.phone, transactionId: '' });
  const [withdrawal, setWithdrawal] = useState({ amount: '', method: 'MTN Mobile Money', phone: user.phone });
  const currency = settings.data?.currency || 'UGX';
  const userData = dashboard.data?.user || user;
  const openPayment = (product: Product) => { setSelectedProduct(product); setPayment({ method: 'MTN Mobile Money', payerPhone: user.phone, transactionId: '' }); setModal('payment'); };
  const submitPaymentForm = (event: FormEvent) => { event.preventDefault(); if (!selectedProduct) return; submitPayment.mutate({ data: { productId: selectedProduct.id, amount: selectedProduct.price, ...payment } }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); toast({ title: 'Payment submitted', description: 'We will verify your mobile-money payment manually.' }); } }); };
  const submitWithdrawalForm = (event: FormEvent) => { event.preventDefault(); requestWithdrawal.mutate({ data: { amount: Number(withdrawal.amount), method: withdrawal.method, phone: withdrawal.phone } }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); toast({ title: 'Withdrawal requested', description: 'Your request is now waiting for administrator review.' }); } }); };
  const claim = () => checkin.mutate(undefined, { onSuccess: result => { queryClient.invalidateQueries(); toast({ title: `Check-in credited ${money(result.reward, currency)}`, description: 'Your daily rhythm is intact.' }); } });
  let view: ReactNode;
  if (active === 'products') view = <ProductsView products={products.data} loading={products.isLoading} error={!!products.error} onBuy={openPayment} currency={currency} />;
  else if (active === 'purchases') view = <PurchasesView purchases={purchases.data} loading={purchases.isLoading} error={!!purchases.error} currency={currency} />;
  else if (active === 'referrals') view = <ReferralView referrals={referrals.data} loading={referrals.isLoading} error={!!referrals.error} currency={currency} />;
  else if (active === 'account') view = <AccountView user={userData} settings={settings.data} withdrawals={withdrawals.data} loading={withdrawals.isLoading} error={!!withdrawals.error} currency={currency} onWithdraw={() => setModal('withdrawal')} />;
  else view = <OverviewView dashboard={dashboard.data} loading={dashboard.isLoading} error={!!dashboard.error} currency={currency} onCheckin={claim} checkingIn={checkin.isPending} onWithdraw={() => setModal('withdrawal')} onBuy={() => setActive('products')} />;
  return <>{view}{modal === 'payment' && selectedProduct && <PaymentModal product={selectedProduct} settings={settings.data} values={payment} setValues={setPayment} onClose={() => setModal(null)} onSubmit={submitPaymentForm} pending={submitPayment.isPending} error={!!submitPayment.error} />}{modal === 'withdrawal' && <WithdrawModal balance={userData.wallet} currency={currency} values={withdrawal} setValues={setWithdrawal} onClose={() => setModal(null)} onSubmit={submitWithdrawalForm} pending={requestWithdrawal.isPending} error={!!requestWithdrawal.error} />}</>;
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: ReactNode }) {
  return <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[.22em] text-accent-foreground">{eyebrow}</div><h1 className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{copy}</p></div>{action}</div>;
}

function OverviewView({ dashboard, loading, error, currency, onCheckin, checkingIn, onWithdraw, onBuy }: { dashboard?: any; loading: boolean; error: boolean; currency: string; onCheckin: () => void; checkingIn: boolean; onWithdraw: () => void; onBuy: () => void }) {
  const user = dashboard?.user;
  const canCheckin = !user?.lastCheckin || new Date(user.lastCheckin).toDateString() !== new Date().toDateString();
  return <div className="animate-rise"><PageHeading eyebrow="Member overview" title={`Good morning${user?.phone ? `, ${user.phone.slice(-4)}` : ''}.`} copy="A clear view of your balance, active earning plans, and next moves." action={<Button data-testid="button-browse-plans" onClick={onBuy}><ArrowDownToLine className="size-4" /> Deposit funds</Button>} />
    <QueryState loading={loading} error={error}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Available balance" value={money(user?.wallet, currency)} icon={Wallet} accent /><Metric label="Total earned" value={money(user?.totalEarned, currency)} icon={TrendingUp} /><Metric label="Active plans" value={String(dashboard?.purchases?.filter((p: any) => p.status === 'active' || p.status === 'approved').length || 0)} icon={Target} /><Metric label="Last check-in" value={user?.lastCheckin ? shortDate(user.lastCheckin) : 'Not yet'} icon={Clock3} /></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><div className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-foreground sm:p-9"><div className="absolute -right-14 -top-24 size-72 rounded-full border border-accent/20" /><div className="absolute right-8 top-8 size-28 rounded-full border border-accent/20" /><div className="relative"><div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-accent"><Sparkles className="size-4" /> Daily crown ritual</div><h2 className="max-w-md font-display text-3xl font-semibold leading-tight sm:text-4xl">Small, consistent moves compound.</h2><p className="mt-3 max-w-md text-sm leading-6 text-primary-foreground/65">Check in each day to keep your account active and claim your daily reward.</p><Button data-testid="button-claim-checkin" onClick={onCheckin} disabled={!canCheckin || checkingIn} className="mt-7 bg-accent text-primary hover:bg-accent/90">{checkingIn ? 'Crediting…' : canCheckin ? 'Claim today’s reward' : 'Checked in today'}<Check className="size-4" /></Button></div></div><div className="rounded-3xl border border-border bg-card p-7"><div className="flex items-center justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Withdrawable</div><div className="mt-3 font-display text-3xl font-semibold">{money(user?.wallet, currency)}</div></div><div className="grid size-11 place-items-center rounded-2xl bg-accent/20 text-accent-foreground"><ArrowDownToLine className="size-5" /></div></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Minimum withdrawal is {money(7000, currency)}. Requests are reviewed and paid manually.</p><Button data-testid="button-request-withdrawal" onClick={onWithdraw} variant="outline" className="mt-6 w-full" disabled={!dashboard?.canWithdraw}>Request withdrawal <ArrowUpRight className="size-4" /></Button></div></div>
      <div className="mt-5 rounded-3xl border border-border bg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-2xl font-semibold">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">The latest movement across your account.</p></div><Activity className="size-5 text-accent-foreground" /></div><ActivityTable transactions={dashboard?.transactions || []} currency={currency} /></div>
    </QueryState></div>;
}

function Metric({ label, value, icon: Icon, accent = false }: { label: string; value: string; icon: typeof Wallet; accent?: boolean }) {
  return <div className={`rounded-2xl border p-5 ${accent ? 'border-accent/50 bg-accent/10' : 'border-border bg-card'}`}><div className="flex items-start justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><Icon className={`size-4 ${accent ? 'text-accent-foreground' : 'text-muted-foreground'}`} /></div><div className="mt-5 font-display text-2xl font-semibold tracking-tight">{value}</div></div>;
}

function ProductsView(props: { products?: Product[]; loading: boolean; error: boolean; onBuy: (product: Product) => void; currency: string }) {
  return <PlanCatalogue {...props} />;
}

function PurchasesView({ purchases, loading, error, currency }: { purchases?: any[]; loading: boolean; error: boolean; currency: string }) {
  return <div className="animate-rise"><PageHeading eyebrow="Portfolio" title="My purchases." copy="Every plan you have started, with its current verification and earning status." /><QueryState loading={loading} error={error} empty={!purchases?.length}><div className="overflow-hidden rounded-3xl border border-border bg-card"><div className="hidden grid-cols-[1.4fr_.8fr_.8fr_.8fr] gap-4 border-b border-border bg-secondary/60 px-6 py-4 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground sm:grid"><span>Plan</span><span>Amount</span><span>Earned</span><span>Status</span></div>{purchases?.map(purchase => <div key={purchase.id} data-testid={`row-purchase-${purchase.id}`} className="grid gap-3 border-b border-border p-5 last:border-0 sm:grid-cols-[1.4fr_.8fr_.8fr_.8fr] sm:items-center sm:gap-4 sm:px-6"><div><div className="font-semibold">{purchase.productName}</div><div className="mt-1 text-xs text-muted-foreground">Started {shortDate(purchase.purchasedAt)}</div></div><div className="font-mono text-sm">{money(purchase.amount, currency)}</div><div className="font-mono text-sm text-accent-foreground">{money(purchase.earningsCredited, currency)}</div><div><StatusPill status={purchase.status} /></div></div>)}</div></QueryState></div>;
}

function ReferralView({ referrals, loading, error, currency }: { referrals?: any; loading: boolean; error: boolean; currency: string }) {
  const { toast } = useToast();
  const [level, setLevel] = useState<'all' | '1' | '2' | '3'>('all');
  const members = referrals?.members || [];
  const counts = {
    all: referrals?.teamSize || members.length,
    '1': members.filter((member: any) => member.level === 1).length,
    '2': members.filter((member: any) => member.level === 2).length,
    '3': members.filter((member: any) => member.level === 3).length,
  };
  const filteredMembers = level === 'all' ? members : members.filter((member: any) => String(member.level) === level);
  const copy = () => { if (referrals?.link) navigator.clipboard?.writeText(referrals.link); toast({ title: 'Referral link copied', description: 'Share it with someone who values a steadier pace.' }); };
  const filters = [
    { id: 'all' as const, label: 'Total members' },
    { id: '1' as const, label: 'Level 1' },
    { id: '2' as const, label: 'Level 2' },
    { id: '3' as const, label: 'Level 3' },
  ];
  return <div className="animate-rise"><PageHeading eyebrow="Your circle" title="Grow together." copy="Invite people you trust and earn referral commissions as your circle becomes active." /><QueryState loading={loading} error={error}><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{filters.map(filter => <button data-testid={`button-referral-level-${filter.id}`} key={filter.id} type="button" onClick={() => setLevel(filter.id)} className={`rounded-2xl border p-4 text-left transition sm:p-5 ${level === filter.id ? 'border-accent bg-accent/10 shadow-sm' : 'border-border bg-card hover:border-accent/50'}`}><div className="text-2xl font-semibold tracking-tight">{counts[filter.id]}</div><div className="mt-1 text-xs font-semibold text-muted-foreground">{filter.label}</div></button>)}</div><div className="mt-5 grid gap-5 md:grid-cols-2"><Metric label="Direct referrals" value={String(referrals?.directReferrals || 0)} icon={UserRound} /><Metric label="Commissions" value={money((referrals?.commissions || []).reduce((sum: number, item: any) => sum + item.amount, 0), currency)} icon={Gift} accent /></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl bg-primary p-7 text-primary-foreground"><div className="flex items-center gap-2 text-accent"><Link2 className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[.18em]">Your invite link</span></div><div className="mt-6 break-all font-mono text-sm text-primary-foreground/80">{referrals?.link || 'Your referral link will appear here.'}</div><Button data-testid="button-copy-referral" onClick={copy} className="mt-7 bg-accent text-primary hover:bg-accent/90"><Copy className="size-4" /> Copy link</Button></div><div className="rounded-3xl border border-border bg-card p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl font-semibold">Members</h2><p className="mt-1 text-sm text-muted-foreground">{level === 'all' ? 'Everyone in your referral circle.' : `People in level ${level}.`}</p></div><Users className="size-5 text-accent-foreground" /></div><div className="mt-5 space-y-3">{filteredMembers.length ? filteredMembers.slice(0, 10).map((member: any) => <div key={member.id} data-testid={`row-referral-${member.id}`} className="flex items-center justify-between rounded-2xl bg-secondary/60 p-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-accent/20 font-mono text-xs text-accent-foreground">{member.phone.slice(-2)}</div><div><div className="text-sm font-semibold">{member.phone}</div><div className="text-xs text-muted-foreground">Level {member.level} · {shortDate(member.createdAt)}</div></div></div><ChevronRight className="size-4 text-muted-foreground" /></div>) : <Empty icon={Users} title="No members in this level" copy="Share your invite link to grow this part of your circle." />}</div></div></div></QueryState></div>;
}

function AccountView({ user, settings, withdrawals, loading, error, currency, onWithdraw }: { user: User; settings?: Settings; withdrawals?: any[]; loading: boolean; error: boolean; currency: string; onWithdraw: () => void }) {
  const groupUrl = settings?.telegramUrl || 'https://t.me/+zNDnaz_xKfdiMTlk';
  const adminHandle = settings?.supportHandle || '@phio333';
  const adminUrl = `https://t.me/${adminHandle.replace(/^@/, '')}`;
  return <div className="animate-rise"><PageHeading eyebrow="Account" title="Your details." copy="Keep your member information close and follow every withdrawal request through review." action={<div className="flex flex-wrap gap-2"><a data-testid="button-customer-support-group" href={groupUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent/10"><MessageCircle className="size-4" /> Telegram group</a><a data-testid="button-customer-support-admin" href={adminUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent/10"><UserRound className="size-4" /> Talk to admin {adminHandle}</a><Button data-testid="button-account-withdraw" onClick={onWithdraw}><ArrowDownToLine className="size-4" /> Withdraw</Button></div>} /><div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><div className="rounded-3xl border border-border bg-card p-7"><div className="grid size-14 place-items-center rounded-2xl bg-primary font-display text-xl text-accent">{user.phone.slice(-2)}</div><h2 className="mt-5 font-display text-2xl font-semibold">{user.phone}</h2><p className="mt-1 text-sm text-muted-foreground">Member since {shortDate(user.createdAt)}</p><div className="gold-rule my-6" /><div className="space-y-4"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Referral code</span><span data-testid="text-account-referral-code" className="font-mono font-semibold">{user.referralCode}</span></div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Available balance</span><span data-testid="text-account-wallet" className="font-mono font-semibold">{money(user.wallet, currency)}</span></div><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Lifetime earned</span><span className="font-mono font-semibold text-accent-foreground">{money(user.totalEarned, currency)}</span></div></div></div><div><h2 className="mb-4 font-display text-2xl font-semibold">Withdrawal history</h2><QueryState loading={loading} error={error} empty={!withdrawals?.length}><div className="space-y-3">{withdrawals?.map(item => <div key={item.id} data-testid={`row-withdrawal-${item.id}`} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono font-semibold">{money(item.amount, currency)}</div><div className="mt-1 text-xs text-muted-foreground">{item.method} · {item.phone} · {shortDate(item.createdAt)}</div></div><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Net {money(item.netAmount, currency)}</span><StatusPill status={item.status} /></div></div>)}</div></QueryState></div></div></div>;
}

function ActivityTable({ transactions, currency }: { transactions: any[]; currency: string }) {
  if (!transactions.length) return <Empty icon={Activity} title="No transactions yet" copy="Your plan and wallet activity will be recorded here." />;
  return <div className="space-y-2">{transactions.slice(0, 5).map(item => <div key={item.id} data-testid={`row-transaction-${item.id}`} className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-secondary/60"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-secondary"><ArrowUpRight className="size-4 text-accent-foreground" /></div><div><div className="text-sm font-semibold capitalize">{item.type.replaceAll('_', ' ')}</div><div className="text-xs text-muted-foreground">{shortDate(item.createdAt)}</div></div></div><div className="font-mono text-sm font-semibold">{money(item.amount, currency)}</div></div>)}</div>;
}

function PaymentModal({ product, settings, values, setValues, onClose, onSubmit, pending, error }: { product: Product; settings?: Settings; values: { method: string; payerPhone: string; transactionId: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error?: boolean }) {
  return <Modal title={`Activate ${product.name}`} onClose={onClose} wide><div className="rounded-2xl bg-primary p-5 text-primary-foreground"><div className="flex items-center justify-between"><span className="text-sm text-primary-foreground/65">Amount to send</span><span className="font-display text-2xl font-semibold">{money(product.price, settings?.currency)}</span></div><div className="mt-4 flex items-start gap-2 text-xs leading-5 text-primary-foreground/65"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />Payments are manually verified. Sending money does not activate a plan until an administrator confirms your transaction.</div></div><div className="my-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border p-4"><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">MTN Mobile Money</div><div className="mt-2 font-mono text-lg font-semibold">{settings?.mtnNumber || 'Number provided by admin'}</div><div className="mt-1 text-xs text-muted-foreground">{settings?.payeeName || 'Grand Crown'}</div></div><div className="rounded-2xl border border-border p-4"><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Airtel Money</div><div className="mt-2 font-mono text-lg font-semibold">{settings?.airtelNumber || 'Number provided by admin'}</div><div className="mt-1 text-xs text-muted-foreground">Use the exact amount above</div></div></div><form onSubmit={onSubmit} className="space-y-4"><label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Payment method</span><select data-testid="select-payment-method" className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none" value={values.method} onChange={e => setValues({ ...values, method: e.target.value })}><option>MTN Mobile Money</option><option>Airtel Money</option></select></label><Field label="Payer phone number" data-testid="input-payer-phone" value={values.payerPhone} onChange={e => setValues({ ...values, payerPhone: e.target.value })} required /><Field label="Mobile-money transaction ID" data-testid="input-transaction-id" placeholder="Paste the reference from your confirmation" value={values.transactionId} onChange={e => setValues({ ...values, transactionId: e.target.value })} required />{error && <p className="text-sm text-destructive">We could not submit this reference. Please confirm the details and try again.</p>}<Button data-testid="button-submit-payment" type="submit" className="w-full" disabled={pending}>{pending ? 'Sending for review…' : 'Submit for manual review'}<ArrowUpRight className="size-4" /></Button></form></Modal>;
}

function WithdrawModal({ balance, currency, values, setValues, onClose, onSubmit, pending, error }: { balance: number; currency: string; values: { amount: string; method: string; phone: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error?: boolean }) {
  return <Modal title="Request a withdrawal" onClose={onClose}><div className="rounded-2xl bg-secondary p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Available balance</span><span className="font-mono font-semibold">{money(balance, currency)}</span></div><div className="mt-2 flex justify-between"><span className="text-muted-foreground">Minimum request</span><span className="font-mono font-semibold">{money(7000, currency)}</span></div></div><form onSubmit={onSubmit} className="mt-6 space-y-4"><Field label="Amount" data-testid="input-withdrawal-amount" type="number" min="7000" max={balance} placeholder="7000" value={values.amount} onChange={e => setValues({ ...values, amount: e.target.value })} required /><label className="block space-y-2"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">Payment method</span><select data-testid="select-withdrawal-method" className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none" value={values.method} onChange={e => setValues({ ...values, method: e.target.value })}><option>MTN Mobile Money</option><option>Airtel Money</option></select></label><Field label="Mobile-money number" data-testid="input-withdrawal-phone" type="tel" value={values.phone} onChange={e => setValues({ ...values, phone: e.target.value })} required /><p className="text-xs leading-5 text-muted-foreground">Withdrawals are reviewed by our team and paid manually. You will see the status in your account.</p>{error && <p className="text-sm text-destructive">We could not create that request. Check the amount and try again.</p>}<Button data-testid="button-submit-withdrawal" type="submit" className="w-full" disabled={pending}>{pending ? 'Submitting…' : 'Send withdrawal request'}</Button></form></Modal>;
}

function AdminShell({ active, setActive, children, onLogout }: { active: string; setActive: (value: string) => void; children: ReactNode; onLogout: () => void }) {
  const items = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine },
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
  return <main className="grain grid min-h-[100dvh] place-items-center bg-primary p-5"><div className="absolute left-8 top-8"><Logo /></div><div className="w-full max-w-md animate-rise rounded-3xl border border-sidebar-border bg-card p-7 shadow-2xl sm:p-9"><div className="mb-8"><div className="mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-primary"><ShieldCheck className="size-6" /></div><div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Restricted console</div><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Admin sign in.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Review member activity and keep every manual payment accountable.</p></div><form onSubmit={submit} className="space-y-4"><Field label="Username" autoComplete="username" data-testid="input-console-username" value={username} onChange={e => setUsername(e.target.value)} required /><Field label="Password" autoComplete="current-password" data-testid="input-console-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />{!!login.error && <p data-testid="status-admin-error" className="text-sm text-destructive">Those credentials did not match.</p>}<Button data-testid="button-console-login" className="mt-2 w-full" disabled={login.isPending}>{login.isPending ? 'Verifying…' : 'Enter console'}<ArrowUpRight className="size-4" /></Button></form><button data-testid="button-back-to-member" onClick={() => setLocation('/')} className="mt-6 flex w-full items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ChevronRight className="size-3 rotate-180" /> Back to member sign in</button></div></main>;
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
  const reviewPayment = useReviewPayment();
  const reviewWithdrawal = useReviewWithdrawal();
  const creditUser = useCreditUser();
  const debitUser = useDebitUser();
  const banUser = useBanUser();
  const deleteUser = useDeleteUser();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateSettings = useUpdateAdminSettings();
  const [modal, setModal] = useState<'product' | 'settings' | 'credit' | 'debit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userAmount, setUserAmount] = useState('');
  const [userNote, setUserNote] = useState('');
  const [product, setProduct] = useState({ name: '', price: '', daily: '', total: '', days: '' });
  const [siteSettings, setSiteSettings] = useState({ brand: '', currency: '', supportHandle: '', telegramUrl: '', airtelNumber: '', mtnNumber: '', payeeName: '' });
  const { toast } = useToast();
  const approvePayment = (id: string, action: 'approve' | 'reject') => reviewPayment.mutate({ id, data: { action } }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: `Payment ${action}d`, description: 'The deposit queue has been updated.' }); } });
  const approveWithdrawal = (id: string, action: 'approve' | 'reject') => reviewWithdrawal.mutate({ id, data: { action } }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: `Withdrawal ${action}d`, description: 'The withdrawal queue has been updated.' }); } });
  const saveProduct = (event: FormEvent) => { event.preventDefault(); createProduct.mutate({ data: { name: product.name, price: Number(product.price), daily: Number(product.daily), total: Number(product.total), days: Number(product.days) } }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); setProduct({ name: '', price: '', daily: '', total: '', days: '' }); toast({ title: 'Product created' }); } }); };
  const saveSettings = (event: FormEvent) => { event.preventDefault(); updateSettings.mutate({ data: siteSettings }, { onSuccess: () => { queryClient.invalidateQueries(); setModal(null); toast({ title: 'Settings saved' }); } }); };
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
  else if (active === 'deposits') view = <AdminListPage eyebrow="Manual review" title="Deposits." copy="Verify mobile-money references before activating a plan." loading={payments.isLoading} error={!!payments.error} empty={!payments.data?.length}><AdminPayments payments={payments.data || []} onReview={approvePayment} /></AdminListPage>;
  else if (active === 'withdrawals') view = <AdminListPage eyebrow="Manual payout queue" title="Withdrawals." copy="Review member requests and confirm payments outside this system." loading={withdrawals.isLoading} error={!!withdrawals.error} empty={!withdrawals.data?.length}><AdminWithdrawals withdrawals={withdrawals.data || []} onReview={approveWithdrawal} /></AdminListPage>;
  else if (active === 'products') view = <AdminListPage eyebrow="Earning catalogue" title="Products." copy="Set the fixed earning plans available to members." action={<Button data-testid="button-new-product" onClick={() => setModal('product')}><Plus className="size-4" /> New product</Button>} loading={products.isLoading} error={!!products.error} empty={!products.data?.length}><AdminProducts products={products.data || []} onDelete={(id) => deleteProduct.mutate({ id }, { onSuccess: () => { queryClient.invalidateQueries(); toast({ title: 'Product removed' }); } })} /></AdminListPage>;
  else if (active === 'transactions') view = <AdminListPage eyebrow="Ledger" title="Transactions." copy="A complete record of wallet movement." loading={transactions.isLoading} error={!!transactions.error} empty={!transactions.data?.length}><AdminTransactions transactions={transactions.data || []} /></AdminListPage>;
  else if (active === 'referrals') view = <AdminListPage eyebrow="Network health" title="Referrals." copy="The current shape of member-led growth." loading={referrals.isLoading} error={!!referrals.error} empty={!referrals.data}><AdminReferrals referrals={referrals.data} /></AdminListPage>;
  else if (active === 'gift-codes') view = <AdminInfoPage eyebrow="Member rewards" title="Gift codes." copy="Gift-code management is ready as a dedicated admin area." title2="Gift codes are not active yet" body="No gift codes have been created. When codes are enabled, this is where administrators will create and review them." />;
  else if (active === 'messages') view = <AdminSupportPage settings={settings.data} />;
  else if (active === 'countries') view = <AdminInfoPage eyebrow="Platform reach" title="Countries." copy="Review the countries currently supported by the platform." title2="Uganda" body="Grand Crown is currently configured for Uganda and UGX mobile-money payments." />;
  else if (active === 'admins') view = <AdminInfoPage eyebrow="Access control" title="Admins." copy="Review administrator access for this console." title2="Administrator access is active" body="The current administrator session is active. Add separate administrator accounts when multi-admin access is configured." />;
  else if (active === 'activity') view = <AdminListPage eyebrow="Audit trail" title="Activity." copy="Recent actions across the Grand Crown console." loading={activity.isLoading} error={!!activity.error} empty={!activity.data?.length}><AdminActivity activity={activity.data || []} /></AdminListPage>;
  else if (active === 'settings') view = <AdminListPage eyebrow="Configuration" title="Settings." copy="Control the member-facing payment instructions and brand details." action={<Button data-testid="button-edit-settings" onClick={() => { if (settings.data) setSiteSettings({ ...siteSettings, ...settings.data }); setModal('settings'); }}><Settings2 className="size-4" /> Edit settings</Button>} loading={settings.isLoading} error={!!settings.error}><SettingsCard settings={settings.data} /></AdminListPage>;
  else view = <AdminOverview dashboard={dashboard.data} loading={dashboard.isLoading} error={!!dashboard.error} onReview={() => setActive('deposits')} />;
  return <>{view}{modal === 'product' && <AdminProductModal values={product} setValues={setProduct} onClose={() => setModal(null)} onSubmit={saveProduct} pending={createProduct.isPending} error={!!createProduct.error} />}{modal === 'settings' && <AdminSettingsModal values={siteSettings} setValues={setSiteSettings} onClose={() => setModal(null)} onSubmit={saveSettings} pending={updateSettings.isPending} error={!!updateSettings.error} />}{(modal === 'credit' || modal === 'debit') && selectedUser && <AdminUserWalletModal action={modal} user={selectedUser} amount={userAmount} note={userNote} setAmount={setUserAmount} setNote={setUserNote} onClose={() => { setModal(null); setSelectedUser(null); }} onSubmit={saveUserWallet} pending={creditUser.isPending || debitUser.isPending} error={!!creditUser.error || !!debitUser.error} />}</>;
}

function AdminListPage({ eyebrow, title, copy, action, loading, error, empty, children }: { eyebrow: string; title: string; copy: string; action?: ReactNode; loading: boolean; error: boolean; empty?: boolean; children: ReactNode }) {
  return <div className="animate-rise"><PageHeading eyebrow={eyebrow} title={title} copy={copy} action={action} /><QueryState loading={loading} error={error} empty={empty}>{children}</QueryState></div>;
}

function AdminProductModal({ values, setValues, onClose, onSubmit, pending, error }: { values: { name: string; price: string; daily: string; total: string; days: string }; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error: boolean }) {
  return <Modal title="Create an earning plan" onClose={onClose}><form onSubmit={onSubmit} className="space-y-4"><Field label="Plan name" data-testid="input-product-name" placeholder="e.g. Crown Builder" value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} required /><div className="grid gap-4 sm:grid-cols-2"><Field label="Price" data-testid="input-product-price" type="number" min="1" value={values.price} onChange={e => setValues({ ...values, price: e.target.value })} required /><Field label="Daily earning" data-testid="input-product-daily" type="number" min="0" value={values.daily} onChange={e => setValues({ ...values, daily: e.target.value })} required /><Field label="Total earning" data-testid="input-product-total" type="number" min="0" value={values.total} onChange={e => setValues({ ...values, total: e.target.value })} required /><Field label="Term in days" data-testid="input-product-days" type="number" min="1" value={values.days} onChange={e => setValues({ ...values, days: e.target.value })} required /></div>{error && <p className="text-sm text-destructive">Product could not be created. Confirm each value and try again.</p>}<Button data-testid="button-submit-product" type="submit" className="w-full" disabled={pending}>{pending ? 'Creating…' : 'Create product'}<Plus className="size-4" /></Button></form></Modal>;
}

function AdminSettingsModal({ values, setValues, onClose, onSubmit, pending, error }: { values: Record<string, string>; setValues: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error: boolean }) {
  return <Modal title="Edit platform settings" onClose={onClose} wide><form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2"><Field label="Brand" data-testid="input-settings-brand" value={values.brand} onChange={e => setValues({ ...values, brand: e.target.value })} /><Field label="Currency" data-testid="input-settings-currency" value={values.currency} onChange={e => setValues({ ...values, currency: e.target.value })} /><Field label="MTN number" data-testid="input-settings-mtn" value={values.mtnNumber} onChange={e => setValues({ ...values, mtnNumber: e.target.value })} /><Field label="Airtel number" data-testid="input-settings-airtel" value={values.airtelNumber} onChange={e => setValues({ ...values, airtelNumber: e.target.value })} /><Field label="Payee name" data-testid="input-settings-payee" value={values.payeeName} onChange={e => setValues({ ...values, payeeName: e.target.value })} /><Field label="Support handle" data-testid="input-settings-support" value={values.supportHandle} onChange={e => setValues({ ...values, supportHandle: e.target.value })} /><Field label="Telegram URL" data-testid="input-settings-telegram" value={values.telegramUrl} onChange={e => setValues({ ...values, telegramUrl: e.target.value })} /><div className="sm:col-span-2">{error && <p className="mb-3 text-sm text-destructive">Settings could not be saved.</p>}<Button data-testid="button-submit-settings" type="submit" className="w-full" disabled={pending}>{pending ? 'Saving…' : 'Save settings'}<Check className="size-4" /></Button></div></form></Modal>;
}

function AdminOverview({ dashboard, loading, error, onReview }: { dashboard?: any; loading: boolean; error: boolean; onReview: () => void }) {
  const stats = [
    ['Total users', dashboard?.users || 0, false],
    ['Active users', dashboard?.users || 0, false],
    ['Banned users', 0, false],
    ['Wallet balances', money(dashboard?.walletBalances), true],
    ['Total deposited', money(dashboard?.totalDeposited), true],
    ['Total withdrawn', money(dashboard?.totalWithdrawn), true],
    ['Total invested', money(dashboard?.totalInvested), true],
    ['Active plans', dashboard?.purchases || 0, false],
    ['Pending deposits', dashboard?.payments || 0, false],
    ['Pending withdrawals', dashboard?.withdrawals || 0, false],
  ];
  return <div className="animate-rise">
    <div className="mb-5 flex items-center justify-between px-4 sm:px-0"><div><div className="text-2xl font-extrabold tracking-tight text-slate-900">Overview</div><p className="mt-1 text-sm text-slate-500">A live view of the Grand Crown platform.</p></div><Button data-testid="button-review-deposits" onClick={onReview} className="bg-[#ef7815] text-white shadow-none hover:bg-[#db690b]"><Eye className="size-4" /><span className="hidden sm:inline">Review queue</span></Button></div>
    <QueryState loading={loading} error={error}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">{stats.map(([label, value, isMoney]) => <div key={String(label)} className="min-h-[94px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:min-h-[108px] sm:p-5"><div className={`font-extrabold leading-tight tracking-tight text-slate-900 ${isMoney ? 'text-[18px] sm:text-[21px]' : 'text-[25px] sm:text-[30px]'}`}>{value}</div><div className="mt-2 text-[12px] font-medium text-slate-500 sm:text-[13px]">{label}</div></div>)}</div>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Grand Crown available balance</h2><p className="mt-1 text-sm text-slate-500">Wallet funds currently visible across member accounts.</p></div><div className="rounded-xl bg-[#fff1e7] p-3 text-[#ef7815]"><Wallet className="size-5" /></div></div><div className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{money(dashboard?.walletBalances)}</div></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.03)] sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Platform pulse</h2><p className="mt-1 text-sm text-slate-500">The numbers behind the circle.</p></div><BarChart3 className="size-5 text-slate-400" /></div><div className="grid gap-3 sm:grid-cols-2">{[['Purchases', dashboard?.purchases], ['Pending deposits', dashboard?.payments], ['Withdrawals', dashboard?.withdrawals], ['Ledger entries', dashboard?.transactions], ['Active products', dashboard?.products], ['Total invested', money(dashboard?.totalInvested)]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#f4f7fb] p-4"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-2 font-mono text-xl font-semibold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value || '0'}</div></div>)}</div></div><div className="rounded-2xl bg-slate-900 p-6 text-white"><div className="flex items-center gap-2 text-[#f4a261]"><ShieldCheck className="size-4" /><span className="text-[10px] font-bold uppercase tracking-[.16em]">Human-first operations</span></div><h2 className="mt-6 text-3xl font-extrabold leading-tight">Trust lives in the review.</h2><p className="mt-4 text-sm leading-6 text-white/60">Every deposit and withdrawal is intentionally held for an administrator to verify.</p><div className="my-6 h-px bg-white/15" /><div className="flex items-center gap-3 text-sm text-white/70"><Clock3 className="size-4 text-[#f4a261]" /> {dashboard?.payments || 0} deposit reviews in the system</div></div></div>
    </QueryState>
  </div>;
}

function AdminUsers({ users, onCredit, onDebit, onToggleBan, onDelete }: { users: any[]; onCredit: (user: any) => void; onDebit: (user: any) => void; onToggleBan: (user: any) => void; onDelete: (user: any) => void }) {
  return <div className="overflow-hidden rounded-3xl border border-border bg-card">{users.map(user => <div key={user.id} data-testid={`row-admin-user-${user.id}`} className="flex flex-col gap-4 border-b border-border p-5 last:border-0 sm:px-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-full font-mono text-xs ${user.banned ? 'bg-red-100 text-red-700' : 'bg-accent/20 text-accent-foreground'}`}>{user.phone.slice(-2)}</div><div><div className="flex flex-wrap items-center gap-2 font-semibold"><span>{user.phone}</span>{user.banned && <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">Banned</span>}</div><div className="text-xs text-muted-foreground">Joined {shortDate(user.createdAt)} · Ref {user.referralCode}</div></div></div><div className="flex flex-wrap items-center gap-5 text-right"><div><div className="text-xs text-muted-foreground">Balance</div><div className="font-mono text-sm">{money(user.wallet)}</div></div><div><div className="text-xs text-muted-foreground">Earned</div><div className="font-mono text-sm text-accent-foreground">{money(user.totalEarned)}</div></div></div></div><div className="flex flex-wrap gap-2 border-t border-border/70 pt-3"><Button data-testid={`button-credit-user-${user.id}`} onClick={() => onCredit(user)} className="min-h-9 bg-emerald-600 px-3 text-xs text-white shadow-none hover:bg-emerald-700"><Plus className="size-3.5" /> Credit</Button><Button data-testid={`button-debit-user-${user.id}`} onClick={() => onDebit(user)} variant="outline" className="min-h-9 px-3 text-xs"><Minus className="size-3.5" /> Debit</Button><Button data-testid={`button-ban-user-${user.id}`} onClick={() => onToggleBan(user)} variant="outline" className="min-h-9 px-3 text-xs"><Ban className="size-3.5" /> {user.banned ? 'Unban' : 'Ban'}</Button><Button data-testid={`button-delete-user-${user.id}`} onClick={() => onDelete(user)} variant="danger" className="min-h-9 px-3 text-xs"><UserX className="size-3.5" /> Delete</Button></div></div>)}</div>;
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
  const handle = settings?.supportHandle || '@phio333';
  const adminUrl = `https://t.me/${handle.replace(/^@/, '')}`;
  return <div className="animate-rise"><PageHeading eyebrow="Customer support" title="Messages." copy="Open the two configured Telegram support channels for member conversations." /><div className="grid gap-4 md:grid-cols-2"><a href={groupUrl} target="_blank" rel="noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-[#ef7815] hover:shadow-sm"><MessageCircle className="size-6 text-[#ef7815]" /><h2 className="mt-5 text-xl font-extrabold text-slate-900">Telegram group</h2><p className="mt-2 text-sm leading-6 text-slate-500">Open the Grand Crown member support group.</p><span className="mt-5 inline-flex text-sm font-bold text-[#ef7815]">Open group <ArrowUpRight className="ml-1 size-4" /></span></a><a href={adminUrl} target="_blank" rel="noreferrer" className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-[#ef7815] hover:shadow-sm"><UserRound className="size-6 text-[#ef7815]" /><h2 className="mt-5 text-xl font-extrabold text-slate-900">Talk to admin {handle}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Open a direct Telegram conversation with the administrator.</p><span className="mt-5 inline-flex text-sm font-bold text-[#ef7815]">Message admin <ArrowUpRight className="ml-1 size-4" /></span></a></div></div>;
}

function AdminUserWalletModal({ action, user, amount, note, setAmount, setNote, onClose, onSubmit, pending, error }: { action: 'credit' | 'debit'; user: any; amount: string; note: string; setAmount: (value: string) => void; setNote: (value: string) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; pending: boolean; error: boolean }) {
  return <Modal title={`${action === 'credit' ? 'Credit' : 'Debit'} ${user.phone}`} onClose={onClose}><div className="rounded-2xl bg-secondary p-4 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Current balance</span><span className="font-mono font-semibold">{money(user.wallet)}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{action === 'credit' ? 'The amount will be added to the member wallet and lifetime earned total.' : 'The amount will be removed from the member wallet. Debit cannot exceed the current balance.'}</p></div><form onSubmit={onSubmit} className="mt-6 space-y-4"><Field label="Amount (UGX)" data-testid={`input-${action}-user-amount`} type="number" min="1" max={action === 'debit' ? user.wallet : undefined} value={amount} onChange={e => setAmount(e.target.value)} required /><Field label="Note (optional)" data-testid={`input-${action}-user-note`} placeholder="Reason for this adjustment" value={note} onChange={e => setNote(e.target.value)} />{error && <p className="text-sm text-destructive">The balance adjustment could not be completed. Check the amount and try again.</p>}<Button data-testid={`button-submit-${action}-user`} type="submit" className="w-full" disabled={pending}>{pending ? 'Saving…' : `${action === 'credit' ? 'Credit' : 'Debit'} user`}<Check className="size-4" /></Button></form></Modal>;
}
function AdminPayments({ payments, onReview }: { payments: any[]; onReview: (id: string, action: 'approve' | 'reject') => void }) { return <div className="space-y-3">{payments.map(payment => <div key={payment.id} data-testid={`row-admin-payment-${payment.id}`} className="rounded-2xl border border-border bg-card p-5 sm:flex sm:items-center sm:justify-between"><div><div className="font-semibold">{payment.productName} <StatusPill status={payment.status} /></div><div className="mt-2 text-xs text-muted-foreground">{payment.payerPhone} · {payment.method} · Ref <span className="font-mono text-foreground">{payment.transactionId}</span></div><div className="mt-1 text-xs text-muted-foreground">Submitted {shortDate(payment.createdAt)}</div></div><div className="mt-4 flex items-center gap-2 sm:mt-0">{payment.status === 'pending' ? <><Button data-testid={`button-approve-payment-${payment.id}`} onClick={() => onReview(payment.id, 'approve')} className="bg-accent text-primary hover:bg-accent/90"><Check className="size-4" /> Approve</Button><Button data-testid={`button-reject-payment-${payment.id}`} onClick={() => onReview(payment.id, 'reject')} variant="outline"><X className="size-4" /> Reject</Button></> : <span className="text-xs text-muted-foreground">Reviewed {shortDate(payment.reviewedAt)}</span>}</div></div>)}</div>; }
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