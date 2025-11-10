package com.mutrapro.chat_service.enums;

public enum MessageType {
    TEXT,           // Tin nhắn text thông thường
    IMAGE,          // Hình ảnh
    FILE,           // File đính kèm
    AUDIO,          // File audio
    VIDEO,          // File video
    SYSTEM,         // Tin nhắn hệ thống (user joined, left, etc.)
    REVISION_REQUEST, // Yêu cầu revision
    STATUS_UPDATE   // Cập nhật trạng thái request/project
}

