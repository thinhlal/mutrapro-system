#!/bin/bash

# Script để cập nhật tất cả deployment manifests cho database per service pattern

set -e

echo "🔄 Updating deployment manifests for database per service pattern..."

# Function to update deployment file
update_deployment() {
    local service_name=$1
    local deployment_file="k8s/deployments/${service_name}-deployment.yaml"
    
    if [ -f "$deployment_file" ]; then
        echo "📝 Updating $deployment_file..."
        
        # Update database configuration
        sed -i "s/SPRING_DATASOURCE_URL/$(echo ${service_name^^})_DATASOURCE_URL/g" "$deployment_file"
        sed -i "s/SPRING_DATASOURCE_USERNAME/$(echo ${service_name^^})_DATASOURCE_USERNAME/g" "$deployment_file"
        sed -i "s/SPRING_DATASOURCE_PASSWORD/$(echo ${service_name^^})_DATASOURCE_PASSWORD/g" "$deployment_file"
        
        echo "✅ Updated $deployment_file"
    else
        echo "⚠️  File $deployment_file not found"
    fi
}

# List of services to update
SERVICES=(
    "api-gateway"
    "payment-service"
    "notification-service"
    "file-service"
    "feedback-service"
    "quotation-service"
    "revision-service"
    "specialist-service"
    "task-service"
)

# Update each service deployment
for service in "${SERVICES[@]}"; do
    update_deployment "$service"
done

echo "🎉 All deployment manifests updated successfully!"
echo ""
echo "Updated services:"
for service in "${SERVICES[@]}"; do
    echo "  - $service"
done
