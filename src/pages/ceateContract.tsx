// src/pages/CreateContract.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateContractPage() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            // TODO: Implement contract generation logic
            // const contract = await generateContract(prompt);
            // navigate(`/contracts/${contract.id}`);
        } catch (error) {
            console.error('Error generating contract:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white p-8 rounded-xl shadow">
                <h1 className="text-2xl font-bold mb-6">Create New Contract</h1>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                            What kind of contract do you need?
                        </label>
                        <textarea
                            id="prompt"
                            rows={4}
                            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Describe the contract you need... (e.g., 'I need a rental agreement for my apartment at 123 Main St, $1500/month, 1-year lease, security deposit of $1500')"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => navigate('/contracts')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                            className={`px-6 py-2 rounded-lg text-white ${isGenerating || !prompt.trim()
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Contract'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}