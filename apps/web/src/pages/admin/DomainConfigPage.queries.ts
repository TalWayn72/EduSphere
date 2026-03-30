/**
 * DomainConfigPage GraphQL queries, mutations, types, and validation.
 */
import { z } from 'zod';

// ── GraphQL ─────────────────────────────────────────────────

export const CUSTOM_DOMAINS_QUERY = `
  query CustomDomains {
    customDomains {
      id domain verificationToken verificationRecordType
      verifiedAt sslStatus createdAt
    }
    myOrganization { slug }
  }
`;

export const REQUEST_VERIFICATION_MUTATION = `
  mutation RequestDomainVerification($domain: String!) {
    requestDomainVerification(domain: $domain) {
      token recordType recordValue instructions
    }
  }
`;

export const CHECK_VERIFICATION_MUTATION = `
  mutation CheckDomainVerification($domain: String!) {
    checkDomainVerification(domain: $domain) {
      id domain verifiedAt sslStatus
    }
  }
`;

export const REMOVE_DOMAIN_MUTATION = `
  mutation RemoveCustomDomain($domainId: ID!) {
    removeCustomDomain(domainId: $domainId)
  }
`;

// ── Validation ──────────────────────────────────────────────

export const domainSchema = z.object({
  domain: z
    .string()
    .min(4, 'Domain is too short')
    .max(255)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/,
      'Enter a valid domain (e.g., learn.example.com)'
    ),
});

export type DomainForm = z.infer<typeof domainSchema>;

// ── Types ───────────────────────────────────────────────────

export interface CustomDomainRow {
  id: string;
  domain: string;
  verificationToken: string | null;
  verificationRecordType: string | null;
  verifiedAt: string | null;
  sslStatus: string;
  createdAt: string;
}

export interface VerificationInfo {
  token: string;
  recordType: string;
  recordValue: string;
  instructions: string;
}
