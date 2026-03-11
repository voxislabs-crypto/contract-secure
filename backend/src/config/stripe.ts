import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY ?? '';

if (!key || key.startsWith('sk_test_REPLACE')) {
  console.warn(
    '[Stripe] STRIPE_SECRET_KEY is not configured. ' +
    'Set it in backend/.env to enable payment features.'
  );
}

// stripe will be null when key is missing so payment endpoints return clear errors
export const stripe: Stripe | null = key && !key.startsWith('sk_test_REPLACE')
  ? new Stripe(key, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
