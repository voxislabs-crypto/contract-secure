import React, { useState } from 'react';
import { Upload, FileText, ArrowLeft, Plus, X } from 'lucide-react';

interface CreateContractProps {
  onSubmit: (title: string, pdfFile?: File, signers?: Array<{name: string, email: string}>) => void;
  onCancel: () => void;
}

interface Signer {
  name: string;
  email: string;
}

export default function CreateContract({ onSubmit, onCancel }: CreateContractProps) {
  const [step, setStep] = useState<'details' | 'signers'>('details');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '' }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace('.pdf', ''));
      }
    }
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '' }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  const updateSigner = (index: number, field: 'name' | 'email', value: string) => {
    const updatedSigners = signers.map((signer, i) => 
      i === index ? { ...signer, [field]: value } : signer
    );
    setSigners(updatedSigners);
  };

  const handleSubmit = () => {
    const validSigners = signers.filter(s => s.name && s.email);
    
    if (!title) {
      alert('Please provide a title');
      return;
    }

    onSubmit(title, file || undefined, validSigners.length > 0 ? validSigners : undefined);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Contract</h2>
                <p className="text-sm text-gray-500">Set up a new digital contract for signing</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>1</div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'signers' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>2</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Contract Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter contract title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload PDF Contract (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700 font-medium">
                            Choose a PDF file
                          </span>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-gray-500 text-sm mt-1">or drag and drop</p>
                      </div>
                      {file && (
                        <div className="mt-4 text-sm text-green-600">
                          ✓ {file.name} selected
                        </div>
                      )}
                      </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={onCancel}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('signers')}
                  disabled={!title}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Add Signers */}
          {step === 'signers' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Signers</h3>
                <p className="text-gray-600 mb-6">Add the people who need to sign this contract. Each signer will receive an email invitation to review and sign.</p>
                
                <div className="space-y-4">
                  {signers.map((signer, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          Signer {index + 1}
                        </h4>
                        {signers.length > 1 && (
                          <button
                            onClick={() => removeSigner(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={signer.name}
                            onChange={(e) => updateSigner(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter full name..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={signer.email}
                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter email address..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addSigner}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Signer</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('details')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Create Contract</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}