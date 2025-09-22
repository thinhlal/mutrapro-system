# Dockerfile cho Shared Module (Library)
FROM maven:3.9.6-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy source code
COPY . /app/shared

# Build shared module
RUN cd shared && mvn clean install -DskipTests

# Runtime stage - chỉ để test
FROM eclipse-temurin:21-jre-alpine

# Install necessary packages
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy built JAR
COPY --from=build /app/shared/target/*.jar app.jar

# Expose port (nếu có embedded server)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# JVM options
ENV JAVA_OPTS="-Xmx256m -Xms128m -XX:+UseContainerSupport"

# Run application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
