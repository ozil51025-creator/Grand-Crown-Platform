import { useState } from 'react';
import { ArrowUpRight, Crown, Link2, LockKeyhole, Phone, ShieldCheck } from 'lucide-react';
import { AuthLayout, AuthReveal } from './AuthLayout';

type Mode = 'login' | 'register';
type Variant = 'current' | 'reference';

function PreviewLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${small ? 'size-9' : 'size-11'} relative grid place-items-center rounded-xl bg-accent text-primary`}>
        <Crown className="size-5" strokeWidth={2.2} />
      </div>
      <div>
        <div className="font-display text-xl font-semibold leading-none tracking-tight text-sidebar-foreground">Grand Crown</div>
        {!small && <div className="mt-1 font-mono text-[9px] uppercase tracking-[.26em] text-sidebar-foreground/55">Hotel &amp; Suites</div>}
      </div>
    </div>
  );
}

function CurrentField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-[.14em] text-muted-foreground">{label}</span>
      <input className="h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none" {...props} />
    </label>
  );
}

function ReferenceField({
  label,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: typeof Phone }) {
  return (
    <label className="gc-auth-ref-field">
      <span>{label}</span>
      <div className="gc-auth-ref-input">
        <input {...props} />
        <Icon size={14} aria-hidden="true" />
      </div>
    </label>
  );
}

function PreviewField({
  variant,
  label,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { variant: Variant; label: string; icon: typeof Phone }) {
  return variant === 'reference'
    ? <ReferenceField label={label} icon={icon} {...props} />
    : <CurrentField label={label} {...props} />;
}

export function AuthPreview({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'register'
      ? 'register'
      : 'login',
  );
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const Field = variant === 'reference' ? ReferenceField : CurrentField;

  return (
    <div className={variant === 'reference' ? 'gc-auth-reference-wrap' : undefined}>
      <AuthLayout
        mode={mode}
        setMode={setMode}
        onAdmin={() => setAdminOpen(true)}
        logo={<PreviewLogo />}
        logoSmall={<PreviewLogo small />}
        form={
          <form onSubmit={(event) => event.preventDefault()}>
            <PreviewField
              variant={variant}
              label="Mobile number"
              icon={Phone}
              type="tel"
              autoComplete="tel"
              placeholder="07xx xxx xxx"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <PreviewField
              variant={variant}
              label="Password"
              icon={LockKeyhole}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <AuthReveal show={mode === 'register'}>
              <PreviewField
                variant={variant}
                label="Referral code (optional)"
                icon={Link2}
                placeholder="GC-4L8P"
                value={referralCode}
                onChange={(event) => setReferralCode(event.target.value)}
              />
            </AuthReveal>
            <button data-testid="button-submit-auth" type="submit">
              {mode === 'login' ? 'Login' : 'Sign up'}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </form>
        }
        toggle={
          <button type="button" data-testid="button-toggle-auth-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <span>{mode === 'login' ? 'Sign up' : 'Login'}</span>
          </button>
        }
        admin={adminOpen && (
          <div className="gc-auth-preview-admin" role="dialog" aria-label="Administrator access">
            <button type="button" onClick={() => setAdminOpen(false)} aria-label="Close administrator preview">×</button>
            <ShieldCheck size={18} />
            <strong>Administrator access</strong>
          </div>
        )}
      />
    </div>
  );
}