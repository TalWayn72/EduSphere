#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# EduSphere MCP API Keys Setup
# ═══════════════════════════════════════════════════════════════
# Run this script to configure your personal API keys in .mcp.json
# Usage: bash scripts/setup-mcp-keys.sh

set -euo pipefail

MCP_FILE="$(dirname "$0")/../.mcp.json"

echo "════════════════════════════════════════"
echo " EduSphere MCP Keys Setup"
echo "════════════════════════════════════════"
echo ""

# ── GitHub PAT ──────────────────────────────────────────────────
echo "1. GitHub Personal Access Token"
echo "   Get it at: https://github.com/settings/tokens"
echo "   Required scopes: repo, workflow, read:org"
echo ""
read -rp "   Paste your GitHub PAT (or press Enter to skip): " GITHUB_PAT

if [[ -n "$GITHUB_PAT" ]]; then
  # Use node for cross-platform JSON editing
  node -e "
    const fs = require('fs');
    const mcp = JSON.parse(fs.readFileSync('$MCP_FILE', 'utf8'));
    mcp.mcpServers.github.env.GITHUB_PERSONAL_ACCESS_TOKEN = '$GITHUB_PAT';
    fs.writeFileSync('$MCP_FILE', JSON.stringify(mcp, null, 2) + '\n');
    console.log('   ✅ GitHub PAT saved.');
  "
else
  echo "   ⏭  Skipped."
fi

echo ""

# ── Tavily API Key ───────────────────────────────────────────────
echo "2. Tavily API Key"
echo "   Get it at: https://tavily.com (free tier: 1000 searches/month)"
echo ""
read -rp "   Paste your Tavily API Key (or press Enter to skip): " TAVILY_KEY

if [[ -n "$TAVILY_KEY" ]]; then
  node -e "
    const fs = require('fs');
    const mcp = JSON.parse(fs.readFileSync('$MCP_FILE', 'utf8'));
    mcp.mcpServers.tavily.env.TAVILY_API_KEY = '$TAVILY_KEY';
    fs.writeFileSync('$MCP_FILE', JSON.stringify(mcp, null, 2) + '\n');
    console.log('   ✅ Tavily API Key saved.');
  "
else
  echo "   ⏭  Skipped."
fi

echo ""
echo "════════════════════════════════════════"
echo " Done! Restart Claude Code to apply:"
echo " VS Code → Ctrl+Shift+P → Claude: Restart MCP Servers"
echo "════════════════════════════════════════"
