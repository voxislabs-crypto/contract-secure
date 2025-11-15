// src/pages/Contracts.tsx
import { useState } from 'react';
import { FileText, Search as SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contract {
    id: string;
    title: string;
    type: string;
    status: 'Draft' | 'Pending' | 'Signed' | 'Expired';
    created: string;
    lastModified: string;
}

export default function ContractsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const contractsPerPage = 5;

    // Sample contract data
    const [contracts] = useState<Contract[]>([
        {
            id: 'CT-2023-001',
            title: 'Car Loan Agreement',
            type: 'Loan Agreement',
            status: 'Draft',
            created: '2023-10-15',
            lastModified: '2023-10-15'
        },
        // ... other sample contracts
    ]);

    // Filter contracts based on search query
    const filteredContracts = contracts.filter(contract =>
        Object.values(contract).some(
            value => typeof value === 'string' &&
                value.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    // Get current contracts for pagination
    const indexOfLastContract = currentPage * contractsPerPage;
    const indexOfFirstContract = indexOfLastContract - contractsPerPage;
    const currentContracts = filteredContracts.slice(indexOfFirstContract, indexOfLastContract);
    const totalPages = Math.ceil(filteredContracts.length / contractsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="p-6">
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold">Your Contracts</h2>
                        <div className="relative w-64">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search contracts..."
                                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentContracts.length > 0 ? (
                                    currentContracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                                                    <div>
                                                        <div className="font-medium text-gray-900">{contract.title}</div>
                                                        <div className="text-sm text-gray-500">{contract.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {contract.type}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${contract.status === 'Signed' ? 'bg-green-100 text-green-800' :
                                                    contract.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        contract.status === 'Expired' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {contract.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(contract.created).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link
                                                    to={`/contracts/${contract.id}`}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    View
                                                </Link>
                                                <button className="text-indigo-600 hover:text-indigo-900">
                                                    Sign
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                            No contracts found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredContracts.length > contractsPerPage && (
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="text-sm text-gray-700">
                                Showing <span className="font-medium">{indexOfFirstContract + 1}</span> to{' '}
                                <span className="font-medium">
                                    {Math.min(indexOfLastContract, filteredContracts.length)}
                                </span>{' '}
                                of <span className="font-medium">{filteredContracts.length}</span> results
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`p-1 rounded-md ${currentPage === 1
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => paginate(pageNum)}
                                            className={`px-3 py-1 rounded-md ${currentPage === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`p-1 rounded-md ${currentPage === totalPages
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}