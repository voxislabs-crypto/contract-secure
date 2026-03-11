import { Router, type Request, type Response } from 'express';
import express from 'express';
import {
  createEscrowDeal,
  getEscrowDeal,
  createCheckoutSession,
  handleStripeWebhook,
  markAsShipped,
  confirmReceipt,
  openDispute,
} from '../services/escrowService.js';
import { CONFIG } from '../config/config.js';

const router = Router();

// ─── POST /api/escrow ─────────────────────────────────────────────────────────
// Create a new escrow deal and return a shareable link
router.post('/', async (req: Request, res: Response) => {
  const {
    title,
    itemDescription,
    price,
    sellerName,
    sellerEmail,
    buyerName,
    buyerEmail,
    deliveryDeadline,
    itemPhotoUrl,
  } = req.body as Record<string, string | undefined>;

  if (!title || !price || !sellerEmail || !buyerEmail) {
    return res.status(400).json({
      error: 'title, price, sellerEmail, and buyerEmail are required',
    });
  }

  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }

  try {
    const deal = await createEscrowDeal({
      title,
      itemDescription: itemDescription ?? title,
      price: parsedPrice,
      sellerName: sellerName ?? sellerEmail,
      sellerEmail,
      buyerName: buyerName ?? buyerEmail,
      buyerEmail,
      deliveryDeadline,
      itemPhotoUrl,
    });

    return res.status(201).json({
      id: deal.id,
      shortLink: deal.shortLink,
      shareUrl: `${CONFIG.FRONTEND_URL}/escrow/${deal.id}`,
      paymentStatus: deal.paymentStatus,
    });
  } catch (err: unknown) {
    console.error('[escrow] create error:', err);
    return res.status(500).json({ error: 'Failed to create escrow deal' });
  }
});

// ─── GET /api/escrow/:id ──────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deal = await getEscrowDeal(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    return res.json(deal);
  } catch (err: unknown) {
    console.error('[escrow] get error:', err);
    return res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// ─── POST /api/escrow/:id/pay ─────────────────────────────────────────────────
// Buyer calls this to get a Stripe Checkout URL
router.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const session = await createCheckoutSession(req.params.id, CONFIG.FRONTEND_URL);
    return res.json({ checkoutUrl: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create payment session';
    console.error('[escrow] pay error:', err);
    return res.status(500).json({ error: msg });
  }
});

// ─── POST /api/escrow/:id/ship ────────────────────────────────────────────────
// Seller marks item as shipped (optionally with a tracking number)
router.post('/:id/ship', async (req: Request, res: Response) => {
  const { trackingNumber } = req.body as { trackingNumber?: string };
  if (!trackingNumber) {
    return res.status(400).json({ error: 'trackingNumber is required' });
  }
  try {
    const deal = await markAsShipped(req.params.id, trackingNumber);
    return res.json({ paymentStatus: deal.paymentStatus, trackingNumber: deal.trackingNumber });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark as shipped';
    return res.status(400).json({ error: msg });
  }
});

// ─── POST /api/escrow/:id/release ────────────────────────────────────────────
// Buyer confirms receipt — triggers fund release
router.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const deal = await confirmReceipt(req.params.id);
    return res.json({ paymentStatus: deal.paymentStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to release funds';
    return res.status(400).json({ error: msg });
  }
});

// ─── POST /api/escrow/:id/dispute ────────────────────────────────────────────
router.post('/:id/dispute', async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  try {
    const deal = await openDispute(req.params.id, reason ?? 'No reason provided');
    return res.json({ paymentStatus: deal.paymentStatus });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to open dispute';
    return res.status(400).json({ error: msg });
  }
});

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────
// IMPORTANT: This route uses express.raw() so Stripe can verify the webhook signature.
// It must be mounted BEFORE express.json() in the main server.
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' });

    try {
      await handleStripeWebhook(req.body as Buffer, sig);
      return res.json({ received: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook error';
      console.error('[stripe webhook]', msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }
  }
);

export default router;
