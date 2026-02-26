import {
  nkeyAuthenticator,
  type ConnectionOptions,
  type TlsOptions,
} from 'nats';

/**
 * Builds NATS ConnectionOptions from environment variables.
 *
 * SI-7: TLS is activated when NATS_TLS_CERT + NATS_TLS_KEY + NATS_TLS_CA
 * are all set. In development (env vars absent) the client connects
 * without TLS so that docker-compose setups work without certificates.
 *
 * NKey authentication is activated when NATS_NKEY is set.
 */
export function buildNatsOptions(): ConnectionOptions {
  const options: ConnectionOptions = {
    servers: process.env['NATS_URL'] ?? 'nats://localhost:4222',
  };

  // SI-7: Use TLS when certificate files are provided via environment
  const certFile = process.env['NATS_TLS_CERT'];
  const keyFile = process.env['NATS_TLS_KEY'];
  const caFile = process.env['NATS_TLS_CA'];

  if (certFile && keyFile && caFile) {
    const tls: TlsOptions = {
      certFile,
      keyFile,
      caFile,
    };
    options.tls = tls;
  }

  // NKey authentication when provided
  const nkey = process.env['NATS_NKEY'];
  if (nkey) {
    options.authenticator = nkeyAuthenticator(new TextEncoder().encode(nkey));
  }

  return options;
}
