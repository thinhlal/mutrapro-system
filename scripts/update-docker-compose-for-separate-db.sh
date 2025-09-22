#!/bin/bash

# Script để cập nhật docker-compose.yml cho database per service pattern

set -e

echo "🔄 Updating docker-compose.yml for database per service pattern..."

# Function to update service database configuration
update_service_db_config() {
    local service_name=$1
    local db_name=$2
    local username=$3
    local password=$4
    
    echo "📝 Updating $service_name database configuration..."
    
    # Update database URL
    sed -i "s|SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/[^[:space:]]*|SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/$db_name|g" docker-compose.yml
    
    # Update username
    sed -i "s|SPRING_DATASOURCE_USERNAME=[^[:space:]]*|SPRING_DATASOURCE_USERNAME=$username|g" docker-compose.yml
    
    # Update password
    sed -i "s|SPRING_DATASOURCE_PASSWORD=[^[:space:]]*|SPRING_DATASOURCE_PASSWORD=$password|g" docker-compose.yml
}

# Services and their database configurations
declare -A SERVICES=(
    ["project-service"]="project_db:project_service_user:project_service_password"
    ["payment-service"]="payment_db:payment_service_user:payment_service_password"
    ["notification-service"]="notification_db:notification_service_user:notification_service_password"
    ["file-service"]="file_db:file_service_user:file_service_password"
    ["feedback-service"]="feedback_db:feedback_service_user:feedback_service_password"
    ["quotation-service"]="quotation_db:quotation_service_user:quotation_service_password"
    ["revision-service"]="revision_db:revision_service_user:revision_service_password"
    ["specialist-service"]="specialist_db:specialist_service_user:specialist_service_password"
    ["studio-service"]="studio_db:studio_service_user:studio_service_password"
    ["task-service"]="task_db:task_service_user:task_service_password"
)

# Update each service
for service in "${!SERVICES[@]}"; do
    IFS=':' read -r db_name username password <<< "${SERVICES[$service]}"
    update_service_db_config "$service" "$db_name" "$username" "$password"
done

echo "🎉 docker-compose.yml updated successfully!"
echo ""
echo "Updated services:"
for service in "${!SERVICES[@]}"; do
    echo "  - $service"
done
echo ""
echo "Note: Each service now has its own database and credentials."
