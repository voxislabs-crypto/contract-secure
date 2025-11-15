import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
export default function ContractDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contract = {
    id: id || 'CT-2023-001',
    title: 'Car Loan Agreement',
    type: 'Loan Agreement',
    status: 'Draft',
    created: '2023-10-15',
    lastModified: '2023-10-15',
    content: \# Car Loan Agreement
## Parties
- **Lender**: [Your Name]
- **Borrower**: [Borrower's Name]
## Loan Terms
- **Principal Amount**: ,000
- **Interest Rate**: 0% APR
- **Term**: 36 months
- **Monthly Payment**: .67
## Repayment Schedule
- **Start Date**: [Date]
- **Due Date**: 1st of each month
- **Final Payment**: [Date]
## Default
If the Borrower fails to make a payment within 15 days of the due date, the entire remaining balance shall become immediately due and payable.
## Governing Law
This Agreement shall be governed by and construed in accordance with the laws of [State].\
  };
  const getStatusIcon = () => {
    switch (contract.status) {
      case 'Signed':
        return <CheckCircle className=\"h-5 w-5 text-green-500\" />;
      case 'Pending':
        return <Clock className=\"h-5 w-5 text-yellow-500\" />;
      case 'Expired':
        return <AlertTriangle className=\"h-5 w-5 text-red-500\" />;
      default:
        return <FileText className=\"h-5 w-5 text-gray-500\" />;
    }
  };
  return (
    <div className=\"space-y-6\">
      <button
        onClick={() => navigate(-1)}
        className=\"flex items-center text-indigo-600 hover:text-indigo-800 mb-6\"
      >
        <ArrowLeft className=\"h-4 w-4 mr-1\" />
        Back to Contracts
      </button>
      <div className=\"bg-white rounded-xl shadow overflow-hidden\">
        <div className=\"px-6 py-4 border-b\">
          <div className=\"flex justify-between items-start\">
            <div>
              <h1 className=\"text-2xl font-bold\">{contract.title}</h1>
              <div className=\"flex items-center mt-2\">
                <span className=\"text-sm text-gray-500 mr-4\">ID: {contract.id}</span>
                <span className=\"flex items-center text-sm\">
                  {getStatusIcon()}
                  <span className=\"ml-1 capitalize\">{contract.status.toLowerCase()}</span>
                </span>
              </div>
            </div>
            <div className=\"flex space-x-3\">
              <button className=\"px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50\">
                Download PDF
              </button>
              <button className=\"px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700\">
                Sign Contract
              </button>
            </div>
          </div>
        </div>
        <div className=\"p-6\">
          <div className=\"prose max-w-none\" dangerouslySetInnerHTML={{ __html: contract.content }} />
        </div>
        <div className=\"bg-gray-50 px-6 py-4 border-t flex justify-between items-center\">
          <div className=\"text-sm text-gray-500\">
            Created on {new Date(contract.created).toLocaleDateString()}
            {contract.lastModified !== contract.created && (
              <span className=\"ml-4\">Last modified on {new Date(contract.lastModified).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}