import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, DollarSign, Package, User, Mail, Calendar, Copy, CheckCircle } from 'lucide-react';
import { createEscrowDeal } from '../services/escrow';

interface FormState {
  title: string;
  itemDescription: string;
  price: string;
  sellerName: string;
  sellerEmail: string;
  buyerName: string;
  buyerEmail: string;
  deliveryDeadline: string;
  itemPhotoUrl: string;
}

interface CreatedDeal {
  id: string;
  shareUrl: string;
}

export default function CreateEscrowDeal() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    title: '',
    itemDescription: '',
    price: '',
    sellerName: '',
    sellerEmail: '',
    buyerName: '',
    buyerEmail: '',
    deliveryDeadline: '',
    itemPhotoUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedDeal | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createEscrowDeal({
        title: form.title,
        itemDescription: form.itemDescription || form.title,
        price: parseFloat(form.price),
        sellerName: form.sellerName || undefined,
        sellerEmail: form.sellerEmail,
        buyerName: form.buyerName || undefined,
        buyerEmail: form.buyerEmail,
        deliveryDeadline: form.deliveryDeadline || undefined,
        itemPhotoUrl: form.itemPhotoUrl || undefined,
      });
      setCreated({ id: result.id, shareUrl: result.shareUrl });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (created) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-2xl shadow-lg text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Escrow Deal Created!</h2>
        <p className="text-gray-500 mb-6">
          Share the link below with the other party. Money won't move until both sides confirm.
        </p>

        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3 mb-6 text-left break-all">
          <span className="text-sm text-gray-700 flex-1">{created.shareUrl}</span>
          <button
            onClick={copyLink}
            className="shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition"
            title="Copy link"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/escrow/${created.id}`)}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            View Deal Status
          </button>
          <button
            onClick={() => { setCreated(null); setForm({ title:'',itemDescription:'',price:'',sellerName:'',sellerEmail:'',buyerName:'',buyerEmail:'',deliveryDeadline:'',itemPhotoUrl:'' }); }}
            className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-indigo-100 rounded-xl">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Create Secure Escrow Deal</h1>
          <p className="text-sm text-gray-500">Both parties sign. Buyer pays. Funds held until delivery confirmed.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Details */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <Package className="w-4 h-4" /> Item Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Title *</label>
            <input
              required
              type="text"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. 2019 iPhone 11 Pro 256GB Space Grey"
              value={form.title}
              onChange={set('title')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              placeholder="Condition, included accessories, any notes..."
              value={form.itemDescription}
              onChange={set('itemDescription')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline w-3.5 h-3.5" /> Price (USD) *
              </label>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="350.00"
                value={form.price}
                onChange={set('price')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="inline w-3.5 h-3.5" /> Delivery Deadline
              </label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                value={form.deliveryDeadline}
                onChange={set('deliveryDeadline')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Photo URL (optional)</label>
            <input
              type="url"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              placeholder="https://..."
              value={form.itemPhotoUrl}
              onChange={set('itemPhotoUrl')}
            />
          </div>
        </section>

        {/* Seller */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" /> Seller Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Jane Smith"
                value={form.sellerName}
                onChange={set('sellerName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline w-3.5 h-3.5" /> Email *
              </label>
              <input
                required
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="seller@example.com"
                value={form.sellerEmail}
                onChange={set('sellerEmail')}
              />
            </div>
          </div>
        </section>

        {/* Buyer */}
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <User className="w-4 h-4" /> Buyer Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="John Doe"
                value={form.buyerName}
                onChange={set('buyerName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline w-3.5 h-3.5" /> Email *
              </label>
              <input
                required
                type="email"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="buyer@example.com"
                value={form.buyerEmail}
                onChange={set('buyerEmail')}
              />
            </div>
          </div>
        </section>

        {/* Escrow Fee Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>Platform fee: 3%</strong> — deducted automatically from the held amount on release.
          All actions are logged with GPS + timestamp for dispute resolution.
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : 'Create Escrow Deal'}
          </button>
        </div>
      </form>
    </div>
  );
}
