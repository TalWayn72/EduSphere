/**
 * CheckoutPage — Stripe Elements payment form for course purchases.
 *
 * Flow:
 *   1. PurchaseCourseButton calls `purchaseCourse` mutation → gets clientSecret + paymentIntentId
 *   2. Navigates to /checkout?secret=<clientSecret>&session=<paymentIntentId>&course=<courseId>
 *   3. This page initialises Stripe Elements with the clientSecret
 *   4. On payment success → shows receipt and redirects to the course
 *
 * Security: clientSecret is NOT stored in localStorage. It lives only in
 * memory (React state) for the lifetime of this page.
 *
 * BUG-103: Stripe.js is now lazily loaded via dynamic import() to avoid
 * injecting a <script> tag for js.stripe.com in environments where the
 * VITE_STRIPE_PUBLISHABLE_KEY env var is not configured. This eliminates the
 * "Failed to load Stripe.js" console error that previously appeared on every
 * page load when the Stripe CDN was unreachable (corporate proxy, dev env).
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string | undefined) ?? '';

/**
 * BUG-103: Lazily load Stripe.js only when the publishable key is configured.
 * Uses dynamic import() so that `@stripe/stripe-js` (which injects a <script>
 * tag on module evaluation) is never loaded in environments without the key.
 * The promise is cached so subsequent calls return the same instance.
 */
let _stripePromise: Promise<import('@stripe/stripe-js').Stripe | null> | null = null;

function getStripePromise() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  if (!_stripePromise) {
    _stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(STRIPE_PUBLISHABLE_KEY)
    );
  }
  return _stripePromise;
}

// ── Inner form (must be a child of <Elements>) ────────────────────────────────

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface CheckoutFormProps {
  courseId: string | null;
}

function CheckoutForm({ courseId }: CheckoutFormProps) {
  const { t } = useTranslation('courses');
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setStatus('processing');
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      // Only show user-safe error messages (decline codes, validation)
      setStatus('error');
      setErrorMessage(
        error.type === 'card_error' || error.type === 'validation_error'
          ? (error.message ?? t('checkout.paymentFailed'))
          : t('checkout.paymentError')
      );
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      setStatus('success');
      // Give the backend webhook a moment to grant access, then redirect
      setTimeout(() => {
        if (courseId) {
          void navigate(`/courses/${courseId}`);
        } else {
          void navigate('/library');
        }
      }, 2500);
    }
  };

  if (status === 'success') {
    return (
      <div
        className="text-center py-8"
        data-testid="checkout-success"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4 dark:text-green-400" />
        <h2 className="text-xl font-semibold mb-2">{t('checkout.paymentSuccessful')}</h2>
        <p className="text-muted-foreground">
          {t('checkout.redirecting')}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} data-testid="checkout-form">
      <PaymentElement
        options={{ layout: 'tabs' }}
        data-testid="stripe-payment-element"
      />

      {errorMessage && (
        <div
          className="mt-4 flex items-start gap-2 text-sm text-destructive"
          role="alert"
          data-testid="checkout-error"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full mt-6"
        disabled={!stripe || !elements || status === 'processing'}
        data-testid="checkout-submit-button"
      >
        {status === 'processing' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('checkout.processing')}
          </>
        ) : (
          t('checkout.payNow')
        )}
      </Button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const { t } = useTranslation('courses');
  const [searchParams] = useSearchParams();
  const clientSecret = searchParams.get('secret');
  const courseId = searchParams.get('course');

  // clientSecret missing — likely navigated here directly without purchasing
  if (!clientSecret) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4 dark:text-amber-400" />
          <h1 className="text-2xl font-bold mb-2">{t('checkout.noSession')}</h1>
          <p className="text-muted-foreground">
            {t('checkout.selectCourse')}
          </p>
        </div>
      </Layout>
    );
  }

  const stripePromise = getStripePromise();

  // Stripe not configured — show user-friendly fallback
  if (!STRIPE_PUBLISHABLE_KEY || !stripePromise) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4 dark:text-amber-400" />
          <h1 className="text-2xl font-bold mb-2">{t('checkout.unavailable')}</h1>
          <p className="text-muted-foreground">
            {t('checkout.unavailableDesc')}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {t('checkout.completePurchase')}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('checkout.paymentDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#6366F1' },
                },
              }}
            >
              <CheckoutForm courseId={courseId} />
            </Elements>
          </CardContent>
        </Card>
        <p className="mt-4 text-xs text-center text-muted-foreground">
          {t('checkout.stripeNotice')}
        </p>
      </div>
    </Layout>
  );
}
