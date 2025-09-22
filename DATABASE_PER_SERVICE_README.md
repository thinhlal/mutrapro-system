# MuTraPro System - Database Per Service Pattern

## 📋 Tổng quan

Hệ thống MuTraPro đã được cấu hình để sử dụng **Database Per Service** pattern, trong đó mỗi microservice có database riêng biệt thay vì dùng chung một database.

## 🏗️ Kiến trúc Database

### Database Schema per Service

| Service | Database Name | Username | Password |
|---------|---------------|----------|----------|
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

## 🔧 Configuration

### Kubernetes Configuration

#### ConfigMap (`k8s/configmap.yaml`)
```yaml
data:
  # Database Configuration - Each service has its own database
  USER_DATASOURCE_URL: "jdbc:postgresql://postgres-service:5432/user_db"
  USER_DATASOURCE_USERNAME: "user_service_user"
  
  AUTH_DATASOURCE_URL: "jdbc:postgresql://postgres-service:5432/auth_db"
  AUTH_DATASOURCE_USERNAME: "auth_service_user"
  
  PROJECT_DATASOURCE_URL: "jdbc:postgresql://postgres-service:5432/project_db"
  PROJECT_DATASOURCE_USERNAME: "project_service_user"
  
  # ... và các service khác
```

#### Secrets (`k8s/secrets.yaml`)
```yaml
data:
  # Database passwords for each service
  USER_DATASOURCE_PASSWORD: dXNlcl9zZXJ2aWNlX3Bhc3N3b3Jk  # user_service_password
  AUTH_DATASOURCE_PASSWORD: YXV0aF9zZXJ2aWNlX3Bhc3N3b3Jk  # auth_service_password
  PROJECT_DATASOURCE_PASSWORD: cHJvamVjdF9zZXJ2aWNlX3Bhc3N3b3Jk  # project_service_password
  
  # ... và các service khác
```

### Docker Compose Configuration

Mỗi service trong `docker-compose.yml` có cấu hình database riêng:

```yaml
services:
  user-service:
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/user_db
      - SPRING_DATASOURCE_USERNAME=user_service_user
      - SPRING_DATASOURCE_PASSWORD=user_service_password
      
  auth-service:
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/auth_db
      - SPRING_DATASOURCE_USERNAME=auth_service_user
      - SPRING_DATASOURCE_PASSWORD=auth_service_password
```

## 🚀 Deployment

### 1. Database Setup

Trước khi deploy services, cần tạo các databases và users:

```sql
-- Connect to PostgreSQL as superuser
\c postgres

-- Create databases
CREATE DATABASE gateway_db;
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE project_db;
CREATE DATABASE payment_db;
CREATE DATABASE notification_db;
CREATE DATABASE file_db;
CREATE DATABASE feedback_db;
CREATE DATABASE quotation_db;
CREATE DATABASE revision_db;
CREATE DATABASE specialist_db;
CREATE DATABASE studio_db;
CREATE DATABASE task_db;

-- Create users
CREATE USER gateway_service_user WITH PASSWORD 'gateway_service_password';
CREATE USER auth_service_user WITH PASSWORD 'auth_service_password';
CREATE USER user_service_user WITH PASSWORD 'user_service_password';
CREATE USER project_service_user WITH PASSWORD 'project_service_password';
CREATE USER payment_service_user WITH PASSWORD 'payment_service_password';
CREATE USER notification_service_user WITH PASSWORD 'notification_service_password';
CREATE USER file_service_user WITH PASSWORD 'file_service_password';
CREATE USER feedback_service_user WITH PASSWORD 'feedback_service_password';
CREATE USER quotation_service_user WITH PASSWORD 'quotation_service_password';
CREATE USER revision_service_user WITH PASSWORD 'revision_service_password';
CREATE USER specialist_service_user WITH PASSWORD 'specialist_service_password';
CREATE USER studio_service_user WITH PASSWORD 'studio_service_password';
CREATE USER task_service_user WITH PASSWORD 'task_service_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE gateway_db TO gateway_service_user;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_service_user;
GRANT ALL PRIVILEGES ON DATABASE user_db TO user_service_user;
GRANT ALL PRIVILEGES ON DATABASE project_db TO project_service_user;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_service_user;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_service_user;
GRANT ALL PRIVILEGES ON DATABASE file_db TO file_service_user;
GRANT ALL PRIVILEGES ON DATABASE feedback_db TO feedback_service_user;
GRANT ALL PRIVILEGES ON DATABASE quotation_db TO quotation_service_user;
GRANT ALL PRIVILEGES ON DATABASE revision_db TO revision_service_user;
GRANT ALL PRIVILEGES ON DATABASE specialist_db TO specialist_service_user;
GRANT ALL PRIVILEGES ON DATABASE studio_db TO studio_service_user;
GRANT ALL PRIVILEGES ON DATABASE task_db TO task_service_user;
```

### 2. Deploy với Docker Compose

```bash
# Build và start tất cả services
docker-compose up --build

# Hoặc start từng service riêng
docker-compose up user-service auth-service project-service
```

### 3. Deploy lên Kubernetes

```bash
# Deploy tất cả services
./scripts/deploy-to-k8s.sh development

# Hoặc deploy từng phần
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
```

## 📊 Lợi ích của Database Per Service

### 1. **Data Isolation**
- Mỗi service có database riêng, tránh xung đột dữ liệu
- Schema changes của một service không ảnh hưởng đến service khác
- Data privacy và security tốt hơn

### 2. **Independent Scaling**
- Có thể scale database của từng service riêng biệt
- Optimize performance cho từng service cụ thể
- Resource allocation linh hoạt

### 3. **Technology Flexibility**
- Mỗi service có thể chọn database technology phù hợp
- Ví dụ: User service dùng PostgreSQL, Notification service dùng MongoDB
- Polyglot persistence

### 4. **Team Independence**
- Mỗi team có thể làm việc độc lập với database của service họ
- Không cần coordination với các team khác khi thay đổi schema
- Faster development cycles

### 5. **Fault Isolation**
- Nếu một database bị lỗi, chỉ ảnh hưởng đến service đó
- Các service khác vẫn hoạt động bình thường
- Better system resilience

## ⚠️ Challenges và Solutions

### 1. **Data Consistency Across Services**

**Challenge**: Dữ liệu cần đồng bộ giữa các services

**Solutions**:
- **Event-Driven Architecture**: Sử dụng events để sync data
- **Saga Pattern**: Distributed transactions
- **Event Sourcing**: Store events thay vì state
- **CQRS**: Command Query Responsibility Segregation

### 2. **Distributed Transactions**

**Challenge**: Không thể dùng ACID transactions across services

**Solutions**:
- **Two-Phase Commit (2PC)**: Distributed transaction protocol
- **Saga Pattern**: Choreography hoặc Orchestration
- **Eventual Consistency**: Accept temporary inconsistency

### 3. **Data Duplication**

**Challenge**: Có thể có duplicate data giữa các services

**Solutions**:
- **Single Source of Truth**: Mỗi service owns data của nó
- **Data Synchronization**: Sync through events
- **Read Models**: Tạo read models cho cross-service queries

### 4. **Complex Queries Across Services**

**Challenge**: Khó thực hiện queries cần data từ nhiều services

**Solutions**:
- **API Composition**: Aggregate data through APIs
- **CQRS with Read Models**: Pre-computed views
- **Event Sourcing**: Rebuild state from events
- **Data Warehouse**: Centralized reporting database

## 🔍 Monitoring và Troubleshooting

### Database Health Checks

```bash
# Check database connectivity
kubectl exec -it <pod-name> -n mutrapro -- nc -zv postgres-service 5432

# Check database access
kubectl exec -it <pod-name> -n mutrapro -- psql -h postgres-service -U user_service_user -d user_db -c "SELECT 1;"
```

### Log Analysis

```bash
# Check service logs
kubectl logs -f deployment/user-service -n mutrapro

# Check database connection logs
kubectl logs -f deployment/user-service -n mutrapro | grep -i "database\|connection\|sql"
```

### Performance Monitoring

```bash
# Check database performance
kubectl exec -it <pod-name> -n mutrapro -- psql -h postgres-service -U user_service_user -d user_db -c "
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
"
```

## 📝 Best Practices

### 1. **Database Design**
- Mỗi service chỉ access database của nó
- Không có direct database access giữa services
- Use APIs cho inter-service communication

### 2. **Data Synchronization**
- Sử dụng events cho data synchronization
- Implement idempotent event handlers
- Use correlation IDs cho event tracking

### 3. **Security**
- Mỗi service có credentials riêng
- Implement database-level security
- Use network policies để isolate database access

### 4. **Backup và Recovery**
- Backup từng database riêng biệt
- Implement point-in-time recovery
- Test recovery procedures regularly

### 5. **Monitoring**
- Monitor database performance per service
- Set up alerts cho database issues
- Track cross-service data consistency

## 🔐 Security Considerations

### 1. **Database Access Control**
```sql
-- Revoke unnecessary privileges
REVOKE ALL ON DATABASE other_service_db FROM current_user;

-- Grant only necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_user;
```

### 2. **Network Security**
```yaml
# Network policies to restrict database access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-access
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: user-service
    ports:
    - protocol: TCP
      port: 5432
```

### 3. **Secret Management**
- Sử dụng Kubernetes Secrets
- Rotate passwords regularly
- Use external secret management systems

## 📞 Support

Để được hỗ trợ về Database Per Service pattern:
- Documentation: [Link to docs]
- Issues: [Link to GitHub issues]
- Email: support@mutrapro.com
