import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export const PLANS = {
  PRO: {
    name: 'Crossbench Pro',
    price: 199_00, // cents
    interval: 'month' as const,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    features: [
      'Full constituent sentiment dashboard',
      'Per-bill breakdowns with trend over time',
      'CSV export of your electorate data',
      'Weekly email digest',
      'Unlimited historical data',
    ],
  },
  TEAM: {
    name: 'Crossbench Team',
    price: 499_00,
    interval: 'month' as const,
    priceId: process.env.STRIPE_TEAM_PRICE_ID!,
    features: [
      'Everything in Pro',
      'Up to 3 staff logins',
      'API access',
      'Branded PDF reports',
      'Priority support',
    ],
  },
} as const;

export const TRIAL_DAYS = 30;
