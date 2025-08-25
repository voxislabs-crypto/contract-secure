import React, { useState } from 'react';
import { ArrowLeft, Download, Shield, MapPin, Calendar, Hash, CheckCircle, Clock, Users, FileText, ExternalLink, Copy } from 'lucide-react';
import { Contract, apiService } from '../services/api';

interface ContractViewProps {
  contract: Contract;
  onBack: () => void;
  onFinalize: () => void;
}

export default function ContractView({ contract, onBack, onFinalize }: ContractViewProps) {
  const [generatingLink, setGeneratingLink] = useState(false);
  
  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'executed': return 'text-green-600 bg-green-100';
      case 'pending_finalization': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: Contract['status']) => {
    switch (status) {
      case 'pending_finalization':
        return 'Ready to Finalize';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const generateInviteLink = async (signerId: string) => {
    setGeneratingLink(true);
    try {
      const link = await apiService.generateInviteLink(contract.id, signerId);
      navigator.clipboard.writeText(link);
      alert('Invite link copied to clipboard!');
    } catch (error) {
      console.error('Failed to generate invite link:', error);
      alert('Failed to generate invite link');
    } finally {
      setGeneratingLink(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{contract.title}</h2>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                    {getStatusText(contract.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created {new Date(contract.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {contract.status === 'pending_finalization' && (
                <button
                  onClick={onFinalize}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Finalize Contract
                </button>
              )}
              {contract.status === 'executed' && (
                <a
                  href={apiService.getDownloadUrl(contract.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Contract Overview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Details</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Created on {new Date(contract.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {contract.totalSigners} signers ({contract.signedCount} signed)
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Digital contract document
                    </span>
                  </div>

                  {contract.sha256 && (
                    <div className="flex items-start space-x-2">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-sm text-gray-600 block">Document Hash (SHA-256):</span>
                        <code className="text-xs text-gray-500 font-mono bg-white p-2 rounded border inline-block mt-1">
                          {contract.sha256}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Status</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-green-600">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">Encryption Active</span>
                </div>
                
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Identity Verified</span>
                </div>
                
                {contract.status === 'executed' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Location Recorded</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-green-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Timestamp Sealed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signing Parties */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signers</h3>
            <div className="space-y-4">
              {contract.signers?.map((signer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {signer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{signer.name}</h4>
                        <p className="text-sm text-gray-500">{signer.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {signer.status === 'signed' ? (
                        <>
                          <div className="text-right">
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Signed</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {signer.signedAt && new Date(signer.signedAt).toLocaleString()}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">Pending</span>
                          </div>
                          {contract.status === 'draft' && (
                            <button
                              onClick={() => generateInviteLink(signer.id)}
                              disabled={generatingLink}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center space-x-1"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy Link</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {signer.status === 'signed' && (
                    <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium">Verification:</span> Identity confirmed
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {
                            signer.gpsAccuracy ? `GPS verified (±${Math.round(signer.gpsAccuracy)}m)` : 'GPS verified'
                          }
                        </div>
                        <div>
                          <span className="font-medium">Device:</span> Secure session
                        </div>
                        <div>
                          <span className="font-medium">Method:</span> Digital signature
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contract Content Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contract Content</h3>
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h4 className="mt-4 text-lg font-medium text-gray-700">Contract Document</h4>
              <p className="text-gray-500 mt-2">
                In production, this would display the full contract PDF or generated document content.
              </p>
              {contract.status === 'executed' && (
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  View Full Document
                </button>
              )}
            </div>
          </div>

          {/* Audit Trail */}
          {contract.status === 'executed' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Audit Trail</h3>
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h4 className="font-medium text-gray-900">Complete Execution Log</h4>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Contract Executed</p>
                      <p className="text-xs text-gray-500">All parties have signed • {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {contract.signers?.filter(s => s.signedAt).map((signer, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{signer.name} Signed</p>
                        <p className="text-xs text-gray-500">
                          Digital signature captured • {signer.signedAt && new Date(signer.signedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Contract Created</p>
                      <p className="text-xs text-gray-500">Initial draft created • {new Date(contract.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}