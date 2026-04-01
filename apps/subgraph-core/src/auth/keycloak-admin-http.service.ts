/**
 * KeycloakAdminHttpService — HTTP client with retry, token management,
 * and Keycloak realm configuration helpers.
 * Extracted from KeycloakAdminService to keep files under 300 lines.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';

interface KeycloakGroup {
  id: string;
  name: string;
}

interface KeycloakUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
}

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

export type { KeycloakGroup, KeycloakUser };

@Injectable()
export class KeycloakAdminHttpService implements OnModuleDestroy {
  private readonly logger = new Logger(KeycloakAdminHttpService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl(): string {
    return process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
  }

  private get realm(): string {
    return process.env.KEYCLOAK_REALM ?? 'edusphere';
  }

  private get clientId(): string {
    return process.env.KEYCLOAK_CLIENT_ID ?? 'edusphere-app';
  }

  private get clientSecret(): string {
    return process.env.KEYCLOAK_CLIENT_SECRET ?? '';
  }

  get adminBase(): string {
    return `${this.baseUrl}/admin/realms/${this.realm}`;
  }

  async onModuleDestroy(): Promise<void> {
    this.accessToken = null;
    this.logger.log('[KeycloakAdminHttpService] onModuleDestroy: cleaned up');
  }

  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const url = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return this.accessToken;
  }

  async findGroupByName(name: string): Promise<KeycloakGroup | null> {
    const token = await this.getToken();
    const res = await this.fetchWithRetry(
      `${this.adminBase}/groups?search=${encodeURIComponent(name)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const groups = (await res.json()) as KeycloakGroup[];
    return groups.find((g) => g.name === name) ?? null;
  }

  async findUserByEmail(email: string): Promise<KeycloakUser | null> {
    const token = await this.getToken();
    const res = await this.fetchWithRetry(
      `${this.adminBase}/users?email=${encodeURIComponent(email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const users = (await res.json()) as KeycloakUser[];
    return users[0] ?? null;
  }

  async sendPasswordResetEmail(userId: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithRetry(
      `${this.adminBase}/users/${userId}/execute-actions-email`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['UPDATE_PASSWORD']),
      }
    );
  }

  async fetchWithRetry(
    url: string,
    init: RequestInit,
    attempt = 1
  ): Promise<Response> {
    try {
      const res = await fetch(url, init);
      if (res.ok || res.status === 409) return res;
      if (attempt < MAX_RETRIES && res.status >= 500) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      const body = await res.text();
      throw new InternalServerErrorException(
        `Keycloak API error ${res.status}: ${body}`
      );
    } catch (err) {
      if (
        attempt < MAX_RETRIES &&
        !(err instanceof InternalServerErrorException)
      ) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw err;
    }
  }
}
