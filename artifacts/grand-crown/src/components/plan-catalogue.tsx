import type { Product } from '@workspace/api-client-react';
import { ArrowUpRight, CalendarDays, Coins, Crown, TrendingUp, Wallet, XCircle } from 'lucide-react';

const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
export const assetUrl = (file: string) => `${base}plans/${file}`;

const slug = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const KNOWN = ['garden-view', 'mountain-view', 'ocean-view', 'executive-room', 'deluxe-room', 'sunset-view', 'family-suite', 'silver-suite', 'honeymoon-suite', 'golden-suite', 'diamond-suite', 'royal-suite', 'presidential-suite'];
export const planImage = (name: string) => { const s = slug(name); return assetUrl(KNOWN.includes(s) ? `${s}.jpg` : 'resort.jpg'); };

// Poster-inspired tag colours (hue only), cycled by catalogue position
const TONES = ['152 52% 30%', '214 62% 38%', '186 58% 32%', '268 42% 42%', '30 62% 38%', '14 70% 46%', '330 58% 44%', '215 10% 38%', '352 66% 40%', '40 70% 40%', '208 70% 38%', '276 40% 40%', '42 64% 34%'];
export const planTone = (index: number) => TONES[index % TONES.length];

const fmt = (v: number, c: string) => `${c} ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Coins; label: string; value: string; tone: string }) {
  return <div className="min-w-0">
    <div className="flex items-center gap-1.5"><span className="grid size-6 shrink-0 place-items-center rounded-full text-white" style={{ background: `hsl(${tone})` }}><Icon className="size-3" /></span><span className="text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">{label}</span></div>
    <span className="mt-1.5 block font-mono text-xs font-semibold text-foreground">{value}</span>
  </div>;
}

export function PlanCatalogue({ products, loading, error, onBuy, currency }: { products?: Product[]; loading: boolean; error: boolean; onBuy: (product: Product) => void; currency: string }) {
  return <div className="animate-rise">
    <section className="relative -mx-5 -mt-5 mb-8 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-[28px]">
      <img src={assetUrl('resort.jpg')} alt="Illustrative sunset view of a resort pool" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(160_45%_8%/.92)] via-[hsl(160_45%_8%/.7)] to-[hsl(160_45%_8%/.15)]" />
      <div className="relative px-6 py-10 sm:px-10 sm:py-14">
        <Crown className="size-7 text-accent" />
        <div className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-accent sm:text-5xl">Grand Crown</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-[.4em] text-[hsl(40_40%_92%)]">Hotel &amp; Suites</div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[hsl(43_80%_62%)] to-[hsl(36_70%_48%)] px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-[hsl(160_45%_10%)]"><TrendingUp className="size-4" /> Investment packages</div>
        <p className="mt-4 max-w-md text-sm leading-6 text-[hsl(40_30%_88%/.85)]">Thirteen rooms and suites, each with a stated price, daily earning, total and term. Pick a package, pay by mobile money and submit the reference for manual verification.</p>
      </div>
    </section>

    {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[380px] animate-pulse rounded-3xl bg-secondary/70" />)}</div>
      : error ? <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"><div className="flex items-center gap-2 font-semibold"><XCircle className="size-4" /> We couldn't load the packages.</div><p className="mt-1 text-destructive/75">Check your connection and try again.</p></div>
      : !products?.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No packages are available right now.</div>
      : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product, index) => {
          const tone = planTone(index);
          const featured = index === products.length - 1 && products.length > 2;
          return <article key={product.id} data-testid={`card-product-${product.id}`} className={`group flex flex-col overflow-hidden rounded-3xl border-2 bg-card shadow-[0_10px_30px_hsl(160_40%_10%/.08)] transition duration-300 hover:-translate-y-1 ${featured ? 'md:col-span-2 xl:col-span-3 md:flex-row' : ''}`} style={{ borderColor: `hsl(${tone} / .35)`, background: `linear-gradient(180deg, hsl(${tone} / .07), hsl(var(--card)) 55%)` }}>
            <div className={`relative overflow-hidden ${featured ? 'aspect-[16/10] md:aspect-auto md:w-1/2' : 'aspect-[16/10]'}`}>
              <img src={planImage(product.name)} alt={`Illustrative ${product.name} interior`} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-white shadow-lg" style={{ background: `hsl(${tone})` }}>
                <span className="grid size-7 place-items-center rounded-full bg-white/95 font-display text-sm font-bold" style={{ color: `hsl(${tone})` }}>{index + 1}</span>
                <span className="font-display text-base font-semibold" data-testid={`text-product-name-${product.id}`}>{product.name}</span>
              </div>
            </div>
            <div className={`flex flex-1 flex-col p-5 ${featured ? 'md:p-8' : ''}`}>
              <div className="font-mono text-[10px] uppercase tracking-[.18em] text-muted-foreground">Package price</div>
              <div className="mt-1 font-display text-3xl font-bold" style={{ color: `hsl(${tone})` }} data-testid={`text-product-price-${product.id}`}>{fmt(product.price, currency)}</div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-4">
                <Stat icon={Coins} label="Daily" value={fmt(product.daily, currency)} tone={tone} />
                <Stat icon={Wallet} label="Total" value={fmt(product.total, currency)} tone={tone} />
                <Stat icon={CalendarDays} label="Term" value={`${product.days} days`} tone={tone} />
                <Stat icon={TrendingUp} label="Total vs price" value={product.price ? `${Math.round((product.total / product.price) * 100)}%` : '—'} tone={tone} />
              </div>
              <button data-testid={`button-buy-product-${product.id}`} onClick={() => onBuy(product)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(160_45%_14%)] px-4 text-sm font-semibold text-accent transition hover:bg-[hsl(160_45%_20%)]">Invest in this package <ArrowUpRight className="size-4" /></button>
            </div>
          </article>;
        })}
      </div>}
    <p className="mt-6 text-center text-[11px] text-muted-foreground" data-testid="text-illustrative-note">Pictures are illustrative. Earnings are as stated per package and subject to manual payment verification.</p>
  </div>;
}
