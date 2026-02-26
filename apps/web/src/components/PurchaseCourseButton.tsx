import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { request, gql } from 'graphql-request';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const GRAPHQL_URL =
  (import.meta.env['VITE_GRAPHQL_URL'] as string) ?? '/graphql';

const PURCHASE_COURSE_MUTATION = gql`
  mutation PurchaseCourse($courseId: ID!) {
    purchaseCourse(courseId: $courseId) {
      clientSecret
      paymentIntentId
    }
  }
`;

interface PurchaseResult {
  purchaseCourse: {
    clientSecret: string;
    paymentIntentId: string;
  };
}

interface PurchaseCourseButtonProps {
  courseId: string;
  priceCents: number;
  currency: string;
}

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return 'Enroll Free';
  return `Purchase ${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)}`;
}

export function PurchaseCourseButton({
  courseId,
  priceCents,
  currency,
}: PurchaseCourseButtonProps) {
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation<PurchaseResult, Error>({
    mutationFn: () =>
      request<PurchaseResult>(GRAPHQL_URL, PURCHASE_COURSE_MUTATION, {
        courseId,
      }),
    onSuccess: (data) => {
      const { paymentIntentId } = data.purchaseCourse;
      // Redirect to checkout page where Stripe.js renders the payment form.
      // The clientSecret is passed via URL search params so the checkout page
      // can initialize Stripe Elements without an additional API call.
      void navigate(`/checkout?session=${paymentIntentId}`);
    },
    onError: (err) => {
      // Error is surfaced to the user via the button's disabled/error state.
      // In production, connect to a toast system here.
      console.error('Purchase failed:', err.message);
    },
  });

  return (
    <Button
      className="w-full"
      onClick={() => mutate()}
      disabled={isPending}
      aria-label={formatPrice(priceCents, currency)}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        formatPrice(priceCents, currency)
      )}
    </Button>
  );
}
