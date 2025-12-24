package com.mutrapro.project_service.enums;

/**
 * Loại review:
 * 
 * - TASK: Review cho specialist khi họ làm task assignment và deliver file cho customer
 *   + Transcription specialist (transcription task) - ký âm và nộp file
 *   + Arrangement specialist (arrangement task) - hòa âm và nộp file
 *   + Arrangement specialist (recording_supervision task) - GIÁM SÁT buổi thu và NỘP FILE về cho customer
 *     → Đây là task assignment bình thường, arrangement specialist phải supervise và deliver file
 *     → Customer cần review về chất lượng giám sát và file được deliver
 *   + Mỗi task assignment chỉ có thể được rate 1 lần
 * 
 * - REQUEST: Review tổng thể cho request/service (không gắn với specialist cụ thể)
 *   + Customer đánh giá tổng thể về toàn bộ service experience từ request
 *   + Request là cái customer tạo ra ban đầu và quan tâm nhất
 *   + Mỗi request chỉ có thể được rate 1 lần bởi 1 customer (khi request completed)
 *   + Note: Một request có thể có nhiều contracts (nếu bị reject/revision), nhưng chỉ rate 1 lần cho request
 * 
 * - PARTICIPANT: Review cho recording artist (vocalist/instrumentalist) trong recording booking
 *   + Chỉ dành cho recording artist tham gia recording session (biểu diễn trong studio)
 *   + KHÔNG dùng cho transcription/arrangement specialist
 *   + Mỗi participant chỉ có thể được rate 1 lần bởi 1 customer
 */
public enum ReviewType {
    TASK,        // Cho transcription/arrangement specialist (bao gồm recording_supervision - giám sát và nộp file)
    REQUEST,     // Cho tổng thể request/service
    PARTICIPANT  // Cho recording artist
}


