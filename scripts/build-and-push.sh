#!/bin/bash

# Build and Push Docker Images for MuTraPro System
# Usage: ./scripts/build-and-push.sh [registry-url] [tag]

set -e

echo "🚀 Building and pushing MuTraPro Docker images..."
echo "Docker Hub Username: $DOCKER_HUB_USERNAME"
echo "Tag: $TAG"
echo ""

# Load .env file nếu có
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Docker Hub username (từ .env hoặc default)
DOCKER_HUB_USERNAME=${DOCKER_HUB_USERNAME:-mutrapro}
TAG=${TAG:-latest}

# List of services
SERVICES=(
    "api-gateway"
    "identity-service"
    "project-service"
    "billing-service"
    "request-service"
    "notification-service"
    "specialist-service"
    "studio-service"
    "chat-service"
)

# Function to build and push a service
build_and_push_service() {
    local service=$1
    local image_name="${DOCKER_HUB_USERNAME}/${service}:${TAG}"
    
    echo "========================================"
    echo "Building $service..."
    echo "========================================"
    
    # Build the Docker image
    docker build -f "backend/${service}/Dockerfile" \
        -t "$image_name" \
        --build-arg BUILDKIT_INLINE_CACHE=1 \
        ./backend
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully built $service"
        
        # Push the image
        echo "📤 Pushing $service..."
        docker push "$image_name"
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully pushed $service"
        else
            echo "❌ Failed to push $service"
            exit 1
        fi
    else
        echo "❌ Failed to build $service"
        exit 1
    fi
    
    echo ""
}

# Kiểm tra đã login Docker Hub chưa
if ! docker info | grep -q "Username"; then
    echo "⚠️  Chưa đăng nhập Docker Hub"
    echo "Chạy: docker login"
    exit 1
fi

# Build and push each service
echo "Sẽ build và push ${#SERVICES[@]} services..."
echo ""

for service in "${SERVICES[@]}"; do
    build_and_push_service "$service"
done

echo "========================================"
echo "✅ Hoàn thành!"
echo "========================================"
echo ""
echo "Images đã được push lên Docker Hub:"
for service in "${SERVICES[@]}"; do
    echo "  - ${DOCKER_HUB_USERNAME}/${service}:${TAG}"
done
echo ""
echo "Trên EC2, chạy:"
echo "  docker-compose -f docker-compose.prod.hub.yml pull"
echo "  docker-compose -f docker-compose.prod.hub.yml up -d"
