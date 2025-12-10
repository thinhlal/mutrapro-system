package com.mutrapro.project_service.enums;

/**
 * Task type enum - để phân biệt loại công việc của task assignment
 * 
 * QUAN TRỌNG: Milestone nào → Task nấy (không trộn)
 * - Milestone TRANSCRIPTION → Task type: TRANSCRIPTION
 * - Milestone ARRANGEMENT → Task type: ARRANGEMENT
 * - Milestone RECORDING → Task type: RECORDING_SUPERVISION (không phải ARRANGEMENT)
 */
public enum TaskType {
    transcription,           // Ký âm
    arrangement,             // Hòa âm
    recording_supervision    // Thu âm - Task cho arrangement specialist supervise buổi thu và deliver file
}

