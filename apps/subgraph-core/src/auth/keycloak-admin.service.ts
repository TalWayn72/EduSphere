/**
 * KeycloakAdminService — Wraps Keycloak Admin REST API for org management.
 *
 * Methods:
 *   - createGroup(slug) — Create org group "org:{slug}"
 *   - deleteGroup(groupId) — Rollback org group
 *   - createUser(email, firstName, lastName, groups) — Create org member
 *   - assignRole(userId, role) — Set realm role for user
 *   - removeUserFromGroup(userId, groupId) — Remove user from org
 *   - listGroupMembers(groupId) — List org users
 *   - getAccessToken() — Service account client credentials grant
 *
 * Authentication: Service account with realm-management client role.
 * Retry: 3 attempts with exponential backoff (1s, 2s, 4s).
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

@Injectable()
export class KeycloakAdminService implements OnModuleDestroy {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl(): string {
    return (
      process.env.KEYCLOAK_URL ?? 'http://localhost:8080'
    );
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

  async onModuleDestroy(): Promise<void> {
    this.accessToken = null;
    this.logger.log('[KeycloakAdminService] onModuleDestroy: cleaned up');
  }

  private async getToken(): Promise<string> {
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
    // Refresh 30s before actual expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return this.accessToken;
  }

  private get adminBase(): string {
    return `${this.baseUrl}/admin/realms/${this.realm}`;
  }

  async createGroup(slug: string): Promise<KeycloakGroup> {
    const groupName = `org:${slug}`;
    const token = await this.getToken();

    // Idempotency: check if group already exists
    const existing = await this.findGroupByName(groupName);
    if (existing) return existing;

    const res = await this.fetchWithRetry(`${this.adminBase}/groups`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: groupName }),
    });

    // Keycloak returns 201 with Location header
    const location = res.headers.get('location') ?? '';
    const groupId = location.split('/').pop() ?? '';

    this.logger.log(
      { slug, groupId },
      '[KeycloakAdminService] Group created'
    );
    return { id: groupId, name: groupName };
  }

  async deleteGroup(groupId: string): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithRetry(`${this.adminBase}/groups/${groupId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    this.logger.log({ groupId }, '[KeycloakAdminService] Group deleted');
  }

  async createUser(
    email: string,
    firstName: string,
    lastName: string,
    groupIds: string[]
  ): Promise<KeycloakUser> {
    const token = await this.getToken();

    // Idempotency: check if user exists
    const existing = await this.findUserByEmail(email);
    if (existing) return existing;

    const res = await this.fetchWithRetry(`${this.adminBase}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        enabled: true,
        emailVerified: false,
        groups: groupIds.map((gid) => `/org:${gid}`),
      }),
    });

    const location = res.headers.get('location') ?? '';
    const userId = location.split('/').pop() ?? '';

    // Send password reset email
    await this.sendPasswordResetEmail(userId).catch((err) =>
      this.logger.warn({ userId, err }, 'Failed to send password reset email')
    );

    this.logger.log(
      { email, userId },
      '[KeycloakAdminService] User created'
    );
    return { id: userId, email, firstName, lastName, enabled: true };
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.getToken();

    // Get realm role ID
    const roleRes = await this.fetchWithRetry(
      `${this.adminBase}/roles/${roleName}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const role = (await roleRes.json()) as { id: string; name: string };

    await this.fetchWithRetry(
      `${this.adminBase}/users/${userId}/role-mappings/realm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{ id: role.id, name: role.name }]),
      }
    );

    this.logger.log(
      { userId, roleName },
      '[KeycloakAdminService] Role assigned'
    );
  }

  async listGroupMembers(
    groupId: string,
    first = 0,
    max = 100
  ): Promise<KeycloakUser[]> {
    const token = await this.getToken();
    const res = await this.fetchWithRetry(
      `${this.adminBase}/groups/${groupId}/members?first=${first}&max=${max}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return (await res.json()) as KeycloakUser[];
  }

  async removeUserFromGroup(
    userId: string,
    groupId: string
  ): Promise<void> {
    const token = await this.getToken();
    await this.fetchWithRetry(
      `${this.adminBase}/users/${userId}/groups/${groupId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    this.logger.log(
      { userId, groupId },
      '[KeycloakAdminService] User removed from group'
    );
  }

  private async findGroupByName(
    name: string
  ): Promise<KeycloakGroup | null> {
    const token = await this.getToken();
    const res = await this.fetchWithRetry(
      `${this.adminBase}/groups?search=${encodeURIComponent(name)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const groups = (await res.json()) as KeycloakGroup[];
    return groups.find((g) => g.name === name) ?? null;
  }

  private async findUserByEmail(
    email: string
  ): Promise<KeycloakUser | null> {
    const token = await this.getToken();
    const res = await this.fetchWithRetry(
      `${this.adminBase}/users?email=${encodeURIComponent(email)}&exact=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const users = (await res.json()) as KeycloakUser[];
    return users[0] ?? null;
  }

  private async sendPasswordResetEmail(userId: string): Promise<void> {
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

  private async fetchWithRetry(
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
      if (attempt < MAX_RETRIES && !(err instanceof InternalServerErrorException)) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw err;
    }
  }
}
