import { type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Crown, ShieldCheck } from 'lucide-react';

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

export function AuthLayout({
  mode,
  setMode,
  onAdmin,
  logo,
  logoSmall,
  form,
  toggle,
  admin,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  onAdmin: () => void;
  logo: ReactNode;
  logoSmall: ReactNode;
  form: ReactNode;
  toggle: ReactNode;
  admin: ReactNode;
}) {
  const login = mode === 'login';

  const formPanel = (
    <section
      className="gc-auth-form-panel"
      aria-label={login ? 'Member sign in' : 'Create member account'}
    >
      <header className="gc-auth-form-top">
        <div className="gc-auth-small-logo">{logoSmall}</div>
        <button
          type="button"
          data-testid="button-admin-access"
          onClick={onAdmin}
          className="gc-auth-admin"
        >
          <ShieldCheck size={15} />
          <span>Admin access</span>
        </button>
      </header>
      <div className="gc-auth-card">
        <div className="gc-auth-heading">
          <SwapText id={mode}>
            <div className="gc-auth-form-eyebrow">
              {login ? 'GRAND CROWN · MEMBER ACCESS' : 'A GRAND CROWN ACCOUNT'}
            </div>
            <h2>{login ? 'Login' : 'Sign up'}</h2>
            <p>
              {login
                ? 'Enter your phone number and password.'
                : 'Create your member account to get started.'}
            </p>
          </SwapText>
        </div>
        <div className="gc-auth-fields">{form}</div>
        <div className="gc-auth-mode-toggle">{toggle}</div>
        <div className="gc-auth-form-note">
          <ShieldCheck size={14} />
          Secure member access
        </div>
      </div>
    </section>
  );

  const brandPanel = (
    <section
      className="gc-auth-brand"
      aria-label={login ? 'Grand Crown welcome back' : 'Welcome to Grand Crown'}
    >
      <div className="gc-auth-brand-logo">{logo}</div>
      <div className="gc-auth-editorial">
        <SwapText id={mode}>
          <div className="gc-auth-kicker">
            <span className="gc-auth-kicker-line" />
            {login ? 'MEMBER PORTAL' : 'HOTEL & SUITES'}
          </div>
          <h1 className="gc-auth-brand-title">
            {login ? <>WELCOME<br />BACK!</> : <>WELCOME<br />TO GRAND CROWN.</>}
          </h1>
          <p className="gc-auth-brand-copy">
            {login
              ? 'Your Grand Crown member space is ready when you are.'
              : 'Your member account for Grand Crown Hotel & Suites.'}
          </p>
        </SwapText>
      </div>
    </section>
  );

  return (
    <main className={`gc-auth-shell gc-auth-mode-${mode}`}>
      <div className="gc-auth-grid-bg" aria-hidden />
      <div className="gc-auth-frame" data-testid={`panel-auth-${mode}`}>
        <div className="gc-auth-brand-cut" aria-hidden />
        <div className={`gc-auth-diagonal-line ${login ? 'is-login' : 'is-register'}`} aria-hidden />
        {login ? <>{formPanel}{brandPanel}</> : <>{brandPanel}{formPanel}</>}
      </div>
      {admin}
    </main>
  );
}