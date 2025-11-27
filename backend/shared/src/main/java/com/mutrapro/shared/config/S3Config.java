package com.mutrapro.shared.config;

import com.mutrapro.shared.service.S3Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
@ConditionalOnProperty(name = "aws.s3.enabled", havingValue = "true", matchIfMissing = false)
public class S3Config {

    @Bean
    public S3Client s3Client(
            @Value("${aws.s3.region:ap-southeast-1}") String region,
            @Value("${aws.s3.access-key:}") String accessKey,
            @Value("${aws.s3.secret-key:}") String secretKey) {
        
        // Validate that access-key and secret-key are not empty
        if (accessKey == null || accessKey.trim().isEmpty()) {
            throw new IllegalStateException("AWS S3 access-key cannot be blank. Please configure aws.s3.access-key or set aws.s3.enabled=false to disable S3.");
        }
        if (secretKey == null || secretKey.trim().isEmpty()) {
            throw new IllegalStateException("AWS S3 secret-key cannot be blank. Please configure aws.s3.secret-key or set aws.s3.enabled=false to disable S3.");
        }
        
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @Bean
    public S3Service s3Service(S3Client s3Client, @Value("${aws.s3.bucket-name:mutrapro-dev-files}") String bucketName) {
        return new S3Service(s3Client, bucketName);
    }
}

