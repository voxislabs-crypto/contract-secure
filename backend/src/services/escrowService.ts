import { PrismaClient } from '@prisma/client';
import type Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';

const prisma = new PrismaClient();

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

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: { paymentStatus: 'completed' },
  });

  await prisma.auditLog.create({
    data: {
      contractId,
      event: 'RECEIPT_CONFIRMED',
      meta: JSON.stringify({
        note: 'Funds released. Configure Stripe Connect to auto-transfer to seller.',
        // TODO: stripe.transfers.create({ amount, currency: 'usd', destination: sellerStripeAccountId })
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
