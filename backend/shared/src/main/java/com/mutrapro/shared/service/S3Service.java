package com.mutrapro.shared.service;

import lombok.AccessLevel;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
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

    /**
     * Upload file to S3 and return only the file key (not URL)
     * Use this method when you want to store only the key in database for security
     * @param inputStream file input stream
     * @param fileName original file name
     * @param contentType MIME type
     * @param contentLength file size
     * @param folderPrefix folder prefix (e.g., "instruments", "audio")
     * @return S3 object key (e.g., "task-outputs/123/file-uuid.pdf")
     */
    public String uploadFileAndReturnKey(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix) {
        // Read input stream into byte array
        byte[] fileContent;
        try {
            fileContent = inputStream.readAllBytes();
        } catch (IOException e) {
            log.error("Error reading file content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to read file content: " + e.getMessage(), e);
        }
        
        String fileKey = generateFileKey(fileName, folderPrefix);
        
        // Upload file without ACL (private by default)
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
        
        log.info("File uploaded successfully to S3 with key: {}", fileKey);
        return fileKey;
    }

    /**
     * Upload file to S3 in public folder and return public URL
     * Use this method for public files like instrument images, avatars, etc.
     * Files are stored in "public/" folder which should have public read access via bucket policy.
     * @param inputStream file input stream
     * @param fileName original file name
     * @param contentType MIME type
     * @param contentLength file size
     * @param folderPrefix folder prefix (e.g., "instruments", "avatars") - will be prefixed with "public/"
     * @return public S3 URL (e.g., "https://bucket.s3.amazonaws.com/public/instruments/file-uuid.png")
     */
    public String uploadPublicFileAndReturnUrl(InputStream inputStream, String fileName, String contentType, long contentLength, String folderPrefix) {
        // Read input stream into byte array
        byte[] fileContent;
        try {
            fileContent = inputStream.readAllBytes();
        } catch (IOException e) {
            log.error("Error reading file content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to read file content: " + e.getMessage(), e);
        }
        
        // Prepend "public/" to folder prefix
        String publicFolderPrefix;
        if (folderPrefix != null && !folderPrefix.isEmpty()) {
            publicFolderPrefix = folderPrefix.startsWith("public/") ? folderPrefix : "public/" + folderPrefix;
        } else {
            publicFolderPrefix = "public";
        }
        String fileKey = generateFileKey(fileName, publicFolderPrefix);
        
        // Upload file (bucket policy should allow public read for public/ folder)
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
        
        // Generate public URL
        String publicUrl = String.format("https://%s.s3.amazonaws.com/%s", bucketName, fileKey);
        
        log.info("File uploaded successfully to S3 public folder: {}", publicUrl);
        return publicUrl;
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

