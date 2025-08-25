import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Shield, MapPin, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { Contract } from '../App';

interface User {
  id: string;
  email: string;
  name: string;
}

interface SignContractProps {
  contract: Contract;
  user: User;
  onSigningComplete: (contractId: string, signatureData: any) => void;
  onCancel: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function SignContract({ contract, user, onSigningComplete, onCancel }: SignContractProps) {
  const [step, setStep] = useState<'verify' | 'review' | 'sign' | 'complete'>('verify');
  const [verificationMethod, setVerificationMethod] = useState<'otp' | 'id' | 'biometric'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    // Get user's location for audit trail
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const handleVerification = () => {
    // Simulate OTP verification
    if (verificationMethod === 'otp' && otpCode === '123456') {
      setIsVerified(true);
      setStep('review');
    } else if (verificationMethod === 'otp') {
      alert('Invalid OTP. Use 123456 for demo purposes.');
    } else {
      // For other methods, just proceed for demo
      setIsVerified(true);
      setStep('review');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    setLastX(x);
    setLastY(y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if ('touches' in e) {
      e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    setLastX(x);
    setLastY(y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature('');
    }
  };

  const completeSignature = () => {
    if (!signature || !hasConsented) {
      alert('Please provide your signature and consent to continue.');
      return;
    }

    const signatureData = {
      signature,
      location,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1', // Would be captured on backend
      userAgent: navigator.userAgent,
      verificationMethod,
      consent: hasConsented
    };

    onSigningComplete(contract.id, signatureData);
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
                <h2 className="text-xl font-semibold text-gray-900">Digital Contract Signing</h2>
                <p className="text-sm text-gray-500">{contract.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">Secure Signing Session</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Identity Verification */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-blue-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Verify Your Identity</h3>
                <p className="text-gray-600">We need to verify your identity before you can sign this contract.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choose verification method:
                  </label>
                  <div className="space-y-3">
                    <button
                      onClick={() => setVerificationMethod('otp')}
                      className={`w-full p-4 border rounded-lg text-left transition-all ${
                        verificationMethod === 'otp'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-6 w-6 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">SMS/Email OTP (Light)</h4>
                          <p className="text-sm text-gray-600">Verify via one-time code</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setVerificationMethod('id')}
                      className={`w-full p-4 border rounded-lg text-left transition-all ${
                        verificationMethod === 'id'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Shield className="h-6 w-6 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">Government ID (Standard)</h4>
                          <p className="text-sm text-gray-600">Upload ID + selfie verification</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setVerificationMethod('biometric')}
                      className={`w-full p-4 border rounded-lg text-left transition-all ${
                        verificationMethod === 'biometric'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">Biometric + ID (Strong)</h4>
                          <p className="text-sm text-gray-600">Face/Touch ID + government ID</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {verificationMethod === 'otp' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter OTP Code (use 123456 for demo)
                    </label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter 6-digit code..."
                      maxLength={6}
                    />
                  </div>
                )}

                {verificationMethod === 'id' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800">In production, this would integrate with identity verification services like Stripe Identity or Onfido.</p>
                  </div>
                )}

                {verificationMethod === 'biometric' && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800">Biometric verification would use device capabilities or third-party biometric services.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleVerification}
                  disabled={verificationMethod === 'otp' && otpCode.length < 6}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Verify Identity
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review Contract */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Identity Verified</span>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review Contract</h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">{contract.title}</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Parties:</strong></p>
                    <ul className="ml-4 space-y-1">
                      {contract.parties.map((party, index) => (
                        <li key={index}>• {party.name} ({party.email})</li>
                      ))}
                    </ul>
                    <p className="mt-4"><strong>Created:</strong> {new Date(contract.createdAt).toLocaleString()}</p>
                  </div>
                  
                  <div className="mt-4 p-4 bg-white rounded border">
                    <p className="text-sm text-gray-700">
                      [Contract content would be displayed here. In production, this would show the full PDF content or template-generated contract text.]
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('verify')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('sign')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Proceed to Sign
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Digital Signature */}
          {step === 'sign' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Digital Signature</h3>
                
                {/* Location Status */}
                {location && (
                  <div className="flex items-center space-x-2 text-green-600 mb-4">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">Location verified (±{Math.round(location.accuracy)}m accuracy)</span>
                  </div>
                )}

                {/* Signature Canvas */}
                <div className="border-2 border-gray-300 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Please sign below:
                  </label>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="border border-gray-200 rounded cursor-crosshair touch-none"
                    style={{ width: '100%', maxWidth: '600px', height: '200px' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-xs text-gray-500">Sign using your mouse, finger, or stylus</p>
                    <button
                      onClick={clearSignature}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Legal Consent */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-yellow-800 mb-2">Electronic Signature Consent</h4>
                      <div className="text-sm text-yellow-700 space-y-2">
                        <p>By signing digitally, you agree that:</p>
                        <ul className="ml-4 space-y-1">
                          <li>• Your electronic signature has the same legal effect as a handwritten signature</li>
                          <li>• You consent to conduct this transaction electronically</li>
                          <li>• Your signature, location, and identity verification will be recorded</li>
                          <li>• This document will be stored securely with audit trail</li>
                        </ul>
                      </div>
                      
                      <label className="flex items-center mt-4">
                        <input
                          type="checkbox"
                          checked={hasConsented}
                          onChange={(e) => setHasConsented(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm font-medium text-yellow-800">
                          I agree to the electronic signature consent terms above
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('review')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Back to Review
                </button>
                <button
                  onClick={completeSignature}
                  disabled={!signature || !hasConsented}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Complete Signature</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}