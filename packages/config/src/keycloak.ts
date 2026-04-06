export const keycloakConfig = {
  url: process.env['KEYCLOAK_URL'] ?? 'http://localhost:8080',
  realm: process.env['KEYCLOAK_REALM'] ?? 'edusphere',
  clientId: process.env['KEYCLOAK_CLIENT_ID'] ?? 'edusphere-web',
  // KEYCLOAK_ISSUER_URL allows the issuer in tokens (e.g. http://localhost:8080)
  // to differ from KEYCLOAK_URL used for internal JWKS fetching
  // (e.g. http://keycloak:8080 in Docker networking).
  // When not set, falls back to KEYCLOAK_URL so single-host setups work unchanged.
  issuerUrl:
    process.env['KEYCLOAK_ISSUER_URL'] ??
    process.env['KEYCLOAK_URL'] ??
    'http://localhost:8080',
  get jwksUrl(): string {
    return `${this.url}/realms/${this.realm}/protocol/openid-connect/certs`;
  },
  get issuer(): string {
    return `${this.issuerUrl}/realms/${this.realm}`;
  },
};
