import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, MapPin, Smartphone, CheckCircle, AlertTriangle } from 'lucide-react';
import { apiService, SigningData } from '../services/api';

interface SigningPageProps {
  onComplete: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export default function SigningPage({ onComplete }: SigningPageProps) {
  const [step, setStep] = useState<'loading' | 'verify' | 'review' | 'sign' | 'complete'>('loading');
  const [signingData, setSigningData] = useState<SigningData | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [signature, setSignature] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  const token = window.location.pathname.split('/').pop() || '';

  useEffect(() => {
    loadSigningData();
    requestLocation();
  }, []);

  const loadSigningData = async () => {
    try {
      const data = await apiService.getSigningData(token);
      setSigningData(data);
      
      if (data.signer.signed) {
        setStep('complete');
      } else if (data.signer.otpVerified) {
        setIsVerified(true);
        setStep('review');
      } else {
        setStep('verify');
      }
    } catch (error) {
      console.error('Failed to load signing data:', error);
      alert('Invalid or expired signing link');
      onComplete();
    }
  };

  const requestLocation = () => {
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
          setLocationError('Location access denied. This may affect the legal validity of your signature.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError('Location services not available on this device.');
    }
  };

  const sendOTP = async () => {
    try {
      await apiService.startOTP(token);
      setOtpSent(true);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      alert('Failed to send OTP. Please try again.');
    }
  };

  const verifyOTP = async () => {
    try {
      const verified = await apiService.verifyOTP(token, otpCode);
      if (verified) {
        setIsVerified(true);
        setStep('review');
      }
    } catch (error: any) {
      alert(error.message || 'OTP verification failed');
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

  const submitSignature = async () => {
    if (!signature || !hasConsented) {
      alert('Please provide your signature and consent to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiService.submitSignature(token, signature, location, hasConsented);
      
      if (result.allSigned) {
        alert('All parties have signed! The contract is ready for finalization.');
      } else {
        alert('Your signature has been recorded. Waiting for other parties to sign.');
      }
      
      setStep('complete');
    } catch (error: any) {
      console.error('Failed to submit signature:', error);
      alert(error.message || 'Failed to submit signature. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!signingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600 animate-spin" />
          <p className="mt-4 text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={onComplete} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Digital Contract Signing</h2>
                  <p className="text-sm text-gray-500">{signingData.contract.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Secure Session</span>
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
                  <p className="text-sm text-gray-500 mt-2">Signing as: <strong>{signingData.signer.name}</strong></p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">Email OTP Verification</h4>
                        <p className="text-sm text-gray-600">We'll send a verification code to {signingData.signer.email}</p>
                      </div>
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      onClick={sendOTP}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Send Verification Code
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter 6-digit verification code
                        </label>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                          placeholder="000000"
                          maxLength={6}
                        />
                      </div>
                      <button
                        onClick={verifyOTP}
                        disabled={otpCode.length < 6}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      >
                        Verify Code
                      </button>
                      <button
                        onClick={sendOTP}
                        className="w-full text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Resend Code
                      </button>
                    </div>
                  )}
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
                    <h4 className="font-medium text-gray-900 mb-2">{signingData.contract.title}</h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><strong>Signer:</strong> {signingData.signer.name} ({signingData.signer.email})</p>
                    </div>
                    
                    <div className="mt-4 p-4 bg-white rounded border">
                      <p className="text-sm text-gray-700">
                        [Contract content would be displayed here. In production, this would show the full PDF content or contract details.]
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
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
                  <div className="mb-4">
                    {location ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">Location verified (±{Math.round(location.accuracy)}m accuracy)</span>
                      </div>
                    ) : locationError ? (
                      <div className="flex items-center space-x-2 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">{locationError}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">Requesting location...</span>
                      </div>
                    )}
                  </div>

                  {/* Signature Canvas */}
                  <div className="border-2 border-gray-300 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Please sign below:
                    </label>
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      className="border border-gray-200 rounded cursor-crosshair touch-none w-full"
                      style={{ maxWidth: '600px', height: '200px' }}
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
                          <p>By checking this box, I consent to use of electronic records and signatures for this agreement. I also agree to share my device's location (GPS) for fraud prevention and jurisdiction purposes. Location accuracy may vary depending on your device.</p>
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
                    onClick={submitSignature}
                    disabled={!signature || !hasConsented || submitting}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>{submitting ? 'Submitting...' : 'Complete Signature'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <div className="text-center space-y-6">
                <div>
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                  <h3 className="mt-4 text-xl font-medium text-gray-900">Signature Complete!</h3>
                  <p className="text-gray-600 mt-2">
                    Your signature has been recorded and verified. The contract will be finalized once all parties have signed.
                  </p>
                </div>
                
                <button
                  onClick={onComplete}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}