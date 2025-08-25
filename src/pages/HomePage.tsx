import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function HomePage() {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Welcome to ContractSecure</h1>
      <div className="space-x-4">
        <Button onClick={() => navigate('/sign/some-contract-id/some-signer-id')}>
          Sign a Contract
        </Button>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
