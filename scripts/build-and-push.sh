#!/bin/bash

# Build and Push Docker Images for MuTraPro System
# Usage: ./scripts/build-and-push.sh [registry-url] [tag]

set -e

# Default values
REGISTRY_URL=${1:-"your-registry.com/mutrapro"}
TAG=${2:-"latest"}
BUILD_CONTEXT=${3:-"backend"}

echo "🚀 Building and pushing MuTraPro Docker images..."
echo "Registry: $REGISTRY_URL"
echo "Tag: $TAG"
echo "Build Context: $BUILD_CONTEXT"

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
)

# Function to build and push a service
build_and_push_service() {
    local service=$1
    local image_name="$REGISTRY_URL/$service:$TAG"
    
    echo "📦 Building $service..."
    
    # Build the Docker image
    docker build -f "$BUILD_CONTEXT/$service/Dockerfile" \
        -t "$image_name" \
        "$BUILD_CONTEXT"
    
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
}

# Build shared module first (if needed)
echo "📦 Building shared module..."
docker build -f "$BUILD_CONTEXT/shared/Dockerfile" \
    -t "$REGISTRY_URL/shared:$TAG" \
    "$BUILD_CONTEXT/shared"

# Build and push each service
for service in "${SERVICES[@]}"; do
    build_and_push_service "$service"
done

echo "🎉 All images built and pushed successfully!"
echo ""
echo "Images pushed:"
for service in "${SERVICES[@]}"; do
    echo "  - $REGISTRY_URL/$service:$TAG"
done
echo "  - $REGISTRY_URL/shared:$TAG"
