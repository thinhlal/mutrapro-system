package com.mutrapro.project_service.enums;

public enum FileSourceType {
    customer_upload,       // File khách hàng upload
    specialist_output,     // File output từ specialist (transcription, arrangement, etc.)
    task_deliverable,      // Kết quả từ task assignment (sau khi approved)
    studio_recording,      // Raw recording từ studio
    contract_pdf           // PDF của contract
}

