#!/usr/bin/env bash
# Build EduSphere All-in-One Docker Image

set -e

echo "════════════════════════════════════════════════════════════"
echo "🐳 Building EduSphere All-in-One Docker Image"
echo "════════════════════════════════════════════════════════════"

docker build -t edusphere:latest -f Dockerfile .

echo ""
echo "✅ Build complete! Image: edusphere:latest"
echo ""
echo "🚀 To run: docker-compose up -d"
echo "🔍 Check status: curl http://localhost:4000/health"
