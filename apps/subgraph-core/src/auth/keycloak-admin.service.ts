/**
 * KeycloakAdminService — User and group management via Keycloak Admin REST API.
 * HTTP client, retry logic, and helpers extracted to KeycloakAdminHttpService.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  KeycloakAdminHttpService,
  type KeycloakGroup,
  type KeycloakUser,
} from './keycloak-admin-http.service';

export type { KeycloakGroup, KeycloakUser };

@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);

  constructor(private readonly http: KeycloakAdminHttpService) {}

  async createGroup(slug: string): Promise<KeycloakGroup> {
    const groupName = `org:${slug}`;
    const existing = await this.http.findGroupByName(groupName);
    if (existing) return existing;

    const token = await this.http.getToken();
    const res = await this.http.fetchWithRetry(
      `${this.http.adminBase}/groups`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: groupName }),
      }
    );

    const location = res.headers.get('location') ?? '';
    const groupId = location.split('/').pop() ?? '';

    this.logger.log(
      { slug, groupId },
      '[KeycloakAdminService] Group created'
    );
    return { id: groupId, name: groupName };
  }

  async deleteGroup(groupId: string): Promise<void> {
    const token = await this.http.getToken();
    await this.http.fetchWithRetry(
      `${this.http.adminBase}/groups/${groupId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    this.logger.log({ groupId }, '[KeycloakAdminService] Group deleted');
  }

  async createUser(
    email: string,
    firstName: string,
    lastName: string,
    groupIds: string[]
  ): Promise<KeycloakUser> {
    const existing = await this.http.findUserByEmail(email);
    if (existing) return existing;

    const token = await this.http.getToken();
    const res = await this.http.fetchWithRetry(
      `${this.http.adminBase}/users`,
      {
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
      }
    );

    const location = res.headers.get('location') ?? '';
    const userId = location.split('/').pop() ?? '';

    await this.http.sendPasswordResetEmail(userId).catch((err) =>
      this.logger.warn({ userId, err }, 'Failed to send password reset email')
    );

    this.logger.log(
      { email, userId },
      '[KeycloakAdminService] User created'
    );
    return { id: userId, email, firstName, lastName, enabled: true };
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const token = await this.http.getToken();

    const roleRes = await this.http.fetchWithRetry(
      `${this.http.adminBase}/roles/${roleName}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const role = (await roleRes.json()) as { id: string; name: string };

    await this.http.fetchWithRetry(
      `${this.http.adminBase}/users/${userId}/role-mappings/realm`,
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
    const token = await this.http.getToken();
    const res = await this.http.fetchWithRetry(
      `${this.http.adminBase}/groups/${groupId}/members?first=${first}&max=${max}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return (await res.json()) as KeycloakUser[];
  }

  async removeUserFromGroup(
    userId: string,
    groupId: string
  ): Promise<void> {
    const token = await this.http.getToken();
    await this.http.fetchWithRetry(
      `${this.http.adminBase}/users/${userId}/groups/${groupId}`,
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
}
