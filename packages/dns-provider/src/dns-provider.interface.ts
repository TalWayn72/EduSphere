/**
 * DnsProvider — Abstract interface for DNS record management.
 *
 * Implementations handle subdomain creation, custom domain verification,
 * and SSL certificate provisioning for white-label tenants.
 */

export interface SubdomainResult {
  url: string;
}

export interface DomainVerificationRequest {
  token: string;
  recordType: 'TXT' | 'CNAME';
  recordValue: string;
}

export interface DnsProvider {
  /**
   * Create a subdomain record (e.g., acme.edusphere.io → gateway).
   */
  createSubdomain(slug: string): Promise<SubdomainResult>;

  /**
   * Remove a subdomain record during provisioning rollback.
   */
  deleteSubdomain(slug: string): Promise<void>;

  /**
   * Start custom domain verification — returns DNS record instructions.
   */
  requestDomainVerification(domain: string): Promise<DomainVerificationRequest>;

  /**
   * Check whether the domain's DNS record matches the verification token.
   */
  checkDomainVerification(domain: string, token: string): Promise<boolean>;
}
