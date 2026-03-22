/**
 * MockDnsProvider — In-memory DNS provider for development and testing.
 *
 * All operations succeed immediately. State stored in a Map.
 */
import type {
  DnsProvider,
  SubdomainResult,
  DomainVerificationRequest,
} from './dns-provider.interface';

const BASE_DOMAIN = 'edusphere.io';

interface MockDomainEntry {
  token: string;
  verified: boolean;
}

export class MockDnsProvider implements DnsProvider {
  private readonly subdomains = new Map<string, string>();
  private readonly domains = new Map<string, MockDomainEntry>();

  /** Max entries to prevent unbounded growth (LRU eviction) */
  private static readonly MAX_ENTRIES = 1000;

  async createSubdomain(slug: string): Promise<SubdomainResult> {
    this.evictIfNeeded(this.subdomains);
    const url = `https://${slug}.${BASE_DOMAIN}`;
    this.subdomains.set(slug, url);
    return { url };
  }

  async deleteSubdomain(slug: string): Promise<void> {
    this.subdomains.delete(slug);
  }

  async requestDomainVerification(
    domain: string
  ): Promise<DomainVerificationRequest> {
    this.evictIfNeeded(this.domains);
    const token = `mock-verify-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.domains.set(domain, { token, verified: false });
    return {
      token,
      recordType: 'TXT',
      recordValue: `_edusphere-verification.${domain}`,
    };
  }

  async checkDomainVerification(
    domain: string,
    token: string
  ): Promise<boolean> {
    const entry = this.domains.get(domain);
    if (!entry) return false;
    // Mock always verifies if token matches
    if (entry.token === token) {
      entry.verified = true;
      return true;
    }
    return false;
  }

  // ── Test helpers ──────────────────────────────────────────────

  /** Force-verify a domain (test helper). */
  forceVerify(domain: string): void {
    const entry = this.domains.get(domain);
    if (entry) entry.verified = true;
  }

  /** Check if subdomain exists (test helper). */
  hasSubdomain(slug: string): boolean {
    return this.subdomains.has(slug);
  }

  /** Get stored domain entry (test helper). */
  getDomainEntry(domain: string): MockDomainEntry | undefined {
    return this.domains.get(domain);
  }

  /** Clear all state (test helper). */
  clear(): void {
    this.subdomains.clear();
    this.domains.clear();
  }

  private evictIfNeeded(map: Map<string, unknown>): void {
    if (map.size >= MockDnsProvider.MAX_ENTRIES) {
      const firstKey = map.keys().next().value;
      if (firstKey !== undefined) map.delete(firstKey);
    }
  }
}
