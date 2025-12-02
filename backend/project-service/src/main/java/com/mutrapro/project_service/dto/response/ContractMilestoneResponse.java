package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ContractMilestoneResponse {
    
    String milestoneId;
    
    String contractId;
    
    String name;
    
    String description;
    
    Integer orderIndex;
    
    MilestoneWorkStatus workStatus;
    
    Boolean hasPayment;  // Milestone này có installment tương ứng không
    
    Integer milestoneSlaDays;  // SLA ngày cho milestone này
    
    LocalDateTime plannedStartAt;  // BE tính khi contract có start date
    
    LocalDateTime plannedDueDate;  // BE tính khi contract có start date

    LocalDateTime actualStartAt;   // Thời điểm milestone thực tế bắt đầu

    LocalDateTime actualEndAt;     // Thời điểm milestone thực tế kết thúc

    LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone)

    LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
    
    LocalDateTime createdAt;
    
    LocalDateTime updatedAt;
}

