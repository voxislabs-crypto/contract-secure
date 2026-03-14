import { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';

const prisma = new PrismaClient();
const DEFAULT_CONNECT_COUNTRY = process.env.STRIPE_CONNECT_COUNTRY ?? 'US';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ─── Create Deal ─────────────────────────────────────────────────────────────

export interface CreateEscrowDealInput {
  title: string;
  itemDescription: string;
  price: number;
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  buyerEmail: string;
  deliveryDeadline?: string;
  itemPhotoUrl?: string;
}

export async function createEscrowDeal(data: CreateEscrowDealInput) {
  const shortLink = shortId();

  const contract = await prisma.contract.create({
    data: {
      title: data.title,
      isEscrow: true,
      itemDescription: data.itemDescription,
      price: data.price,
      paymentStatus: 'draft',
      shortLink,
      sellerName: data.sellerName,
      sellerEmail: data.sellerEmail,
      buyerName: data.buyerName,
      buyerEmail: data.buyerEmail,
      deliveryDeadline: data.deliveryDeadline ? new Date(data.deliveryDeadline) : null,
      itemPhotoUrl: data.itemPhotoUrl ?? null,
      escrowFeePercent: 3.0,
    },
  });

  // Create buyer and seller signer records
  await prisma.signer.createMany({
    data: [
      { contractId: contract.id, name: data.sellerName, email: data.sellerEmail, role: 'seller' },
      { contractId: contract.id, name: data.buyerName,  email: data.buyerEmail,  role: 'buyer' },
    ],
  });

  await prisma.auditLog.create({
    data: {
      contractId: contract.id,
      event: 'ESCROW_CREATED',
      meta: JSON.stringify({
        sellerEmail: data.sellerEmail,
        buyerEmail: data.buyerEmail,
        price: data.price,
      }),
    },
  });

  return contract;
}

// ─── Get Deal ────────────────────────────────────────────────────────────────

export async function getEscrowDeal(id: string) {
  return prisma.contract.findFirst({
    where: { id, isEscrow: true },
    include: { signers: true, auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
}

export interface SellerConnectStatus {
  hasSellerStripeAccount: boolean;
  sellerPayoutsEnabled: boolean;
  sellerDetailsSubmitted: boolean;
}

export async function getSellerConnectStatus(contractId: string): Promise<SellerConnectStatus> {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { sellerStripeAccountId: true },
  });

  if (!contract) throw new Error('Contract not found');

  if (!contract.sellerStripeAccountId) {
    return {
      hasSellerStripeAccount: false,
      sellerPayoutsEnabled: false,
      sellerDetailsSubmitted: false,
    };
  }

  if (!stripe) {
    return {
      hasSellerStripeAccount: true,
      sellerPayoutsEnabled: false,
      sellerDetailsSubmitted: false,
    };
  }

  try {
    const account = await stripe.accounts.retrieve(contract.sellerStripeAccountId);
    return {
      hasSellerStripeAccount: true,
      sellerPayoutsEnabled: !!account.payouts_enabled,
      sellerDetailsSubmitted: !!account.details_submitted,
    };
  } catch {
    return {
      hasSellerStripeAccount: true,
      sellerPayoutsEnabled: false,
      sellerDetailsSubmitted: false,
    };
  }
}

export async function createSellerConnectOnboardingLink(contractId: string, frontendUrl: string) {
  if (!stripe) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your .env.');

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract || !contract.isEscrow) throw new Error('Escrow contract not found');

  let sellerStripeAccountId = contract.sellerStripeAccountId;

  if (!sellerStripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: DEFAULT_CONNECT_COUNTRY,
      email: contract.sellerEmail ?? undefined,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        contractId,
        sellerEmail: contract.sellerEmail ?? '',
      },
    });

    sellerStripeAccountId = account.id;

    await prisma.contract.update({
      where: { id: contractId },
      data: { sellerStripeAccountId },
    });

    await prisma.auditLog.create({
      data: {
        contractId,
        event: 'SELLER_STRIPE_ACCOUNT_CREATED',
        meta: JSON.stringify({ sellerStripeAccountId }),
      },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: sellerStripeAccountId,
    type: 'account_onboarding',
    refresh_url: `${frontendUrl}/escrow/${contractId}?onboarding=refresh`,
    return_url: `${frontendUrl}/escrow/${contractId}?onboarding=done`,
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'SELLER_ONBOARDING_LINK_CREATED',
      meta: JSON.stringify({ sellerStripeAccountId }),
    },
  });

  return {
    onboardingUrl: accountLink.url,
    sellerStripeAccountId,
  };
}

// ─── Create Stripe Checkout Session ──────────────────────────────────────────

export async function createCheckoutSession(contractId: string, frontendUrl: string) {
  if (!stripe) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your .env.');

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error('Contract not found');
  if (!contract.price) throw new Error('Contract has no price set');
  if (contract.paymentStatus === 'paid_held' || contract.paymentStatus === 'completed') {
    throw new Error('This deal has already been paid');
  }

  const totalCents = Math.round(contract.price * 100);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: contract.title,
            description: contract.itemDescription ?? undefined,
            images: contract.itemPhotoUrl ? [contract.itemPhotoUrl] : [],
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    metadata: { contractId },
    payment_intent_data: { metadata: { contractId } },
    success_url: `${frontendUrl}/escrow/${contractId}?payment=success`,
    cancel_url:  `${frontendUrl}/escrow/${contractId}?payment=canceled`,
  });

  await prisma.contract.update({
    where: { id: contractId },
    data: { stripeCheckoutSessionId: session.id },
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'CHECKOUT_SESSION_CREATED',
      meta: JSON.stringify({ sessionId: session.id, totalCents }),
    },
  });

  return session;
}

// ─── Stripe Webhook ──────────────────────────────────────────────────────────

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  if (!stripe) throw new Error('Stripe is not configured');
  if (!STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Webhook signature verification failed: ${msg}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const contractId = session.metadata?.contractId;
      if (!contractId) break;

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

      await prisma.contract.update({
        where: { id: contractId },
        data: { paymentStatus: 'paid_held', stripePaymentIntentId: paymentIntentId },
      });

      await prisma.auditLog.create({
        data: {
          contractId,
          event: 'PAYMENT_HELD',
          meta: JSON.stringify({ sessionId: session.id, paymentIntentId }),
        },
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const contractId = pi.metadata?.contractId;
      if (contractId) {
        await prisma.auditLog.create({
          data: {
            contractId,
            event: 'PAYMENT_FAILED',
            meta: JSON.stringify({ paymentIntentId: pi.id }),
          },
        });
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id ?? null;

      if (!paymentIntentId) break;

      const contract = await prisma.contract.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
        select: { id: true, paymentStatus: true },
      });

      if (!contract) break;

      // Move escrow state to refunded when Stripe reports refunded charge.
      await prisma.contract.update({
        where: { id: contract.id },
        data: { paymentStatus: 'refunded' },
      });

      await prisma.auditLog.create({
        data: {
          contractId: contract.id,
          event: 'PAYMENT_REFUNDED',
          meta: JSON.stringify({
            chargeId: charge.id,
            paymentIntentId,
            refunded: charge.refunded,
            amountRefundedCents: charge.amount_refunded,
            amountCapturedCents: charge.amount_captured,
            previousStatus: contract.paymentStatus,
          }),
        },
      });
      break;
    }
  }

  return event;
}

// ─── Mark as Shipped ─────────────────────────────────────────────────────────

export async function markAsShipped(contractId: string, trackingNumber: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error('Contract not found');
  if (contract.paymentStatus !== 'paid_held') {
    throw new Error('Payment must be held before marking as shipped');
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { paymentStatus: 'shipped', trackingNumber },
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'ITEM_SHIPPED',
      meta: JSON.stringify({ trackingNumber }),
    },
  });

  return updated;
}

// ─── Confirm Receipt (release funds) ─────────────────────────────────────────

export async function confirmReceipt(contractId: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error('Contract not found');
  if (contract.paymentStatus !== 'shipped') {
    throw new Error('Item has not been marked as shipped yet');
  }
  if (!contract.price) throw new Error('Contract has no price set');
  if (!contract.sellerStripeAccountId) {
    throw new Error('Seller must connect a Stripe payout account before funds can be released');
  }
  if (!contract.stripePaymentIntentId) {
    throw new Error('No Stripe payment intent found for this contract');
  }
  if (!stripe) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in your .env.');

  const sellerAccount = await stripe.accounts.retrieve(contract.sellerStripeAccountId);
  if (!sellerAccount.payouts_enabled || !sellerAccount.details_submitted) {
    throw new Error('Seller Stripe account onboarding is incomplete');
  }

  const totalCents = Math.round(contract.price * 100);
  const feeCents = Math.round(totalCents * ((contract.escrowFeePercent ?? 0) / 100));
  const sellerCents = totalCents - feeCents;

  if (sellerCents <= 0) {
    throw new Error('Calculated seller payout amount must be greater than zero');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(contract.stripePaymentIntentId);
  const chargeId =
    typeof paymentIntent.latest_charge === 'string'
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id ?? undefined;

  const transferData: Stripe.TransferCreateParams = {
    amount: sellerCents,
    currency: 'usd',
    destination: contract.sellerStripeAccountId,
    metadata: {
      contractId,
      paymentIntentId: contract.stripePaymentIntentId,
      grossAmountCents: String(totalCents),
      feeCents: String(feeCents),
      netAmountCents: String(sellerCents),
    },
  };

  if (chargeId) {
    transferData.source_transaction = chargeId;
  }

  const transfer = await stripe.transfers.create(transferData);

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { paymentStatus: 'completed', stripeTransferId: transfer.id },
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'RECEIPT_CONFIRMED',
      meta: JSON.stringify({
        transferId: transfer.id,
        paymentIntentId: contract.stripePaymentIntentId,
        sourceChargeId: chargeId ?? null,
        grossAmountCents: totalCents,
        feeCents,
        netAmountCents: sellerCents,
      }),
    },
  });

  return updated;
}

// ─── Open Dispute ────────────────────────────────────────────────────────────

export async function openDispute(contractId: string, reason: string) {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error('Contract not found');
  if (['completed', 'refunded', 'disputed'].includes(contract.paymentStatus)) {
    throw new Error(`Cannot dispute a deal in status: ${contract.paymentStatus}`);
  }

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { paymentStatus: 'disputed' },
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'DISPUTE_OPENED',
      meta: JSON.stringify({ reason }),
    },
  });

  return updated;
}
