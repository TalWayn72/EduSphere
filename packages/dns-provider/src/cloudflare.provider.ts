/**
 * CloudflareDnsProvider — Cloudflare API implementation for DNS management.
 *
 * Requires env vars:
 *   CLOUDFLARE_API_TOKEN  — API token with Zone:DNS:Edit permission
 *   CLOUDFLARE_ZONE_ID    — Zone ID for the edusphere.io domain
 *
 * Uses Cloudflare REST API v4: https://developers.cloudflare.com/api/
 */
import type {
  DnsProvider,
  SubdomainResult,
  DomainVerificationRequest,
} from './dns-provider.interface';

const CF_API = 'https://api.cloudflare.com/client/v4';
const BASE_DOMAIN = process.env['EDUSPHERE_BASE_DOMAIN'] ?? 'edusphere.io';
const GATEWAY_IP = process.env['EDUSPHERE_GATEWAY_IP'] ?? '203.0.113.1'; // placeholder

interface CfDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
}

interface CfApiResponse {
  success: boolean;
  result?: CfDnsRecord;
  errors?: Array<{ message: string }>;
}

function getConfig(): { token: string; zoneId: string } {
  const token = process.env['CLOUDFLARE_API_TOKEN'];
  const zoneId = process.env['CLOUDFLARE_ZONE_ID'];
  if (!token || !zoneId) {
    throw new Error(
      '[CloudflareDnsProvider] Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID'
    );
  }
  return { token, zoneId };
}

async function cfFetch(
  path: string,
  token: string,
  method: string,
  body?: unknown
): Promise<CfApiResponse> {
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as CfApiResponse;
}

function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'edusphere-verify-';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export class CloudflareDnsProvider implements DnsProvider {
  async createSubdomain(slug: string): Promise<SubdomainResult> {
    const { token, zoneId } = getConfig();
    const fqdn = `${slug}.${BASE_DOMAIN}`;

    const resp = await cfFetch(`/zones/${zoneId}/dns_records`, token, 'POST', {
      type: 'A',
      name: fqdn,
      content: GATEWAY_IP,
      ttl: 300,
      proxied: true,
    });

    if (!resp.success) {
      const msg = resp.errors?.[0]?.message ?? 'Unknown Cloudflare error';
      throw new Error(`[CloudflareDnsProvider] createSubdomain failed: ${msg}`);
    }

    return { url: `https://${fqdn}` };
  }

  async deleteSubdomain(slug: string): Promise<void> {
    const { token, zoneId } = getConfig();
    const fqdn = `${slug}.${BASE_DOMAIN}`;

    // Find the record first
    const listResp = await cfFetch(
      `/zones/${zoneId}/dns_records?name=${fqdn}`,
      token,
      'GET'
    );

    const record = listResp.result;
    if (record?.id) {
      await cfFetch(
        `/zones/${zoneId}/dns_records/${record.id}`,
        token,
        'DELETE'
      );
    }
  }

  async requestDomainVerification(
    domain: string
  ): Promise<DomainVerificationRequest> {
    const token = generateVerificationToken();
    return {
      token,
      recordType: 'TXT',
      recordValue: `_edusphere-verification.${domain}`,
    };
  }

  async checkDomainVerification(
    domain: string,
    _token: string
  ): Promise<boolean> {
    // In production: DNS TXT lookup for _edusphere-verification.<domain>
    // comparing against stored token. Using node:dns/promises resolve.
    try {
      const { resolve } = await import('node:dns/promises');
      const records = await resolve(`_edusphere-verification.${domain}`, 'TXT');
      const flat = records.flat();
      return flat.some((r) => r === _token);
    } catch {
      return false;
    }
  }
}
