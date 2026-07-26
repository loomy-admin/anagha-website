type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

type RazorpayInstance = {
  open: () => void;
  close?: () => void;
  on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

/** Prevents React Strict Mode / remount from opening checkout twice for one session. */
const openSessions = new Set<string>();
let activeInstance: RazorpayInstance | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout]');
    if (existing) {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = '1';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function canOpenRazorpayForSession(sessionId: string) {
  return Boolean(sessionId) && !openSessions.has(sessionId);
}

export function openRazorpayWindow(
  sessionId: string,
  options: RazorpayCheckoutOptions,
): RazorpayInstance | null {
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script not loaded');
  }
  if (!canOpenRazorpayForSession(sessionId)) {
    return null;
  }
  openSessions.add(sessionId);
  const rzp = new window.Razorpay(options);
  activeInstance = rzp;
  rzp.open();
  return rzp;
}

/** Close modal + strip Razorpay DOM leftovers so chunks stop fetching after leave. */
export function teardownRazorpayCheckout(sessionId?: string) {
  if (sessionId) openSessions.delete(sessionId);

  try {
    activeInstance?.close?.();
  } catch {
    // ignore
  }
  activeInstance = null;

  if (typeof document === 'undefined') return;

  document
    .querySelectorAll(
      'iframe[src*="razorpay"], iframe[src*="rzp.io"], .razorpay-container, .razorpay-backdrop, div[class*="razorpay"]',
    )
    .forEach((el) => {
      try {
        el.remove();
      } catch {
        // ignore
      }
    });

  // Unlock body scroll if Razorpay left it locked
  document.body.style.overflow = '';
}

export function releaseRazorpaySession(sessionId: string) {
  openSessions.delete(sessionId);
}
