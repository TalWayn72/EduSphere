#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# EduSphere E2E Test Script
# Tests all 6 subgraphs + gateway integration
# ═══════════════════════════════════════════════════════════════

set -e

echo "🧪 EduSphere E2E Testing"
echo "════════════════════════════════════════════════════════════"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
CORE_URL="${CORE_URL:-http://localhost:4001}"
CONTENT_URL="${CONTENT_URL:-http://localhost:4002}"
ANNOTATION_URL="${ANNOTATION_URL:-http://localhost:4003}"
COLLABORATION_URL="${COLLABORATION_URL:-http://localhost:4004}"
AGENT_URL="${AGENT_URL:-http://localhost:4005}"
KNOWLEDGE_URL="${KNOWLEDGE_URL:-http://localhost:4006}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local query=$3

    echo -n "Testing $name... "

    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}" \
        "$url/graphql" 2>&1)

    if echo "$response" | grep -q '"data"'; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Wait for services
echo "⏳ Waiting for services to be ready..."
for i in {1..30}; do
    if curl -s "$GATEWAY_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Gateway is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Gateway failed to start${NC}"
        exit 1
    fi
    sleep 2
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Running Tests"
echo "════════════════════════════════════════════════════════════"
echo ""

# Test Gateway
echo "📡 Gateway Tests"
test_endpoint "Gateway Health" "$GATEWAY_URL" "{ _health }"
echo ""

# Test Core Subgraph
echo "👤 Core Subgraph Tests (Port 4001)"
test_endpoint "Users Query" "$CORE_URL" "{ users(limit: 1) { id email } }"
echo ""

# Test Content Subgraph
echo "📚 Content Subgraph Tests (Port 4002)"
test_endpoint "Courses Query" "$CONTENT_URL" "{ courses(limit: 1) { id title } }"
echo ""

# Test Annotation Subgraph
echo "📝 Annotation Subgraph Tests (Port 4003)"
test_endpoint "Annotations Query" "$ANNOTATION_URL" "{ annotations(userId: \\\"test\\\", limit: 1) { id type } }"
echo ""

# Test Collaboration Subgraph
echo "💬 Collaboration Subgraph Tests (Port 4004)"
test_endpoint "Discussions Query" "$COLLABORATION_URL" "{ discussions(courseId: \\\"test\\\", limit: 1) { id title } }"
echo ""

# Test Agent Subgraph
echo "🤖 Agent Subgraph Tests (Port 4005)"
test_endpoint "Agent Sessions Query" "$AGENT_URL" "{ agentSessions(userId: \\\"test\\\", limit: 1) { id agentType } }"
echo ""

# Test Knowledge Subgraph
echo "🧠 Knowledge Subgraph Tests (Port 4006)"
test_endpoint "Embeddings Query" "$KNOWLEDGE_URL" "{ embeddings(sourceId: \\\"test\\\", limit: 1) { id content } }"
echo ""

# Test Federation
echo "🔗 Federation Tests"
test_endpoint "Cross-Subgraph Query" "$GATEWAY_URL" "{ me { id email } }"
echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "Test Summary"
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
