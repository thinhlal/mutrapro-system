# MuTraPro System - Docker & Kubernetes Deployment Guide

## 📋 Tổng quan

Hướng dẫn này mô tả cách build Docker images và deploy hệ thống MuTraPro lên Kubernetes.

## 🐳 Docker Setup

### 1. Dockerfile Structure

Mỗi service có Dockerfile riêng với multi-stage build:

```
backend/
├── api-gateway/Dockerfile
├── auth-service/Dockerfile
├── user-service/Dockerfile
├── project-service/Dockerfile
├── payment-service/Dockerfile
├── notification-service/Dockerfile
├── file-service/Dockerfile
├── feedback-service/Dockerfile
├── quotation-service/Dockerfile
├── revision-service/Dockerfile
├── specialist-service/Dockerfile
├── studio-service/Dockerfile
├── task-service/Dockerfile
└── shared/Dockerfile
```

### 2. Build Docker Images

#### Build từng service riêng lẻ:
```bash
# Build user-service
docker build -f backend/user-service/Dockerfile -t mutrapro/user-service:latest backend/

# Build auth-service
docker build -f backend/auth-service/Dockerfile -t mutrapro/auth-service:latest backend/

# Build tất cả services
./scripts/build-and-push.sh your-registry.com/mutrapro latest
```

#### Build với Docker Compose:
```bash
# Build tất cả services
docker-compose build

# Build và chạy
docker-compose up --build
```

### 3. Port Mapping

| Service | Container Port | Host Port |
|---------|----------------|-----------|
| API Gateway | 8080 | 8080 |
| Auth Service | 8082 | 8082 |
| User Service | 8081 | 8081 |
| Project Service | 8083 | 8083 |
| Payment Service | 8084 | 8084 |
| Notification Service | 8085 | 8085 |
| File Service | 8086 | 8086 |
| Feedback Service | 8087 | 8087 |
| Quotation Service | 8088 | 8088 |
| Revision Service | 8089 | 8089 |
| Specialist Service | 8090 | 8090 |
| Studio Service | 8091 | 8091 |
| Task Service | 8092 | 8092 |

## ☸️ Kubernetes Setup

### 1. Prerequisites

- Kubernetes cluster (minikube, GKE, EKS, AKS, etc.)
- kubectl configured
- Docker images pushed to registry

### 2. Deploy to Kubernetes

```bash
# Deploy to development environment
./scripts/deploy-to-k8s.sh development

# Deploy to production environment
./scripts/deploy-to-k8s.sh production
```

### 3. Manual Deployment

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# Deploy services
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/
```

### 4. Kubernetes Manifests Structure

```
k8s/
├── namespace.yaml                    # Namespace definition
├── configmap.yaml                   # Configuration
├── secrets.yaml                     # Secrets
├── deployments/
│   ├── api-gateway-deployment.yaml
│   ├── auth-service-deployment.yaml
│   └── user-service-deployment.yaml
├── services/
│   ├── api-gateway.yaml
│   ├── auth-service.yaml
│   ├── user-service.yaml
│   ├── postgres.yaml
│   └── redis.yaml
└── ingress/
    └── mutrapro-ingress.yaml
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| SPRING_PROFILES_ACTIVE | Spring profile | kubernetes |
| SPRING_DATASOURCE_URL | Database URL | jdbc:postgresql://postgres-service:5432/mutrapro |
| SPRING_DATASOURCE_USERNAME | Database username | mutrapro_user |
| SPRING_DATASOURCE_PASSWORD | Database password | From secrets |
| SPRING_REDIS_HOST | Redis host | redis-service |
| SPRING_REDIS_PORT | Redis port | 6379 |
| JWT_SECRET | JWT secret key | From secrets |
| JWT_EXPIRATION | JWT expiration time | 86400 |

### Secrets Management

Update secrets in `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mutrapro-secrets
  namespace: mutrapro
type: Opaque
data:
  # Base64 encoded values
  SPRING_DATASOURCE_PASSWORD: <base64-encoded-password>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and Push Docker Images
      run: ./scripts/build-and-push.sh ${{ secrets.REGISTRY_URL }} ${{ github.sha }}
    
    - name: Deploy to Kubernetes
      run: ./scripts/deploy-to-k8s.sh production
```

### GitLab CI Example

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - ./scripts/build-and-push.sh $CI_REGISTRY/mutrapro $CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  script:
    - ./scripts/deploy-to-k8s.sh production
  only:
    - main
```

## 📊 Monitoring & Health Checks

### Health Check Endpoints

Mỗi service có các health check endpoints:

- `/actuator/health` - Overall health
- `/actuator/health/liveness` - Liveness probe
- `/actuator/health/readiness` - Readiness probe

### Monitoring Commands

```bash
# Check pod status
kubectl get pods -n mutrapro

# Check service status
kubectl get services -n mutrapro

# Check ingress status
kubectl get ingress -n mutrapro

# View logs
kubectl logs -f deployment/user-service -n mutrapro

# Port forward for testing
kubectl port-forward service/api-gateway 8080:8080 -n mutrapro
```

## 🔍 Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check if images exist in registry
   docker pull your-registry.com/mutrapro/user-service:latest
   ```

2. **Pod Startup Issues**
   ```bash
   # Check pod events
   kubectl describe pod <pod-name> -n mutrapro
   
   # Check logs
   kubectl logs <pod-name> -n mutrapro
   ```

3. **Database Connection Issues**
   ```bash
   # Check if database service is running
   kubectl get pods -n mutrapro | grep postgres
   
   # Check database connectivity
   kubectl exec -it <pod-name> -n mutrapro -- nc -zv postgres-service 5432
   ```

4. **Ingress Issues**
   ```bash
   # Check ingress controller
   kubectl get pods -n ingress-nginx
   
   # Check ingress status
   kubectl describe ingress mutrapro-ingress -n mutrapro
   ```

## 📝 Production Considerations

### Security

1. **Update Secrets**: Change default passwords and JWT secrets
2. **Network Policies**: Implement network policies for service isolation
3. **RBAC**: Configure proper role-based access control
4. **TLS**: Enable TLS for external communication

### Scaling

1. **Horizontal Pod Autoscaler (HPA)**:
   ```yaml
   apiVersion: autoscaling/v2
   kind: HorizontalPodAutoscaler
   metadata:
     name: user-service-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: user-service
     minReplicas: 2
     maxReplicas: 10
     metrics:
     - type: Resource
       resource:
         name: cpu
         target:
           type: Utilization
           averageUtilization: 70
   ```

2. **Resource Limits**: Adjust CPU and memory limits based on load

### Backup & Recovery

1. **Database Backups**: Implement regular PostgreSQL backups
2. **ConfigMaps/Secrets**: Version control configuration changes
3. **Persistent Volumes**: Backup persistent data

## 📞 Support

Để được hỗ trợ, vui lòng liên hệ:
- Email: support@mutrapro.com
- Documentation: [Link to docs]
- Issues: [Link to GitHub issues]
