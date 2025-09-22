# MuTraPro Kubernetes Manifests

## 📋 Tổng quan

Thư mục này chứa tất cả Kubernetes manifests để deploy hệ thống MuTraPro lên Kubernetes cluster.

## 🏗️ Cấu trúc thư mục

```
k8s/
├── namespace.yaml                    # Namespace definition
├── configmap.yaml                   # Configuration
├── secrets.yaml                     # Secrets
├── deployments/                     # Deployment manifests
│   ├── api-gateway-deployment.yaml
│   ├── auth-service-deployment.yaml
│   ├── user-service-deployment.yaml
│   ├── project-service-deployment.yaml
│   ├── payment-service-deployment.yaml
│   ├── notification-service-deployment.yaml
│   ├── file-service-deployment.yaml
│   ├── feedback-service-deployment.yaml
│   ├── quotation-service-deployment.yaml
│   ├── revision-service-deployment.yaml
│   ├── specialist-service-deployment.yaml
│   ├── studio-service-deployment.yaml
│   └── task-service-deployment.yaml
├── services/                        # Service manifests
│   ├── api-gateway.yaml
│   ├── auth-service.yaml
│   ├── user-service.yaml
│   ├── project-service.yaml
│   ├── payment-service.yaml
│   ├── notification-service.yaml
│   ├── file-service.yaml
│   ├── feedback-service.yaml
│   ├── quotation-service.yaml
│   ├── revision-service.yaml
│   ├── specialist-service.yaml
│   ├── studio-service.yaml
│   ├── task-service.yaml
│   ├── postgres.yaml
│   └── redis.yaml
└── ingress/
    └── mutrapro-ingress.yaml
```

## 🚀 Services Overview

| Service | Port | Replicas | Resource Requests | Resource Limits |
|---------|------|----------|-------------------|-----------------|
| API Gateway | 8080 | 2 | 512Mi/250m | 1Gi/500m |
| Auth Service | 8082 | 2 | 256Mi/250m | 512Mi/500m |
| User Service | 8081 | 2 | 256Mi/250m | 512Mi/500m |
| Project Service | 8083 | 2 | 256Mi/250m | 512Mi/500m |
| Payment Service | 8084 | 2 | 256Mi/250m | 512Mi/500m |
| Notification Service | 8085 | 2 | 256Mi/250m | 512Mi/500m |
| File Service | 8086 | 2 | 512Mi/250m | 1Gi/500m |
| Feedback Service | 8087 | 2 | 256Mi/250m | 512Mi/500m |
| Quotation Service | 8088 | 2 | 256Mi/250m | 512Mi/500m |
| Revision Service | 8089 | 2 | 256Mi/250m | 512Mi/500m |
| Specialist Service | 8090 | 2 | 256Mi/250m | 512Mi/500m |
| Studio Service | 8091 | 2 | 256Mi/250m | 512Mi/500m |
| Task Service | 8092 | 2 | 256Mi/250m | 512Mi/500m |

## 🔧 Configuration

### Database Per Service Pattern

Hệ thống sử dụng **Database Per Service** pattern, trong đó mỗi microservice có database riêng biệt:

| Service | Database | Username | Password |
|---------|----------|----------|----------|
| API Gateway | `gateway_db` | `gateway_service_user` | `gateway_service_password` |
| Auth Service | `auth_db` | `auth_service_user` | `auth_service_password` |
| User Service | `user_db` | `user_service_user` | `user_service_password` |
| Project Service | `project_db` | `project_service_user` | `project_service_password` |
| Payment Service | `payment_db` | `payment_service_user` | `payment_service_password` |
| Notification Service | `notification_db` | `notification_service_user` | `notification_service_password` |
| File Service | `file_db` | `file_service_user` | `file_service_password` |
| Feedback Service | `feedback_db` | `feedback_service_user` | `feedback_service_password` |
| Quotation Service | `quotation_db` | `quotation_service_user` | `quotation_service_password` |
| Revision Service | `revision_db` | `revision_service_user` | `revision_service_password` |
| Specialist Service | `specialist_db` | `specialist_service_user` | `specialist_service_password` |
| Studio Service | `studio_db` | `studio_service_user` | `studio_service_password` |
| Task Service | `task_db` | `task_service_user` | `task_service_password` |

### Environment Variables

Tất cả services sử dụng các environment variables từ ConfigMap và Secrets:

- `SPRING_PROFILES_ACTIVE=kubernetes`
- `SPRING_DATASOURCE_URL=jdbc:postgresql://postgres-service:5432/<service_db>`
- `SPRING_DATASOURCE_USERNAME=<service_user>`
- `SPRING_DATASOURCE_PASSWORD` (from secrets)
- `SPRING_REDIS_HOST=redis-service` (for auth, notification services)
- `SPRING_REDIS_PORT=6379`
- `JWT_SECRET` (from secrets, for auth service)
- `JWT_EXPIRATION=86400`
- `EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://eureka-service:8761/eureka`

### Health Checks

Mỗi service có 3 loại health checks:

1. **Startup Probe**: `/actuator/health`
   - Initial delay: 30s
   - Period: 10s
   - Timeout: 5s
   - Failure threshold: 30

2. **Liveness Probe**: `/actuator/health/liveness`
   - Initial delay: 60s
   - Period: 30s
   - Timeout: 10s
   - Failure threshold: 3

3. **Readiness Probe**: `/actuator/health/readiness`
   - Initial delay: 30s
   - Period: 10s
   - Timeout: 5s
   - Failure threshold: 3

## 🚀 Deployment Commands

### Deploy tất cả services

```bash
# Deploy to development
./scripts/deploy-to-k8s.sh development

# Deploy to production
./scripts/deploy-to-k8s.sh production
```

### Deploy từng phần

```bash
# 1. Create namespace and config
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 2. Deploy all services
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/

# 3. Check status
kubectl get pods -n mutrapro
kubectl get services -n mutrapro
kubectl get ingress -n mutrapro
```

### Deploy service riêng lẻ

```bash
# Deploy user-service
kubectl apply -f k8s/deployments/user-service-deployment.yaml
kubectl apply -f k8s/services/user-service.yaml

# Check status
kubectl get pods -n mutrapro -l app=user-service
```

## 📊 Monitoring Commands

### Check deployment status

```bash
# Check all pods
kubectl get pods -n mutrapro

# Check specific service
kubectl get pods -n mutrapro -l app=user-service

# Check services
kubectl get services -n mutrapro

# Check ingress
kubectl get ingress -n mutrapro
```

### View logs

```bash
# View logs for specific service
kubectl logs -f deployment/user-service -n mutrapro

# View logs for all pods of a service
kubectl logs -f -l app=user-service -n mutrapro

# View logs for specific pod
kubectl logs -f <pod-name> -n mutrapro
```

### Debug commands

```bash
# Describe pod for troubleshooting
kubectl describe pod <pod-name> -n mutrapro

# Execute commands in pod
kubectl exec -it <pod-name> -n mutrapro -- /bin/sh

# Port forward for testing
kubectl port-forward service/user-service 8081:8081 -n mutrapro
```

## 🔍 Troubleshooting

### Common Issues

1. **Pod not starting**
   ```bash
   kubectl describe pod <pod-name> -n mutrapro
   kubectl logs <pod-name> -n mutrapro
   ```

2. **Image pull errors**
   ```bash
   # Check if images exist
   docker pull your-registry.com/mutrapro/user-service:latest
   
   # Check image pull secrets
   kubectl get secrets -n mutrapro
   ```

3. **Database connection issues**
   ```bash
   # Check database service
   kubectl get services -n mutrapro | grep postgres
   
   # Test connectivity
   kubectl exec -it <pod-name> -n mutrapro -- nc -zv postgres-service 5432
   ```

4. **Service discovery issues**
   ```bash
   # Check DNS resolution
   kubectl exec -it <pod-name> -n mutrapro -- nslookup user-service
   
   # Check service endpoints
   kubectl get endpoints -n mutrapro
   ```

### Scaling Services

```bash
# Scale service manually
kubectl scale deployment user-service --replicas=3 -n mutrapro

# Check scaling status
kubectl get pods -n mutrapro -l app=user-service
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/user-service user-service=your-registry.com/mutrapro/user-service:v2.0.0 -n mutrapro

# Check rollout status
kubectl rollout status deployment/user-service -n mutrapro

# Rollback if needed
kubectl rollout undo deployment/user-service -n mutrapro
```

## 📝 Notes

1. **Resource Limits**: File service có resource limits cao hơn do xử lý files
2. **Health Checks**: Tất cả services sử dụng Spring Boot Actuator health endpoints
3. **Service Discovery**: Services sử dụng Kubernetes DNS để discover nhau
4. **External Access**: Chỉ API Gateway có LoadBalancer service type
5. **Ingress**: Tất cả external traffic đi qua Ingress controller

## 🔐 Security Considerations

1. **Secrets**: Update secrets.yaml với production values
2. **Network Policies**: Implement network policies cho service isolation
3. **RBAC**: Configure proper role-based access control
4. **TLS**: Enable TLS cho external communication
5. **Image Security**: Scan images for vulnerabilities

## 📞 Support

Để được hỗ trợ về Kubernetes deployment:
- Documentation: [Link to docs]
- Issues: [Link to GitHub issues]
- Email: support@mutrapro.com
