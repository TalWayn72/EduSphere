#!/usr/bin/env bash
# Run EduSphere All-in-One Container

set -e

echo "🚀 Starting EduSphere..."
docker compose up -d

echo "⏳ Waiting for services..."
sleep 10

for i in {1..60}; do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
        echo ""
        echo "✅ EduSphere is running!"
        echo "   GraphQL Gateway: http://localhost:4000/graphql"
        echo "   Keycloak: http://localhost:8080 (admin/admin)"
        exit 0
    fi
    sleep 2
done

echo "❌ Timeout - check logs: docker-compose logs -f"
exit 1
