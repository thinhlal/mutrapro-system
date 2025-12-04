# Stage 1: Build stage
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copy shared module first
COPY shared/pom.xml ./shared/
COPY shared/src ./shared/src

# Build shared module
RUN mvn -f shared/pom.xml clean install -DskipTests

# Copy chat-service
COPY chat-service/pom.xml ./chat-service/
COPY chat-service/src ./chat-service/src

# Build chat-service
RUN mvn -f chat-service/pom.xml clean package -DskipTests

# Stage 2: Runtime stage
FROM eclipse-temurin:21.0.2_13-jre-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the jar from build stage
COPY --from=build /app/chat-service/target/*.jar app.jar

# Expose port
EXPOSE 8088

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

