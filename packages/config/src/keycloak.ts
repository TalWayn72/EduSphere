export const keycloakConfig = {
  url: process.env['KEYCLOAK_URL'] ?? 'http://localhost:8080',
  realm: process.env['KEYCLOAK_REALM'] ?? 'edusphere',
  clientId: process.env['KEYCLOAK_CLIENT_ID'] ?? 'edusphere-app',
  get jwksUrl(): string {
    return `${this.url}/realms/${this.realm}/protocol/openid-connect/certs`;
  },
  get issuer(): string {
    return `${this.url}/realms/${this.realm}`;
  },
} as const;
