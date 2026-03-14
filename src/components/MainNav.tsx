import { Link, useLocation } from 'react-router-dom';
import { Home, FilePlus, FileText } from 'lucide-react';

export default function MainNav() {
  const location = useLocation();

  const navClass = (path: string) =>
    `${
      location.pathname === path
        ? 'border-indigo-500 text-gray-900'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`;

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">ContractSecure</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/" className={navClass('/')}>
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>

              <Link to="/contracts" className={navClass('/contracts')}>
                <FileText className="mr-2 h-4 w-4" />
                My Contracts
              </Link>

              <Link to="/contracts/new" className={navClass('/contracts/new')}>
                <FilePlus className="mr-2 h-4 w-4" />
                New Contract
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}