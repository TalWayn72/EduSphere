#!/bin/bash
# Generate CycloneDX Software Bill of Materials (SBOM)
# Used for SOC2/SLSA/ISO 27001 compliance
# Run: ./scripts/generate-sbom.sh

set -euo pipefail

SBOM_DIR="${SBOM_DIR:-./sbom}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SBOM_FILE="${SBOM_DIR}/sbom-${TIMESTAMP}.json"
LATEST_FILE="${SBOM_DIR}/sbom-latest.json"

echo "Generating CycloneDX SBOM..."
mkdir -p "${SBOM_DIR}"

# Install @cyclonedx/bom if not present
if ! command -v cyclonedx-bom &> /dev/null; then
  echo "Installing @cyclonedx/bom..."
  npm install -g @cyclonedx/bom
fi

# Generate SBOM for the monorepo
cyclonedx-bom \
  --output "${SBOM_FILE}" \
  --type library \
  --namespace "com.edusphere" \
  .

# Create symlink to latest
cp "${SBOM_FILE}" "${LATEST_FILE}"

echo "SBOM generated: ${SBOM_FILE}"
echo "Component count: $(cat "${SBOM_FILE}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('components', [])))")"
