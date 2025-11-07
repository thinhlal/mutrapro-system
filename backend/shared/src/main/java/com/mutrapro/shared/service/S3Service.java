package com.mutrapro.shared.service;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

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
     * @param isPublic if true, set ACL to public-read (requires bucket to allow public ACLs or bucket policy)
     * @return S3 URL (public URL if isPublic=true, otherwise pre-signed URL)
     * 
     * IMPORTANT: For isPublic=true to work, you need to configure your S3 bucket:
     * 1. Option A: Disable "Block public access" settings for ACLs (less secure)
     * 2. Option B: Use Bucket Policy instead of ACLs (recommended):
     *    {
     *      "Version": "2012-10-17",
     *      "Statement": [{
     *        "Effect": "Allow",
     *        "Principal": "*",
     *        "Action": "s3:GetObject",
     *        "Resource": "arn:aws:s3:::bucket-name/folder-prefix/*"
     *      }]
     *    }
     * 
     * If bucket blocks public ACLs and no policy exists, upload will fail.
     */
    public String uploadFile(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix, boolean isPublic) {
        try {
            String fileKey = generateFileKey(fileName, folderPrefix);
            
            PutObjectRequest.Builder putObjectRequestBuilder = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(contentType)
                    .contentLength(contentLength);
            
            // Set ACL to public-read if requested
            // NOTE: This requires bucket to allow public ACLs OR bucket policy to allow public access
            if (isPublic) {
                try {
                    putObjectRequestBuilder.acl(ObjectCannedACL.PUBLIC_READ);
                } catch (Exception e) {
                    log.warn("Failed to set public-read ACL (bucket may block public ACLs). " +
                            "Ensure bucket policy allows public access for folder: {}. Error: {}", 
                            folderPrefix, e.getMessage());
                    // Continue without ACL - will rely on bucket policy if configured
                }
            }

            s3Client.putObject(putObjectRequestBuilder.build(), RequestBody.fromInputStream(inputStream, contentLength));
            
            String fileUrl;
            if (isPublic) {
                // Return public URL
                // NOTE: This URL will only work if:
                // 1. ACL public-read was successfully set, OR
                // 2. Bucket policy allows public read access
                fileUrl = String.format("https://%s.s3.amazonaws.com/%s", bucketName, fileKey);
                log.info("File uploaded as public. URL will be accessible only if bucket allows public access via ACL or policy.");
            } else {
                // Return pre-signed URL (valid for 7 days) for private files
                fileUrl = getPreSignedUrl(fileKey, Duration.ofDays(7));
            }
            
            log.info("File uploaded successfully to S3: {} (public: {})", fileUrl, isPublic);
            return fileUrl;
        } catch (S3Exception e) {
            String errorMessage = e.getMessage();
            if (isPublic && (errorMessage.contains("AccessControlListNotSupported") || 
                           errorMessage.contains("AccessDenied") ||
                           errorMessage.contains("InvalidRequest"))) {
                log.error("Failed to upload public file. Bucket may block public ACLs. " +
                         "Please configure bucket policy to allow public read access for folder: {}. " +
                         "Error: {}", folderPrefix, errorMessage);
                throw new RuntimeException(
                    "Failed to upload public file. Please configure S3 bucket policy to allow public access. " +
                    "See documentation for bucket policy configuration.", e);
            }
            log.error("Error uploading file to S3: {}", errorMessage, e);
            throw new RuntimeException("Failed to upload file to S3: " + errorMessage, e);
        }
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
        
        // Handle public URL: https://bucket.s3.amazonaws.com/key
        if (s3Url.contains(bucketName + ".s3.amazonaws.com/")) {
            return s3Url.substring(s3Url.indexOf(bucketName + ".s3.amazonaws.com/") + bucketName.length() + 20);
        }
        
        // Handle pre-signed URL: extract key from query parameters
        // Pre-signed URLs have the key in the path, before query parameters
        if (s3Url.contains("?X-Amz")) {
            String pathPart = s3Url.substring(0, s3Url.indexOf("?X-Amz"));
            int lastSlash = pathPart.lastIndexOf("/");
            if (lastSlash >= 0 && lastSlash < pathPart.length() - 1) {
                return pathPart.substring(lastSlash + 1);
            }
        }
        
        return null;
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

