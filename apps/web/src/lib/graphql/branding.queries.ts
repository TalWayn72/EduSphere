import { gql } from 'urql';

export const TENANT_BRANDING_QUERY = gql`
  query TenantBranding {
    myTenantBranding {
      logoUrl
      logoMarkUrl
      faviconUrl
      primaryColor
      secondaryColor
      accentColor
      backgroundColor
      fontFamily
      organizationName
      tagline
      privacyPolicyUrl
      termsOfServiceUrl
      supportEmail
      hideEduSphereBranding
      customCss
    }
  }
`;

export const PUBLIC_BRANDING_QUERY = gql`
  query PublicBranding($slug: String!) {
    publicBranding(slug: $slug) {
      primaryColor
      accentColor
      logoUrl
      faviconUrl
      organizationName
      tagline
    }
  }
`;

export const UPDATE_TENANT_BRANDING_MUTATION = gql`
  mutation UpdateTenantBranding($input: UpdateTenantBrandingInput!) {
    updateTenantBranding(input: $input) {
      logoUrl
      logoMarkUrl
      faviconUrl
      primaryColor
      secondaryColor
      accentColor
      backgroundColor
      fontFamily
      organizationName
      tagline
      privacyPolicyUrl
      termsOfServiceUrl
      supportEmail
      hideEduSphereBranding
    }
  }
`;
