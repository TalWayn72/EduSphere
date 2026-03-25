/**
 * OrgSignupWizard — 3-step wizard for organization signup.
 * Steps: Account → Organization → Branding
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  tosAgree: boolean;
  gdprConsent: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score / 5, 1);
}

export function OrgSignupWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    password: '',
    tosAgree: false,
    gdprConsent: false,
  });
  const [emailError, setEmailError] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);

  const isStep1Valid =
    formData.fullName.trim().length > 0 &&
    isValidEmail(formData.email) &&
    formData.password.length >= 6 &&
    formData.tosAgree &&
    formData.gdprConsent;

  const handleNext = useCallback(() => {
    if (step === 1 && isStep1Valid) {
      setStep(2);
    }
  }, [step, isStep1Valid]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const handleEmailBlur = useCallback(() => {
    setEmailTouched(true);
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError(t('orgOnboarding.invalidEmail'));
    } else {
      setEmailError('');
    }
  }, [formData.email, t]);

  return (
    <div>
      {/* Stepper navigation */}
      <nav aria-label="wizard" role="navigation">
        <span>{t('orgOnboarding.stepAccount')}</span>
        <span>{t('orgOnboarding.stepOrganization')}</span>
        <span>{t('orgOnboarding.stepBranding')}</span>
      </nav>

      {/* Step 1: Account */}
      {step === 1 && (
        <div>
          <h2>{t('orgOnboarding.createAccount')}</h2>
          <div>
            <label htmlFor="fullName">{t('orgOnboarding.fullName')}</label>
            <input
              id="fullName"
              aria-required="true"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
            />
          </div>
          <div>
            <label htmlFor="email">{t('orgOnboarding.workEmail')}</label>
            <input
              id="email"
              type="email"
              aria-required="true"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              onBlur={handleEmailBlur}
            />
            {emailTouched && emailError && (
              <p role="alert">{emailError}</p>
            )}
          </div>
          <div>
            <label htmlFor="password">{t('orgOnboarding.password')}</label>
            <input
              id="password"
              type="password"
              aria-required="true"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            {formData.password.length > 0 && (
              <meter
                value={getPasswordStrength(formData.password)}
                min={0}
                max={1}
                aria-label="Password strength"
              />
            )}
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.tosAgree}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tosAgree: e.target.checked }))
                }
              />
              {t('orgOnboarding.tosAgree')}
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.gdprConsent}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gdprConsent: e.target.checked }))
                }
              />
              {t('orgOnboarding.gdprConsent')}
            </label>
          </div>
          <button disabled={!isStep1Valid} onClick={handleNext}>
            Next
          </button>
        </div>
      )}

      {/* Step 2: Organization */}
      {step === 2 && (
        <div>
          <h2>{t('orgOnboarding.tellUsAboutOrg')}</h2>
          <button onClick={handleBack}>Back</button>
        </div>
      )}

      {/* Step 3: Branding */}
      {step === 3 && (
        <div>
          <h2>{t('orgOnboarding.brandingSetup')}</h2>
          <button onClick={handleBack}>Back</button>
        </div>
      )}
    </div>
  );
}
