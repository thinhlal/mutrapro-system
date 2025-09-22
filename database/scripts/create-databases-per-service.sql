-- MuTraPro System - Create Databases and Users for Database Per Service Pattern
-- Run this script as PostgreSQL superuser (postgres)

-- =====================================================
-- CREATE DATABASES
-- =====================================================

-- Create databases for each service
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

-- =====================================================
-- CREATE USERS
-- =====================================================

-- Create users for each service
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

-- =====================================================
-- GRANT PRIVILEGES
-- =====================================================

-- Grant all privileges on respective databases
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

-- =====================================================
-- CONNECT TO EACH DATABASE AND GRANT SCHEMA PRIVILEGES
-- =====================================================

-- Gateway Database
\c gateway_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO gateway_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gateway_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gateway_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO gateway_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO gateway_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO gateway_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO gateway_service_user;

-- Auth Database
\c auth_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO auth_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO auth_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO auth_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO auth_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO auth_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO auth_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO auth_service_user;

-- User Database
\c user_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO user_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO user_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO user_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO user_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO user_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO user_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO user_service_user;

-- Project Database
\c project_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO project_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO project_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO project_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO project_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO project_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO project_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO project_service_user;

-- Payment Database
\c payment_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO payment_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO payment_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO payment_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO payment_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO payment_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO payment_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO payment_service_user;

-- Notification Database
\c notification_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO notification_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO notification_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO notification_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO notification_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO notification_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO notification_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO notification_service_user;

-- File Database
\c file_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO file_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO file_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO file_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO file_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO file_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO file_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO file_service_user;

-- Feedback Database
\c feedback_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO feedback_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feedback_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO feedback_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO feedback_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO feedback_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO feedback_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO feedback_service_user;

-- Quotation Database
\c quotation_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO quotation_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO quotation_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO quotation_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO quotation_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO quotation_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO quotation_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO quotation_service_user;

-- Revision Database
\c revision_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO revision_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO revision_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO revision_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO revision_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO revision_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO revision_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO revision_service_user;

-- Specialist Database
\c specialist_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO specialist_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO specialist_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO specialist_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO specialist_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO specialist_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO specialist_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO specialist_service_user;

-- Studio Database
\c studio_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO studio_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO studio_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO studio_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO studio_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO studio_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO studio_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO studio_service_user;

-- Task Database
\c task_db;
GRANT ALL PRIVILEGES ON SCHEMA public TO task_service_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO task_service_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO task_service_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO task_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO task_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO task_service_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO task_service_user;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Return to postgres database for verification
\c postgres;

-- List all databases
SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;

-- List all users
SELECT usename FROM pg_user WHERE usename NOT LIKE 'postgres' AND usename NOT LIKE 'rds%' ORDER BY usename;

-- Show database ownership
SELECT 
    d.datname as database_name,
    u.usename as owner
FROM pg_database d
JOIN pg_user u ON d.datdba = u.usesysid
WHERE d.datistemplate = false
ORDER BY d.datname;

-- =====================================================
-- NOTES
-- =====================================================

/*
This script creates:

1. 13 separate databases for each microservice
2. 13 dedicated users with unique passwords
3. Proper privileges for each user on their respective database
4. Schema-level permissions for future table creation

Security Notes:
- Each service user only has access to their own database
- Passwords should be changed in production
- Consider using external secret management systems
- Implement network policies for additional security

Usage:
1. Connect to PostgreSQL as superuser (postgres)
2. Run this script: psql -f create-databases-per-service.sql
3. Verify creation with the verification queries above

For Docker:
docker exec -it <postgres-container> psql -U postgres -f /path/to/create-databases-per-service.sql

For Kubernetes:
kubectl exec -it <postgres-pod> -n mutrapro -- psql -U postgres -f /path/to/create-databases-per-service.sql
*/
