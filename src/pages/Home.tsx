import { Plus, Search as SearchIcon, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="text-center py-16 px-4">
      <h2 className="text-3xl font-semibold mb-2">What would you like to do?</h2>
      <p className="text-gray-500 mb-10 text-base">
        Legally sign documents or set up a scam-proof escrow deal for Marketplace / Craigslist.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-6">
        {/* ── Escrow Deal (highlighted) ── */}
        <button
          onClick={() => navigate('/escrow/new')}
          className="w-full sm:w-72 p-8 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-indigo-700 transition text-left"
        >
          <Shield className="w-12 h-12 mb-4 text-indigo-200" />
          <p className="text-lg font-bold">Secure Escrow Deal</p>
          <p className="text-sm text-indigo-200 mt-1 leading-relaxed">
            Sell / buy anything online safely. Money held until delivery confirmed.
            Perfect for FB Marketplace & Craigslist.
          </p>
          <span className="mt-4 inline-block bg-white text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            NEW — Anti-scam
          </span>
        </button>

        {/* ── Contract ── */}
        <button
          onClick={() => navigate('/contracts/new')}
          className="w-full sm:w-64 p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition"
        >
          <Plus className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <p className="text-lg font-medium">Create Contract</p>
          <p className="text-sm text-gray-500 mt-1">Start from scratch or use a template</p>
        </button>

        {/* ── View existing ── */}
        <button
          onClick={() => navigate('/contracts')}
          className="w-full sm:w-64 p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition"
        >
          <SearchIcon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium">View Existing</p>
          <p className="text-sm text-gray-500 mt-1">Search, sign, or manage contracts</p>
        </button>
      </div>
    </div>
  );
}