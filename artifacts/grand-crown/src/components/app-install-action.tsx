import { useState, useSyncExternalStore } from 'react';
import { Download, ExternalLink, Check } from 'lucide-react';
import { getInstallState, requestAppInstall, subscribeInstall } from '@/lib/app-install';

export function AppInstallAction() {
  const { available, installed } = useSyncExternalStore(subscribeInstall, getInstallState);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const install = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await requestAppInstall();
      setMessage(result === 'accepted' ? 'Installation requested. Follow your browser’s instructions to finish.' : result === 'dismissed' ? 'Installation cancelled. You can still add Grand Crown from your browser menu.' : 'Use your browser menu to add Grand Crown to your home screen.');
    } catch {
      setMessage('The browser could not open the installer. Try the home-screen instructions below.');
    } finally {
      setBusy(false);
    }
  };
  return <div className="space-y-3 text-sm leading-6" data-testid="app-install-instructions">
    {installed ? <p className="flex items-center gap-2"><Check className="size-4" /> Grand Crown is running as an installed app.</p> : <>
      <p>Keep Grand Crown on your home screen for quick access. An internet connection is required.</p>
      {available && <button type="button" data-testid="button-install-app" onClick={install} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-current/30 px-4 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Download className="size-4" />{busy ? 'Opening installer…' : 'Install Grand Crown'}</button>}
      <p>{ios ? 'On iPhone or iPad, open this site in Safari. Tap Share, then Add to Home Screen, and confirm Add.' : 'Open your browser menu and choose Install app or Add to Home screen. On desktop, look for the install icon in the address bar.'}</p>
      <p className="text-xs opacity-75">The install option depends on your browser. If you are in an embedded preview, open the site in a separate tab first.</p>
      <a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 underline underline-offset-4" data-testid="link-install-open-site">Open site in a new tab <ExternalLink className="size-3.5" /></a>
    </>}
    {message && <p role="status">{message}</p>}
  </div>;
}