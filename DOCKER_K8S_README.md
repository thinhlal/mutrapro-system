# MuTraPro System - Docker & Kubernetes Deployment Guide

## 📋 Tổng quan

Hướng dẫn này mô tả cách build Docker images và deploy hệ thống MuTraPro lên Kubernetes.

## 🐳 Docker Setup

### 1. Dockerfile Structure

Mỗi service có Dockerfile riêng với multi-stage build:

```
backend/
├── api-gateway/Dockerfile
├── identity-service/Dockerfile       # Merged from auth-service + user-service
├── project-service/Dockerfile
├── billing-service/Dockerfile
├── request-service/Dockerfile
├── notification-service/Dockerfile
├── specialist-service/Dockerfile
└── shared/Dockerfile
```

### 2. Build Docker Images

#### Build từng service riêng lẻ:
```bash
# Build identity-service
docker build -f backend/identity-service/Dockerfile -t mutrapro/identity-service:latest backend/

# Build project-service
docker build -f backend/project-service/Dockerfile -t mutrapro/project-service:latest backend/

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

| Service | Container Port | Docker Host Port | K8s Service Port | K8s Target Port |
|---------|----------------|------------------|------------------|-----------------|
| API Gateway | 8080 | 8080 | **80** | 8080 |
| Identity Service | **8081** | **8081** | **8081** | **8081** |
| Project Service | **8082** | **8082** | **8082** | **8082** |
| Billing Service | **8083** | **8083** | **8083** | **8083** |
| Request Service | **8084** | **8084** | **8084** | **8084** |
| Notification Service | **8085** | **8085** | **8085** | **8085** |
| Specialist Service | **8086** | **8086** | **8086** | **8086** |

**Giải thích Port Mapping:**

#### Docker Compose:
- **Host Port**: Port để truy cập từ localhost (mỗi service KHÁC NHAU để tránh conflict)
- **Container Port**: Port mà Spring Boot app chạy bên trong container
- Format: `HOST_PORT:CONTAINER_PORT`

#### Kubernetes:
- **Service Port**: Port mà Service expose trong cluster (ĐỒNG BỘ với Container Port)
- **Target Port**: Port để forward đến Pod container (GIỐNG NHAU với Container Port)
- Format trong Service YAML:
  ```yaml
  ports:
  - port: 8082        # Service port (đồng bộ với container)
    targetPort: 8082 # Container port (phải khớp với app)
  ```

**Ví dụ:** 
- Project Service chạy trên port 8082 trong container
- Docker: Truy cập từ localhost qua port 8082
- K8s: Service expose port 8082, forward đến targetPort 8082 trong Pod

**Lưu ý:** 
- API Gateway dùng port 80 cho Service Port (HTTP standard), nhưng Container Port vẫn là 8080
- Các service khác dùng port tuần tự từ 8081 → 8088, **TẤT CẢ PORT ĐỒNG BỘ** (Container = Docker Host = K8s Service = K8s Target)

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
│   ├── identity-service-deployment.yaml
│   ├── project-service-deployment.yaml
│   ├── billing-service-deployment.yaml
│   ├── request-service-deployment.yaml
│   ├── notification-service-deployment.yaml
│   ├── specialist-service-deployment.yaml
├── services/
│   ├── api-gateway.yaml
│   ├── identity-service.yaml
│   ├── project-service.yaml
│   ├── billing-service.yaml
│   ├── request-service.yaml
│   ├── notification-service.yaml
│   ├── specialist-service.yaml
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

## 🔌 API Endpoints

### Identity Service (Merged from Auth + User)

**Authentication Endpoints:**
- `POST /auth/log-in` - User login
- `POST /auth/register` - User registration
- `POST /auth/introspect` - Validate JWT token

**User Management Endpoints:**
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/email/{email}` - Get user by email
- `POST /api/users` - Create new user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/users/{id}/profile` - Get user profile
- `PUT /api/users/{id}/profile` - Update user profile

### Other Services
- `GET /api/projects/**` - Project Service
- `GET /api/billing/**` - Billing Service
- `GET /api/requests/**` - Request Service
- `GET /api/notifications/**` - Notification Service
- `GET /api/specialists/**` - Specialist Service

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
kubectl logs -f deployment/identity-service -n mutrapro
kubectl logs -f deployment/project-service -n mutrapro

# Port forward for testing
kubectl port-forward service/api-gateway 8080:80 -n mutrapro
kubectl port-forward service/identity-service 8081:8081 -n mutrapro
kubectl port-forward service/project-service 8082:8082 -n mutrapro
kubectl port-forward service/billing-service 8083:8083 -n mutrapro
kubectl port-forward service/request-service 8084:8084 -n mutrapro
kubectl port-forward service/notification-service 8085:8085 -n mutrapro
kubectl port-forward service/specialist-service 8086:8086 -n mutrapro
```

## 🔍 Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check if images exist in registry
   docker pull your-registry.com/mutrapro/identity-service:latest
   docker pull your-registry.com/mutrapro/project-service:latest
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
     name: identity-service-hpa
   spec:
     scaleTargetRef:
       apiVersion: apps/v1
       kind: Deployment
       name: identity-service
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
