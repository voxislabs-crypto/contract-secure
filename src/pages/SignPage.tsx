import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function SignPage() {
  const { contractId, signerId } = useParams<{ contractId: string; signerId: string }>();
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Sign Contract</h1>
      <p className="mb-4">Contract ID: {contractId}</p>
      <p className="mb-4">Signer ID: {signerId}</p>
      <Button>Sign Document</Button>
    </div>
  );
}
