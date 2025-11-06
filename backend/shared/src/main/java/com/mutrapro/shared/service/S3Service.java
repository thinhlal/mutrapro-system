package com.mutrapro.shared.service;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.InputStream;
import java.util.UUID;

@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class S3Service {

    final S3Client s3Client;
    final String bucketName;

    public S3Service(S3Client s3Client, String bucketName) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
    }

    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength) {
        return uploadFile(inputStream, fileName, contentType, contentLength, null);
    }

    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix) {
        try {
            String fileKey = generateFileKey(fileName, folderPrefix);
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(contentType)
                    .contentLength(contentLength)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(inputStream, contentLength));
            
            String fileUrl = String.format("https://%s.s3.amazonaws.com/%s", bucketName, fileKey);
            log.info("File uploaded successfully to S3: {}", fileUrl);
            
            return fileUrl;
        } catch (S3Exception e) {
            log.error("Error uploading file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage(), e);
        }
    }

    private String generateFileKey(String originalFileName, String folderPrefix) {
        // Extract file name without extension
        String fileNameWithoutExt = originalFileName;
        String extension = "";
        int lastDotIndex = originalFileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            fileNameWithoutExt = originalFileName.substring(0, lastDotIndex);
            extension = originalFileName.substring(lastDotIndex);
        }
        
        // Sanitize file name: remove special characters, replace spaces with hyphens, lowercase
        String sanitizedFileName = fileNameWithoutExt
                .toLowerCase()
                .replaceAll("[^a-z0-9\\-]", "-")  // Replace non-alphanumeric (except hyphens) with hyphens
                .replaceAll("-+", "-")  // Replace multiple consecutive hyphens with single hyphen
                .replaceAll("^-|-$", "");  // Remove leading/trailing hyphens
        
        // Limit length to avoid too long file names
        if (sanitizedFileName.length() > 50) {
            sanitizedFileName = sanitizedFileName.substring(0, 50);
        }
        
        String folder = folderPrefix != null && !folderPrefix.isEmpty() 
                ? folderPrefix.endsWith("/") ? folderPrefix : folderPrefix + "/"
                : "";
        
        UUID uuid = UUID.randomUUID();
        
        // Format: folder/sanitized-filename-uuid.extension
        return String.format("%s%s-%s%s", folder, sanitizedFileName, uuid, extension);
    }
}

