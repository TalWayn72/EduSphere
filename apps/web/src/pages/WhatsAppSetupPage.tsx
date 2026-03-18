import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MessageCircle } from 'lucide-react';
import * as urql from 'urql';

const COUNTRY_CODES = [
  { code: '+1', label: 'US (+1)' }, { code: '+44', label: 'UK (+44)' },
  { code: '+972', label: 'IL (+972)' }, { code: '+49', label: 'DE (+49)' },
  { code: '+33', label: 'FR (+33)' }, { code: '+34', label: 'ES (+34)' },
  { code: '+39', label: 'IT (+39)' }, { code: '+81', label: 'JP (+81)' },
  { code: '+86', label: 'CN (+86)' }, { code: '+91', label: 'IN (+91)' },
  { code: '+55', label: 'BR (+55)' }, { code: '+61', label: 'AU (+61)' },
  { code: '+82', label: 'KR (+82)' }, { code: '+7', label: 'RU (+7)' },
  { code: '+52', label: 'MX (+52)' }, { code: '+31', label: 'NL (+31)' },
  { code: '+46', label: 'SE (+46)' }, { code: '+47', label: 'NO (+47)' },
  { code: '+48', label: 'PL (+48)' }, { code: '+90', label: 'TR (+90)' },
];

const REGISTER_MUTATION = `mutation RegisterWhatsApp($input: RegisterWhatsAppInput!) {
  registerWhatsApp(input: $input) { success }
}`;
const VERIFY_MUTATION = `mutation VerifyWhatsApp($input: VerifyWhatsAppInput!) {
  verifyWhatsApp(input: $input) { success }
}`;

export function WhatsAppSetupPage() {
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const [, registerMutation] = urql.useMutation(REGISTER_MUTATION);
  const [, verifyMutation] = urql.useMutation(VERIFY_MUTATION);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await registerMutation({ input: { phoneNumber: phone, countryCode } });
    if (result.data?.registerWhatsApp?.success) setStep('verify');
  }, [phone, countryCode, registerMutation]);

  const handleVerify = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyMutation({ input: { code: otpCode } });
  }, [otpCode, verifyMutation]);

  const handleResend = useCallback(() => {
    void registerMutation({ input: { phoneNumber: phone, countryCode } });
  }, [phone, countryCode, registerMutation]);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold">WhatsApp Setup</h1>
      </div>

      {step === 'register' ? (
        <form onSubmit={(e) => void handleRegister(e)} className="space-y-4" aria-label="WhatsApp registration">
          <div>
            <Label htmlFor="country-code">Country Code</Label>
            <select
              id="country-code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
              aria-label="Country code"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input id="phone-number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="5551234567" required aria-label="Phone number" />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox id="wa-consent" checked={consent}
              onCheckedChange={(v) => setConsent(v === true)} aria-label="WhatsApp consent" />
            <Label htmlFor="wa-consent" className="text-sm leading-snug">
              I agree to receive notifications via WhatsApp
            </Label>
          </div>
          <Button type="submit" disabled={!consent || !phone} className="w-full">
            Send Verification Code
          </Button>
        </form>
      ) : (
        <form onSubmit={(e) => void handleVerify(e)} className="space-y-4" aria-label="WhatsApp verification">
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {countryCode} {phone}
          </p>
          <div>
            <Label htmlFor="otp-code">Verification Code</Label>
            <Input id="otp-code" type="text" inputMode="numeric" maxLength={6}
              value={otpCode} onChange={(e) => setOtpCode(e.target.value)}
              placeholder="000000" required aria-label="Verification code" />
          </div>
          <Button type="submit" disabled={otpCode.length !== 6} className="w-full">Verify</Button>
          <button type="button" onClick={handleResend}
            className="text-sm text-blue-600 hover:underline w-full text-center">
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
