import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { assetUrl } from '@/components/plan-catalogue';

const SCENES = [
  { file: 'resort.jpg', name: 'The Resort', note: 'Evening light over the pool deck' },
  { file: 'presidential-suite.jpg', name: 'Presidential Suite', note: 'The crown of the collection' },
  { file: 'garden-view.jpg', name: 'Garden View', note: 'Where every circle begins' },
  { file: 'sunset-view.jpg', name: 'Sunset View', note: 'Golden hour, held a little longer' },
];

type Mode = 'login' | 'register';

export function AuthReveal({ show, children }: { show: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={reduce ? false : { opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -6 }}
          transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div className="pt-0.5">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SwapText({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={id} className={className}
        initial={reduce ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: reduce ? 0 : 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AuthLayout({ mode, setMode, onAdmin, logo, logoSmall, form, toggle, admin }: {
  mode: Mode; setMode: (m: Mode) => void; onAdmin: () => void; logo: ReactNode; logoSmall: ReactNode; form: ReactNode; toggle: ReactNode; admin: ReactNode;
}) {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setScene(s => (s + 1) % SCENES.length), 7000);
    return () => window.clearInterval(t);
  }, [reduce]);
  const current = SCENES[scene];
  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 30 };

  return (
    <main className="grain grid min-h-[100dvh] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-primary p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <AnimatePresence initial={false}>
          <motion.div key={current.file} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 1.6, ease: 'easeInOut' }}>
            <img src={assetUrl(current.file)} alt={`Illustrative ${current.name}`} className="auth-kenburns absolute inset-0 size-full object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(160_45%_8%/.85)] via-[hsl(160_45%_8%/.5)] to-[hsl(160_45%_6%/.94)]" />
        <div className="relative">
          {logo}
          <div className="mt-20 max-w-xl animate-rise">
            <div className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.25em] text-accent"><Sparkles className="size-3.5" /> Luxury stays · Investment packages</div>
            <h1 className="font-display text-6xl font-semibold leading-[.95] tracking-[-.04em] xl:text-8xl">Invest in comfort,<br /><span className="text-accent">invest in value.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-sidebar-foreground/70">Thirteen hotel-themed packages, from Garden View to the Presidential Suite, each with clearly stated terms, plus daily check-ins and a member circle.</p>
          </div>
        </div>
        <div className="relative">
          <div className="mb-6 flex items-end justify-between gap-6">
            <SwapText id={current.file}>
              <div className="font-mono text-[10px] uppercase tracking-[.22em] text-accent">Now showing</div>
              <div className="mt-1 font-display text-2xl font-semibold">{current.name}</div>
              <div className="text-sm text-sidebar-foreground/60">{current.note}</div>
            </SwapText>
            <div className="flex gap-1.5" aria-hidden>
              {SCENES.map((s, i) => <span key={s.file} className={`h-1.5 rounded-full transition-all duration-500 ${i === scene ? 'w-8 bg-accent' : 'w-1.5 bg-sidebar-foreground/30'}`} />)}
            </div>
          </div>
          <div className="flex items-end justify-between border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/55"><span>© Grand Crown Hotel &amp; Suites</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" /> Manual review, human trust</span></div>
        </div>
      </section>

      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background p-5 sm:p-10 lg:p-16">
        <span aria-hidden className="auth-orb -right-24 -top-24 size-72 bg-accent/25" />
        <span aria-hidden className="auth-orb -bottom-32 -left-20 size-80 bg-[hsl(171_34%_42%/.18)] [animation-delay:-6s]" />
        <div className="relative flex items-center justify-between lg:justify-end">
          <div className="lg:hidden [&_.text-sidebar-foreground]:text-primary">{logoSmall}</div>
          <button type="button" data-testid="button-admin-access" onClick={onAdmin} className="flex items-center gap-2 rounded-lg text-xs font-bold uppercase tracking-[.14em] text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"><ShieldCheck className="size-4" /> Admin access</button>
        </div>

        <div className="relative m-auto w-full max-w-md py-8 animate-rise">
          <div className="relative mb-7 h-40 overflow-hidden rounded-3xl lg:hidden">
            <img src={assetUrl('resort.jpg')} alt="Illustrative resort at sunset" className="auth-kenburns absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(160_45%_8%/.9)] to-[hsl(160_45%_8%/.15)]" />
            <div className="absolute bottom-4 left-5 right-5 text-sidebar-foreground">
              <div className="font-mono text-[10px] uppercase tracking-[.25em] text-accent">Grand Crown Hotel &amp; Suites</div>
              <div className="mt-1 font-display text-3xl font-semibold leading-none">Invest in <span className="text-accent">comfort.</span></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/80 bg-card/85 p-6 shadow-[0_30px_60px_-30px_hsl(160_45%_14%/.35)] backdrop-blur-xl sm:p-8">
            <LayoutGroup id="auth-mode">
              <div role="tablist" aria-label="Choose sign in or create account" className="mb-7 grid grid-cols-2 rounded-2xl bg-secondary p-1">
                {(['login', 'register'] as const).map(m => (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} data-testid={`tab-auth-${m}`} onClick={() => setMode(m)}
                    className={`relative min-h-10 rounded-xl text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent ${mode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {mode === m && <motion.span layoutId="auth-pill" transition={spring} className="absolute inset-0 rounded-xl bg-primary shadow-[0_8px_18px_-6px_hsl(var(--primary)/.5)]" />}
                    <span className="relative">{m === 'login' ? 'Sign in' : 'Create account'}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <div className="mb-6 min-h-[6.5rem]">
              <SwapText id={mode}>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent-foreground">{mode === 'login' ? 'Member sign in' : 'New member'}</div>
                <h2 className="font-display text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Good to see you.' : 'Start your circle.'}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{mode === 'login' ? 'Pick up where you left off.' : 'Create an account and choose your first earning plan.'}</p>
              </SwapText>
            </div>
            {form}
            {toggle}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-accent-foreground" /> Your account is protected by secure session access</div>
        </div>
      </section>
      {admin}
    </main>
  );
}
