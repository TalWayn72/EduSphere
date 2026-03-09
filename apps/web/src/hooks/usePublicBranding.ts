import { useQuery } from 'urql';
import { PUBLIC_BRANDING_QUERY } from '@/lib/graphql/branding.queries';

interface PublicBranding {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  faviconUrl: string;
  organizationName: string;
  tagline?: string | null;
}

export function usePublicBranding(slug: string | null) {
  const [{ data, fetching }] = useQuery<{ publicBranding: PublicBranding | null }>({
    query: PUBLIC_BRANDING_QUERY,
    variables: { slug: slug ?? '' },
    pause: !slug,
    requestPolicy: 'cache-and-network',
  });
  return {
    branding: data?.publicBranding ?? null,
    fetching,
  };
}
