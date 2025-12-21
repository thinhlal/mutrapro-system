package com.mutrapro.specialist_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.specialist_service.enums.SlotStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * SpecialistSlot Entity - Lưu các slot thời gian làm việc của specialist recording artist
 * Bảng: specialist_slots
 * 
 * Grid system: Mỗi slot cố định 2 tiếng
 * Các slot trong ngày: 08:00-10:00, 10:00-12:00, 12:00-14:00, 14:00-16:00, 16:00-18:00
 * 
 * Artist mở lịch bằng cách set từng slot thành AVAILABLE
 */
@Entity
@Table(name = "specialist_slots", indexes = {
    @Index(name = "idx_specialist_slots_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_specialist_slots_date", columnList = "slot_date"),
    @Index(name = "idx_specialist_slots_date_time", columnList = "specialist_id,slot_date,start_time", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistSlot extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "slot_id")
    private String slotId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialist_id", nullable = false)
    private Specialist specialist;
    
    /**
     * Ngày của slot (YYYY-MM-DD)
     */
    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;
    
    /**
     * Thời gian bắt đầu slot (HH:mm:ss)
     * Phải là một trong: 08:00, 10:00, 12:00, 14:00, 16:00
     */
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    
    /**
     * Thời gian kết thúc slot (tự động = startTime + 2h)
     * Không cần lưu trong DB, tính từ startTime
     */
    @Transient
    private LocalTime endTime;
    
    /**
     * Có phải là recurring slot không (ví dụ: mỗi thứ 2)
     * Nếu true, slot sẽ lặp lại mỗi tuần vào cùng day of week
     */
    @Column(name = "is_recurring")
    @Builder.Default
    private Boolean isRecurring = false;
    
    /**
     * Day of week (1=Monday, 7=Sunday) - chỉ dùng khi isRecurring = true
     */
    @Column(name = "day_of_week")
    private Integer dayOfWeek; // 1=Monday, 2=Tuesday, ..., 7=Sunday
    
    /**
     * Trạng thái của slot
     * - UNAVAILABLE: Slot không available (default) - Artist chưa mở slot
     * - AVAILABLE: Slot available, có thể book - Artist đã mở slot
     * - HOLD: Slot đang được giữ (chờ confirm)
     * - BOOKED: Slot đã được book
     * 
     * Mặc định: UNAVAILABLE (chưa mở)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "slot_status", nullable = false)
    @Builder.Default
    private SlotStatus slotStatus = SlotStatus.UNAVAILABLE;
    
    /**
     * Helper method: Tính endTime từ startTime (startTime + 2h)
     */
    public LocalTime getEndTime() {
        if (startTime == null) {
            return null;
        }
        return startTime.plusHours(2);
    }
}

