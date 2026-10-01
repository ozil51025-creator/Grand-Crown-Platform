import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Crown, ShieldCheck } from 'lucide-react';
import { assetUrl } from '@/components/plan-catalogue';

const SCENES = [
  { file: 'resort.jpg', name: 'The Resort', note: 'A considered welcome, from first arrival.' },
  { file: 'presidential-suite.jpg', name: 'Presidential Suite', note: 'Space to settle in.' },
  { file: 'garden-view.jpg', name: 'Garden View', note: 'A quieter view of the day.' },
  { file: 'sunset-view.jpg', name: 'Sunset View', note: 'The last light over the grounds.' },
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
          transition={{ duration: reduce ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
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
      <motion.div
        key={id}
        className={className}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: reduce ? 0 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      >
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
  const brand = (
    <section className="gc-auth-brand" aria-label="Grand Crown welcome">
      <AnimatePresence initial={false}>
        <motion.div
          key={current.file}
          className="gc-auth-scene"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 1.35, ease: 'easeInOut' }}
        >
          <img src={assetUrl(current.file)} alt="" className="gc-auth-photo" />
        </motion.div>
      </AnimatePresence>
      <div className="gc-auth-photo-shade" />
      <div className="gc-auth-brand-grid" aria-hidden />
      <div className="gc-auth-brand-content">
        <div className="gc-auth-brand-logo">{logo}</div>
        <div className="gc-auth-editorial">
          <div className="gc-auth-kicker"><span className="gc-auth-kicker-line" /> GRAND CROWN · HOTEL &amp; SUITES</div>
          <SwapText id={mode}>
            <h1 className="gc-auth-brand-title">
              {mode === 'login' ? <>Welcome<br /><em>back.</em></> : <>A place to<br /><em>begin.</em></>}
            </h1>
            <p className="gc-auth-brand-copy">
              {mode === 'login'
                ? 'Your Grand Crown member space, ready when you are.'
                : 'Create your member account to access your Grand Crown space.'}
            </p>
          </SwapText>
        </div>
      </div>
      <div className="gc-auth-brand-foot">
        <SwapText id={current.file} className="gc-auth-scene-caption">
          <span className="gc-auth-scene-name">{current.name}</span>
          <span className="gc-auth-scene-note">{current.note}</span>
        </SwapText>
        <div className="gc-auth-scene-dots" aria-hidden>
          {SCENES.map((s, i) => <span key={s.file} className={i === scene ? 'is-active' : ''} />)}
        </div>
        <div className="gc-auth-brand-footerline">
          <span>GRAND CROWN HOTEL &amp; SUITES</span>
          <span className="gc-auth-secure"><ShieldCheck size={14} /> Member access</span>
        </div>
      </div>
      <div className="gc-auth-diagonal" aria-hidden />
    </section>
  );

  const formPanel = (
    <section className="gc-auth-form-panel" aria-label={mode === 'login' ? 'Member sign in' : 'Create member account'}>
      <header className="gc-auth-form-top">
        <div className="gc-auth-small-logo">{logoSmall}</div>
        <button type="button" data-testid="button-admin-access" onClick={onAdmin} className="gc-auth-admin">
          <ShieldCheck size={15} /> <span>Admin access</span>
        </button>
      </header>
      <div className="gc-auth-card">
        <LayoutGroup id="auth-mode">
          <div role="tablist" aria-label="Choose sign in or create account" className="gc-auth-tabs">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                data-testid={`tab-auth-${m}`}
                onClick={() => setMode(m)}
                className={`gc-auth-tab ${mode === m ? 'is-selected' : ''}`}
              >
                {mode === m && <motion.span layoutId="auth-pill" transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }} className="gc-auth-tab-pill" />}
                <span className="gc-auth-tab-label">{m === 'login' ? 'Sign in' : 'Create account'}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <div className="gc-auth-heading">
          <SwapText id={mode}>
            <div className="gc-auth-form-eyebrow">{mode === 'login' ? 'MEMBER SIGN IN' : 'NEW MEMBER'}</div>
            <h2>{mode === 'login' ? 'Good to see you.' : 'Join Grand Crown.'}</h2>
            <p>{mode === 'login' ? 'Sign in to your member account.' : 'Set up your member account to get started.'}</p>
          </SwapText>
        </div>
        <div className="gc-auth-fields">{form}</div>
        {toggle}
        <div className="gc-auth-form-note"><ShieldCheck size={14} /> Secure member session</div>
      </div>
    </section>
  );

  return (
    <main className={`gc-auth-shell gc-auth-mode-${mode}`}>
      <div className="gc-auth-grid-bg" aria-hidden />
      <div className="gc-auth-frame">
        {mode === 'login' ? <>{formPanel}{brand}</> : <>{brand}{formPanel}</>}
      </div>
      {admin}
      <div className="gc-auth-bottom-mark" aria-hidden><Crown size={12} /> GRAND CROWN</div>
    </main>
  );
}