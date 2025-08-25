import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (data: { gpsLocation: { lat: number; lng: number; accuracy: number } | null }) => Promise<void>;
  contractTitle: string;
  userName: string;
  userEmail: string;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  onClose,
  onConsent,
  contractTitle,
  userName,
  userEmail,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [useGps, setUseGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setHasAgreed(false);
      setUseGps(false);
      setGpsError(null);
      setGpsLocation(null);
    }
  }, [isOpen]);

  const handleGpsToggle = async (checked: boolean) => {
    setUseGps(checked);
    setGpsError(null);
    
    if (checked) {
      try {
        const position = await getCurrentPosition();
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      } catch (error) {
        console.error('Error getting location:', error);
        setGpsError('Unable to retrieve your location. Please check your browser permissions or try without GPS.');
        setUseGps(false);
      }
    } else {
      setGpsLocation(null);
    }
  };

  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) return;

    setIsLoading(true);
    try {
      await onConsent({ gpsLocation });
      onClose();
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const consentText = `I, ${userName} (${userEmail}), consent to sign the document titled "${contractTitle}" electronically. I confirm that I am the intended signer, that my contact information is accurate, and that I understand an electronic signature is legally binding.`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Signing Consent</DialogTitle>
            <DialogDescription>
              Please review and agree to the following terms before signing the document.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{consentText}</p>
            </div>

            <div className="flex items-start space-x-3 py-2">
              <Checkbox
                id="consent"
                checked={hasAgreed}
                onCheckedChange={(checked) => setHasAgried(checked === true)}
                disabled={isLoading}
              />
              <div className="space-y-1">
                <Label htmlFor="consent" className="text-sm font-medium leading-none">
                  I agree to the terms above
                </Label>
                <p className="text-xs text-muted-foreground">
                  By checking this box, you confirm your consent to sign this document electronically.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="location"
                  checked={useGps}
                  onCheckedChange={handleGpsToggle}
                  disabled={isLoading}
                />
                <Label htmlFor="location" className="text-sm font-medium leading-none">
                  Include my location
                </Label>
              </div>
              {gpsError && (
                <p className="text-xs text-destructive">{gpsError}</p>
              )}
              {gpsLocation && (
                <p className="text-xs text-muted-foreground">
                  Location: {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)} (Accuracy: ±{Math.ceil(gpsLocation.accuracy)}m)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Your location will be recorded with your signature for verification purposes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!hasAgreed || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'I Agree & Continue'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
