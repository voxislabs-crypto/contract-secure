import { Plus, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function HomePage() {
  const navigate = useNavigate();
  return (
    <div className=\"text-center py-16\">
      <h2 className=\"text-3xl font-semibold mb-8\">What would you like to do?</h2>
      <div className=\"flex flex-col sm:flex-row justify-center gap-8\">
        <button
          onClick={() => navigate('/contracts/new')}
          className=\"w-full sm:w-64 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition\"
        >
          <Plus className=\"w-12 h-12 mx-auto mb-4 text-green-600\" />
          <p className=\"text-lg font-medium\">Create New Contract</p>
          <p className=\"text-sm text-gray-500 mt-1\">Start from scratch or use AI</p>
        </button>
        <button
          onClick={() => navigate('/contracts')}
          className=\"w-full sm:w-64 p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition\"
        >
          <SearchIcon className=\"w-12 h-12 mx-auto mb-4 text-blue-600\" />
          <p className=\"text-lg font-medium\">View Existing</p>
          <p className=\"text-sm text-gray-500 mt-1\">Search, sign, or manage</p>
        </button>
      </div>
    </div>
  );
}