package com.mutrapro.shared.service;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE)
public class S3Service {

    final S3Client s3Client;
    final S3Presigner s3Presigner;
    final String bucketName;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner, String bucketName) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength) {
        return uploadFile(inputStream, fileName, contentType, contentLength, null, false);
    }

    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix) {
        return uploadFile(inputStream, fileName, contentType, contentLength, folderPrefix, false);
    }

    /**
     * Upload file to S3
     * @param inputStream file input stream
     * @param fileName original file name
     * @param contentType MIME type
     * @param contentLength file size
     * @param folderPrefix folder prefix (e.g., "instruments", "audio")
     * @param isPublic if true, return public URL (requires bucket policy for public access), otherwise return pre-signed URL
     * @return S3 URL (public URL if isPublic=true, otherwise pre-signed URL)
     * 
     * NOTE: For isPublic=true to work, you need to configure bucket policy to allow public read access:
     * {
     *   "Version": "2012-10-17",
     *   "Statement": [{
     *     "Effect": "Allow",
     *     "Principal": "*",
     *     "Action": "s3:GetObject",
     *     "Resource": "arn:aws:s3:::bucket-name/folder-prefix/*"
     *   }]
     * }
     */
    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix, boolean isPublic) {
        // Read input stream into byte array
        byte[] fileContent;
        try {
            fileContent = inputStream.readAllBytes();
        } catch (IOException e) {
            log.error("Error reading file content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to read file content: " + e.getMessage(), e);
        }
        
        String fileKey = generateFileKey(fileName, folderPrefix);
        
        // Upload file without ACL (rely on bucket policy for public access if needed)
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(contentType)
                    .contentLength((long) fileContent.length)
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(fileContent));
        } catch (S3Exception e) {
            log.error("Error uploading file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage(), e);
        }
        
        // Generate URL
        String fileUrl;
        if (isPublic) {
            // Return public URL (will work only if bucket policy allows public access)
            fileUrl = String.format("https://%s.s3.amazonaws.com/%s", bucketName, fileKey);
            log.info("File uploaded. Public URL returned. Ensure bucket policy allows public access for folder: {}", folderPrefix);
        } else {
            // Return pre-signed URL (valid for 7 days) for private files
            fileUrl = getPreSignedUrl(fileKey, Duration.ofDays(7));
        }
        
        log.info("File uploaded successfully to S3: {} (public: {})", fileUrl, isPublic);
        return fileUrl;
    }

    /**
     * Generate pre-signed URL for an S3 object
     * @param fileKey S3 object key
     * @param expirationDuration URL expiration duration
     * @return pre-signed URL
     */
    public String getPreSignedUrl(String fileKey, Duration expirationDuration) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(expirationDuration)
                    .getObjectRequest(getObjectRequest)
                    .build();

            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            String url = presignedRequest.url().toString();
            
            log.debug("Generated pre-signed URL for key: {} (expires in: {})", fileKey, expirationDuration);
            return url;
        } catch (S3Exception e) {
            log.error("Error generating pre-signed URL for key {}: {}", fileKey, e.getMessage(), e);
            throw new RuntimeException("Failed to generate pre-signed URL: " + e.getMessage(), e);
        }
    }

    /**
     * Extract file key from S3 URL
     * @param s3Url S3 URL (public or pre-signed)
     * @return file key or null if invalid URL
     */
    public String extractFileKeyFromUrl(String s3Url) {
        if (s3Url == null || s3Url.isEmpty()) {
            return null;
        }
        
        try {
            java.net.URI uri = new java.net.URI(s3Url);
            // URL: https://bucket.s3.amazonaws.com/folder/file.png
            // -> path = "/folder/file.png"
            String path = uri.getPath();
            
            // Remove leading slash
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            
            // Handle public URL: https://bucket.s3.amazonaws.com/key
            if (s3Url.contains(bucketName + ".s3.amazonaws.com/")) {
                return path;
            }
            
            // Handle pre-signed URL: https://bucket.s3.region.amazonaws.com/key?X-Amz-...
            // The path contains the full key
            if (path.contains("/")) {
                return path;
            }
            
            // If path is empty or just bucket name, try to extract from full URL
            if (s3Url.contains("?X-Amz")) {
                String pathPart = s3Url.substring(0, s3Url.indexOf("?X-Amz"));
                // Extract everything after bucket name
                int bucketIndex = pathPart.indexOf(bucketName);
                if (bucketIndex >= 0) {
                    String afterBucket = pathPart.substring(bucketIndex + bucketName.length());
                    if (afterBucket.startsWith("/")) {
                        afterBucket = afterBucket.substring(1);
                    }
                    if (!afterBucket.isEmpty()) {
                        return afterBucket;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error parsing S3 URL: {}", s3Url, e);
        }
        
        return null;
    }

    /**
     * Download file from S3 and return as byte array
     * @param fileKey S3 object key
     * @return file content as byte array
     */
    public byte[] downloadFile(String fileKey) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .build();

            try (InputStream inputStream = s3Client.getObject(getObjectRequest)) {
                return inputStream.readAllBytes();
            }
        } catch (S3Exception | IOException e) {
            log.error("Error downloading file from S3 with key {}: {}", fileKey, e.getMessage(), e);
            throw new RuntimeException("Failed to download file from S3: " + e.getMessage(), e);
        }
    }

    /**
     * Download file from S3 using URL (extracts key from URL)
     * @param s3Url S3 URL (public or pre-signed)
     * @return file content as byte array
     */
    public byte[] downloadFileFromUrl(String s3Url) {
        String fileKey = extractFileKeyFromUrl(s3Url);
        if (fileKey == null) {
            throw new IllegalArgumentException("Invalid S3 URL: " + s3Url);
        }
        return downloadFile(fileKey);
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

