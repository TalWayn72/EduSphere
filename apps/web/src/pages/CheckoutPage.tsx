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
 */
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
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

// Lazily initialised so the key can be set at runtime via env
const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

// ── Inner form (must be a child of <Elements>) ────────────────────────────────

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

interface CheckoutFormProps {
  courseId: string | null;
}

function CheckoutForm({ courseId }: CheckoutFormProps) {
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
          ? (error.message ?? 'Payment failed. Please check your card details.')
          : 'Payment could not be processed. Please try again.'
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
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground">
          Redirecting you to your course…
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
            Processing…
          </>
        ) : (
          'Pay Now'
        )}
      </Button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const clientSecret = searchParams.get('secret');
  const courseId = searchParams.get('course');

  // clientSecret missing — likely navigated here directly without purchasing
  if (!clientSecret) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Payment Session</h1>
          <p className="text-muted-foreground">
            Please select a course to purchase from the marketplace.
          </p>
        </div>
      </Layout>
    );
  }

  // Stripe not configured — show user-friendly fallback
  if (!STRIPE_PUBLISHABLE_KEY || !stripePromise) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Unavailable</h1>
          <p className="text-muted-foreground">
            Online payments are not configured for this installation. Please
            contact your administrator.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Complete Your Purchase
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
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
          Payments are processed securely by Stripe. EduSphere does not store
          your card details.
        </p>
      </div>
    </Layout>
  );
}
