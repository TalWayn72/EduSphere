import { gql } from 'urql';

export const TENANT_SOCIAL_LINKS_QUERY = gql`
  query TenantSocialLinks {
    tenantSocialLinks {
      id
      linkedinUrl
      facebookUrl
      twitterUrl
      youtubeUrl
      instagramUrl
      whatsappUrl
      githubUrl
    }
  }
`;

export const UPDATE_TENANT_SOCIAL_LINKS_MUTATION = gql`
  mutation UpdateTenantSocialLinks($input: UpdateTenantSocialLinksInput!) {
    updateTenantSocialLinks(input: $input) {
      id
      linkedinUrl
      facebookUrl
      twitterUrl
      youtubeUrl
      instagramUrl
      whatsappUrl
      githubUrl
    }
  }
`;

export interface TenantSocialLinks {
  id: string;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  githubUrl: string | null;
}
