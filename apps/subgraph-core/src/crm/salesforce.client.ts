/**
 * SalesforceClient — OAuth 2.0 + REST API client for Salesforce.
 * Handles authorization URL generation, code exchange, token refresh,
 * activity creation, and HMAC webhook signature verification.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';

const SF_AUTH_BASE = 'https://login.salesforce.com';
const SF_API_VERSION = 'v59.0';

export interface SalesforceTokens {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  expiresAt: Date;
}

export interface SalesforceTokenRefresh {
  accessToken: string;
  expiresAt: Date;
}

export interface CompletionActivityInput {
  userId: string;
  courseTitle: string;
  completionDate: Date;
  durationHours?: number;
}

@Injectable()
export class SalesforceClient {
  private readonly logger = new Logger(SalesforceClient.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env['SALESFORCE_CLIENT_ID'] ?? '';
    this.clientSecret = process.env['SALESFORCE_CLIENT_SECRET'] ?? '';
    this.redirectUri =
      process.env['SALESFORCE_REDIRECT_URI'] ??
      '/crm/salesforce/oauth-callback';
  }

  getAuthorizationUrl(tenantId: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: `${tenantId}:${state}`,
      scope: 'full refresh_token',
    });
    return `${SF_AUTH_BASE}/services/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<SalesforceTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });
    const res = await fetch(`${SF_AUTH_BASE}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce token exchange failed: ${text}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      instance_url: string;
      issued_at?: string;
    };
    // Salesforce tokens expire in ~2 hours; use issued_at + 7200s
    const issuedMs = data.issued_at ? Number(data.issued_at) : Date.now();
    const expiresAt = new Date(issuedMs + 7_200_000);
    this.logger.log(
      { instanceUrl: data.instance_url },
      'Salesforce code exchanged'
    );
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      instanceUrl: data.instance_url,
      expiresAt,
    };
  }

  async refreshToken(refreshToken: string): Promise<SalesforceTokenRefresh> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await fetch(`${SF_AUTH_BASE}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce token refresh failed: ${text}`);
    }
    const data = (await res.json()) as {
      access_token: string;
      issued_at?: string;
    };
    const issuedMs = data.issued_at ? Number(data.issued_at) : Date.now();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(issuedMs + 7_200_000),
    };
  }

  async createCompletionActivity(
    instanceUrl: string,
    accessToken: string,
    payload: CompletionActivityInput
  ): Promise<string> {
    const body = {
      Subject: `Course Completed: ${payload.courseTitle}`,
      Status: 'Completed',
      ActivityDate: payload.completionDate.toISOString().split('T')[0],
      Description:
        `User ${payload.userId} completed "${payload.courseTitle}"` +
        (payload.durationHours ? ` (${payload.durationHours}h)` : ''),
      Type: 'Other',
    };
    const res = await fetch(
      `${instanceUrl}/services/data/${SF_API_VERSION}/sobjects/Task/`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Salesforce createTask failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as { id: string };
    this.logger.log(
      { activityId: data.id, courseTitle: payload.courseTitle },
      'Salesforce activity created'
    );
    return data.id;
  }

  verifyWebhookSignature(
    body: string,
    signature: string,
    secret: string
  ): boolean {
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }
}
