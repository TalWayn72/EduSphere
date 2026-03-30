#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# EduSphere — Self-Signed mTLS Certificate Generator (dev/staging)
#
# Generates a private CA and per-service certificates for inter-service mTLS.
# For production, use Linkerd service mesh (zero-config mTLS) instead.
#
# Usage: ./generate-certs.sh [output-dir]
#   output-dir defaults to ./certs/
#
# Security Invariant: SI-6 — Inter-service HTTP must use mTLS in staging/prod.
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

CERT_DIR="${1:-$(dirname "$0")/certs}"
DAYS_CA=3650       # CA valid for 10 years
DAYS_CERT=365      # Service certs valid for 1 year
KEY_SIZE=4096      # RSA key size for CA
EC_CURVE="prime256v1"  # ECDSA curve for service certs (faster TLS handshake)

# All services that need certificates
SERVICES=(
  "gateway"
  "subgraph-core"
  "subgraph-content"
  "subgraph-annotation"
  "subgraph-collaboration"
  "subgraph-agent"
  "subgraph-knowledge"
)

echo "═══════════════════════════════════════════════════════════════"
echo " EduSphere mTLS Certificate Generator"
echo "═══════════════════════════════════════════════════════════════"
echo ""

mkdir -p "${CERT_DIR}"

# ── Step 1: Generate CA ──────────────────────────────────────────────────────
CA_KEY="${CERT_DIR}/ca.key"
CA_CERT="${CERT_DIR}/ca.crt"

if [[ -f "${CA_CERT}" && -f "${CA_KEY}" ]]; then
  echo "[SKIP] CA already exists at ${CA_CERT}"
else
  echo "[GEN]  Creating Certificate Authority..."
  openssl genrsa -out "${CA_KEY}" "${KEY_SIZE}" 2>/dev/null
  openssl req -new -x509 \
    -key "${CA_KEY}" \
    -out "${CA_CERT}" \
    -days "${DAYS_CA}" \
    -subj "/C=IL/ST=Tel-Aviv/O=EduSphere/OU=Infrastructure/CN=EduSphere Dev CA" \
    2>/dev/null
  echo "       CA cert:  ${CA_CERT}"
  echo "       CA key:   ${CA_KEY}"
fi

# ── Step 2: Generate per-service certificates ────────────────────────────────
for SVC in "${SERVICES[@]}"; do
  SVC_DIR="${CERT_DIR}/${SVC}"
  SVC_KEY="${SVC_DIR}/tls.key"
  SVC_CSR="${SVC_DIR}/tls.csr"
  SVC_CERT="${SVC_DIR}/tls.crt"
  SVC_EXT="${SVC_DIR}/ext.cnf"

  if [[ -f "${SVC_CERT}" && -f "${SVC_KEY}" ]]; then
    echo "[SKIP] ${SVC} certificate already exists"
    continue
  fi

  echo "[GEN]  Generating certificate for ${SVC}..."
  mkdir -p "${SVC_DIR}"

  # Create SAN extension config (DNS names the service is reachable at)
  cat > "${SVC_EXT}" <<EOF
[req]
distinguished_name = req_dn
[req_dn]
[v3_ext]
subjectAltName = @alt_names
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
[alt_names]
DNS.1 = ${SVC}
DNS.2 = ${SVC}.edusphere.svc.cluster.local
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

  # Generate ECDSA key (faster than RSA for service-to-service)
  openssl ecparam -genkey -name "${EC_CURVE}" -out "${SVC_KEY}" 2>/dev/null

  # Generate CSR
  openssl req -new \
    -key "${SVC_KEY}" \
    -out "${SVC_CSR}" \
    -subj "/C=IL/ST=Tel-Aviv/O=EduSphere/OU=${SVC}/CN=${SVC}" \
    2>/dev/null

  # Sign with CA
  openssl x509 -req \
    -in "${SVC_CSR}" \
    -CA "${CA_CERT}" \
    -CAkey "${CA_KEY}" \
    -CAcreateserial \
    -out "${SVC_CERT}" \
    -days "${DAYS_CERT}" \
    -extfile "${SVC_EXT}" \
    -extensions v3_ext \
    2>/dev/null

  # Clean up CSR and extension config (not needed at runtime)
  rm -f "${SVC_CSR}" "${SVC_EXT}"

  echo "       cert: ${SVC_CERT}"
  echo "       key:  ${SVC_KEY}"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " All certificates generated in ${CERT_DIR}/"
echo ""
echo " Structure:"
echo "   ${CERT_DIR}/ca.crt              — CA certificate (mount into all containers)"
echo "   ${CERT_DIR}/<service>/tls.crt   — Service certificate"
echo "   ${CERT_DIR}/<service>/tls.key   — Service private key"
echo ""
echo " Verify a certificate:"
echo "   openssl x509 -in ${CERT_DIR}/gateway/tls.crt -text -noout"
echo ""
echo " Verify mTLS handshake:"
echo "   openssl s_client -connect localhost:4001 \\"
echo "     -cert ${CERT_DIR}/gateway/tls.crt \\"
echo "     -key ${CERT_DIR}/gateway/tls.key \\"
echo "     -CAfile ${CERT_DIR}/ca.crt"
echo "═══════════════════════════════════════════════════════════════"
