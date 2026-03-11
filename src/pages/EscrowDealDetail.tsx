import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  DollarSign,
  Package,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  getEscrowDeal,
  startPayment,
  markShipped,
  confirmReceipt,
  openDispute,
  type EscrowDeal,
} from '../services/escrow';

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft:     'Awaiting Payment',
  signed:    'Signed — Awaiting Payment',
  paid_held: 'Funds Held in Escrow',
  shipped:   'Item Shipped',
  completed: 'Deal Completed',
  disputed:  'Dispute Open',
  refunded:  'Refunded',
};

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-800',
  signed:    'bg-yellow-100 text-yellow-800',
  paid_held: 'bg-blue-100 text-blue-800',
  shipped:   'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  disputed:  'bg-red-100 text-red-800',
  refunded:  'bg-orange-100 text-orange-800',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft:     <Clock className="w-5 h-5 text-gray-500" />,
  signed:    <Clock className="w-5 h-5 text-yellow-500" />,
  paid_held: <Shield className="w-5 h-5 text-blue-500" />,
  shipped:   <Truck className="w-5 h-5 text-purple-500" />,
  completed: <CheckCircle className="w-5 h-5 text-green-500" />,
  disputed:  <AlertTriangle className="w-5 h-5 text-red-500" />,
  refunded:  <DollarSign className="w-5 h-5 text-orange-500" />,
};

// ─── Timeline ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  ESCROW_CREATED:           'Deal created',
  CHECKOUT_SESSION_CREATED: 'Payment session started',
  PAYMENT_HELD:             'Payment held in escrow',
  PAYMENT_FAILED:           'Payment failed',
  ITEM_SHIPPED:             'Seller marked item as shipped',
  RECEIPT_CONFIRMED:        'Buyer confirmed receipt — funds released',
  DISPUTE_OPENED:           'Dispute opened',
};

function Timeline({ logs }: { logs: EscrowDeal['auditLogs'] }) {
  return (
    <ol className="relative border-l border-gray-200 space-y-4 ml-3">
      {logs.map((log) => (
        <li key={log.id} className="ml-6">
          <span className="absolute -left-2 flex items-center justify-center w-4 h-4 bg-indigo-100 rounded-full ring-4 ring-white">
            <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
          </span>
          <p className="text-sm font-medium text-gray-900">
            {EVENT_LABELS[log.event] ?? log.event}
          </p>
          <time className="text-xs text-gray-400">
            {new Date(log.createdAt).toLocaleString()}
          </time>
        </li>
      ))}
    </ol>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function EscrowDealDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<EscrowDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const paymentResult = searchParams.get('payment'); // 'success' | 'canceled'

  const refresh = async () => {
    if (!id) return;
    try {
      const d = await getEscrowDeal(id);
      setDeal(d);
    } catch {
      setError('Could not load deal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [id]);

  const run = async (fn: () => Promise<unknown>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePay = () =>
    run(async () => {
      const { checkoutUrl } = await startPayment(id!);
      window.location.href = checkoutUrl;
    });

  const handleShip = () =>
    run(() => markShipped(id!, trackingInput));

  const handleRelease = () =>
    run(() => confirmReceipt(id!));

  const handleDispute = () =>
    run(async () => {
      await openDispute(id!, disputeReason);
      setShowDisputeForm(false);
    });

  const shareUrl = `${window.location.origin}/escrow/${id}`;
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Deal not found</h2>
        <p className="text-gray-500 mb-6">{error ?? 'This escrow deal does not exist or has expired.'}</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline">
          ← Back to home
        </button>
      </div>
    );
  }

  const status = deal.paymentStatus;
  const fee = ((deal.price ?? 0) * deal.escrowFeePercent) / 100;
  const netSeller = (deal.price ?? 0) - fee;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

      {/* Payment result banners */}
      {paymentResult === 'success' && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-green-800 text-sm font-medium">
            Payment received! Funds are now held in escrow. The seller has been notified.
          </span>
        </div>
      )}
      {paymentResult === 'canceled' && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800 text-sm">
          Payment was cancelled. The deal is still open — you can try again below.
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">{deal.title}</h1>
            {deal.itemDescription && deal.itemDescription !== deal.title && (
              <p className="text-gray-500 text-sm">{deal.itemDescription}</p>
            )}
          </div>
          <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>

        {/* Price breakdown */}
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Deal Amount</p>
            <p className="text-lg font-bold">${(deal.price ?? 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Platform Fee ({deal.escrowFeePercent}%)</p>
            <p className="text-lg font-semibold text-gray-600">−${fee.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Seller Receives</p>
            <p className="text-lg font-bold text-green-700">${netSeller.toFixed(2)}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Seller</p>
            <p className="font-medium">{deal.sellerName ?? '—'}</p>
            <p className="text-gray-500">{deal.sellerEmail}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-0.5">Buyer</p>
            <p className="font-medium">{deal.buyerName ?? '—'}</p>
            <p className="text-gray-500">{deal.buyerEmail}</p>
          </div>
        </div>

        {/* Tracking */}
        {deal.trackingNumber && (
          <div className="flex items-center gap-2 text-sm bg-purple-50 border border-purple-200 rounded-lg p-3">
            <Truck className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-medium text-purple-800">Tracking:</span>
            <span className="text-purple-700">{deal.trackingNumber}</span>
          </div>
        )}

        {/* Item photo */}
        {deal.itemPhotoUrl && (
          <img
            src={deal.itemPhotoUrl}
            alt="Item"
            className="mt-4 w-full max-h-48 object-cover rounded-xl border"
          />
        )}
      </div>

      {/* Status icon + current state */}
      <div className="flex items-center gap-3 bg-white rounded-xl shadow px-5 py-4">
        {STATUS_ICON[status]}
        <div>
          <p className="font-semibold">{STATUS_LABELS[status] ?? status}</p>
          {status === 'draft' && <p className="text-sm text-gray-500">Waiting for the buyer to pay into escrow.</p>}
          {status === 'paid_held' && <p className="text-sm text-gray-500">Funds are safely held. Seller should ship the item now.</p>}
          {status === 'shipped' && <p className="text-sm text-gray-500">Item is on the way. Buyer should confirm when received.</p>}
          {status === 'completed' && <p className="text-sm text-gray-500">Deal closed. Funds have been released to the seller.</p>}
          {status === 'disputed' && <p className="text-sm text-gray-500">Funds are frozen. Our team will review and contact both parties.</p>}
        </div>
      </div>

      {/* Action buttons */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">{error}</div>
      )}

      {status === 'draft' && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><DollarSign className="w-4 h-4 text-indigo-600" /> Buyer: Pay into Escrow</h3>
          <p className="text-sm text-gray-500 mb-4">
            You'll be redirected to Stripe's secure checkout page. Your payment will be held
            until you confirm you received the item.
          </p>
          <button
            onClick={handlePay}
            disabled={actionLoading}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {actionLoading ? 'Redirecting to Stripe…' : `Pay $${(deal.price ?? 0).toFixed(2)} into Escrow`}
          </button>
        </div>
      )}

      {status === 'paid_held' && (
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-purple-600" /> Seller: Mark as Shipped</h3>
          <p className="text-sm text-gray-500">Enter a tracking number to let the buyer know the item is on its way.</p>
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            placeholder="Tracking number (e.g. 1Z999AA10123456784)"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
          />
          <button
            onClick={handleShip}
            disabled={actionLoading || !trackingInput}
            className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-60"
          >
            {actionLoading ? 'Saving…' : 'Mark as Shipped'}
          </button>
        </div>
      )}

      {status === 'shipped' && (
        <div className="bg-white rounded-xl shadow p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Buyer: Confirm Receipt</h3>
          <p className="text-sm text-gray-500">
            Once you confirm you received the item in the expected condition, funds will be
            released to the seller. <strong>This cannot be undone.</strong>
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRelease}
              disabled={actionLoading}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {actionLoading ? 'Processing…' : 'I Received It — Release Funds'}
            </button>
            <button
              onClick={() => setShowDisputeForm(true)}
              className="flex-1 py-3 border border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50"
            >
              Dispute
            </button>
          </div>
        </div>
      )}

      {/* Dispute form (shown for paid_held or shipped) */}
      {(status === 'paid_held' || status === 'shipped') && showDisputeForm && (
        <div className="bg-white rounded-xl shadow p-5 space-y-3 border-2 border-red-200">
          <h3 className="font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Open a Dispute
          </h3>
          <p className="text-sm text-gray-500">Funds will be frozen until the dispute is resolved.</p>
          <textarea
            rows={3}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400"
            placeholder="Describe the issue (item not as described, never shipped, etc.)"
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={handleDispute}
              disabled={actionLoading || !disputeReason}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              {actionLoading ? 'Opening dispute…' : 'Submit Dispute'}
            </button>
            <button
              onClick={() => setShowDisputeForm(false)}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Dispute button for paid_held (not showing the form yet) */}
      {status === 'paid_held' && !showDisputeForm && (
        <button
          onClick={() => setShowDisputeForm(true)}
          className="w-full py-2.5 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 text-sm"
        >
          Something wrong? Open a Dispute
        </button>
      )}

      {/* Completed */}
      {status === 'completed' && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-5 text-center">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800 text-lg">Deal Complete!</p>
          <p className="text-sm text-green-700">Funds have been released to the seller. Thank you for using ContractSecure.</p>
        </div>
      )}

      {/* Share link */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-indigo-600" /> Share this Deal Link
        </h3>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-600 flex-1 truncate">{shareUrl}</span>
          <button onClick={copyLink} className="p-1 rounded hover:bg-gray-200" title="Copy">
            {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Paste this in your FB Marketplace or Craigslist conversation.</p>
      </div>

      {/* Audit Timeline */}
      {deal.auditLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" /> Deal Activity
          </h3>
          <Timeline logs={deal.auditLogs} />
        </div>
      )}
    </div>
  );
}
