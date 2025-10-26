#!/bin/bash

# Deploy MuTraPro System to Kubernetes
# Usage: ./scripts/deploy-to-k8s.sh [environment]

set -e

ENVIRONMENT=${1:-"development"}
NAMESPACE="mutrapro"

echo "🚀 Deploying MuTraPro System to Kubernetes..."
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if kubectl can connect to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "Please ensure kubectl is configured correctly"
    exit 1
fi

echo "✅ Kubernetes cluster connection verified"

# Apply manifests in order
echo "📋 Applying Kubernetes manifests..."

# 1. Create namespace
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# 2. Apply ConfigMap and Secrets
echo "Applying configuration..."
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Deploy databases first
echo "Deploying databases..."
# Note: You'll need to create PostgreSQL and Redis deployments
# For now, assuming they're already running or using external services

# 4. Deploy services
echo "Deploying microservices..."

# Deploy all microservices
echo "Deploying all microservices..."
kubectl apply -f k8s/deployments/

# Wait for core services to be ready first
echo "⏳ Waiting for core services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/identity-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n $NAMESPACE

# Wait for other services to be ready
echo "⏳ Waiting for other services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/project-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/billing-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/request-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/notification-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/specialist-service -n $NAMESPACE
kubectl wait --for=condition=available --timeout=300s deployment/studio-service -n $NAMESPACE

# 5. Apply services
echo "Applying Kubernetes services..."
kubectl apply -f k8s/services/

# 6. Apply ingress
echo "Applying ingress..."
kubectl apply -f k8s/ingress/mutrapro-ingress.yaml

# 7. Show deployment status
echo "📊 Deployment Status:"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "To check the status of your deployment:"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl get services -n $NAMESPACE"
echo "  kubectl get ingress -n $NAMESPACE"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/identity-service -n $NAMESPACE"
echo "  kubectl logs -f deployment/api-gateway -n $NAMESPACE"
echo ""
echo "To access the API Gateway:"
echo "  kubectl port-forward service/api-gateway 8080:8080 -n $NAMESPACE"
echo "  Then visit: http://localhost:8080"
