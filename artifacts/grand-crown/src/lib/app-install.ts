type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type InstallState = { available: boolean; installed: boolean };
let state: InstallState = { available: false, installed: false };
let promptEvent: InstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();
const update = (next: InstallState) => {
  state = next;
  listeners.forEach(listener => listener());
};

export function initializeAppInstall() {
  if (initialized) return;
  initialized = true;
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const isInstalled = () => displayMode.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  update({ available: false, installed: isInstalled() });
  displayMode.addEventListener('change', () => update({ ...state, installed: isInstalled() }));
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    update({ ...state, available: true });
  });
  window.addEventListener('appinstalled', () => {
    promptEvent = null;
    update({ available: false, installed: true });
  });
}

export const getInstallState = () => state;
export const subscribeInstall = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export async function requestAppInstall() {
  const current = promptEvent;
  if (!current) return 'unavailable' as const;
  promptEvent = null;
  update({ ...state, available: false });
  await current.prompt();
  return (await current.userChoice).outcome;
}