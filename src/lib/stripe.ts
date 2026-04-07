import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Client-side Stripe
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Server-side Stripe (lazy init to avoid crash when env vars are missing at build time)
let _stripe: Stripe | null = null;
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-07-30.basil',
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_stripe as any)[prop as string];
  },
});

export const PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1234567890'; // $1.00 price ID