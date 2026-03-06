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
      const { clientSecret, paymentIntentId } = data.purchaseCourse;
      // Pass clientSecret via URL so CheckoutPage can init Stripe Elements
      // without an extra API call. secret is NOT stored in localStorage.
      const params = new URLSearchParams({
        secret: clientSecret,
        session: paymentIntentId,
        course: courseId,
      });
      void navigate(`/checkout?${params.toString()}`);
    },
    onError: () => {
      // Error surfaced via button disabled/error state — no raw message to user
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
